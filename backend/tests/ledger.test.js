import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/utils/db.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Account from '../src/models/Account.js';
import JournalEntry from '../src/models/JournalEntry.js';
import Invoice from '../src/models/Invoice.js';

let token = '';
let userId = '';
let accounts = {};

beforeAll(async () => {
  await connectDB();
}, 20000); // 20s timeout for starting Memory ReplicaSet

afterAll(async () => {
  await disconnectDB();
});

describe('Smart Accounting System Tests', () => {
  
  // Clean database before each test
  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  test('User Registration seeds Chart of Accounts automatically', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testaccountant',
        email: 'test@ledger.io',
        password: 'securepassword123'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('testaccountant');

    // Retrieve seeded accounts
    const seededAccounts = await Account.find({ user: res.body.user.id });
    expect(seededAccounts.length).toBeGreaterThanOrEqual(10);
    
    // Check specific accounts exist
    const cashAcc = seededAccounts.find(a => a.code === '1010');
    expect(cashAcc).toBeDefined();
    expect(cashAcc.name).toBe('Cash & Bank');
    expect(cashAcc.type).toBe('Asset');
  });

  describe('Ledger Validation & Double-Entry API', () => {
    beforeEach(async () => {
      // Create user and seed accounts
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'audituser',
          email: 'audit@ledger.io',
          password: 'password123'
        });
      token = reg.body.token;
      userId = reg.body.user.id;

      // Populate account map
      const accList = await Account.find({ user: userId });
      accList.forEach(acc => {
        accounts[acc.code] = acc._id;
      });
    });

    test('Blocking unbalanced manual journal entry', async () => {
      const res = await request(app)
        .post('/api/ledger')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Unbalanced adjustment',
          journalLines: [
            { account: accounts['1010'], debit: 5000, credit: 0 }, // $50.00
            { account: accounts['4000'], debit: 0, credit: 4500 }  // $45.00 (Unbalanced by $5.00)
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Ledger Balance Error');
    });

    test('Allowing balanced manual journal entry', async () => {
      const res = await request(app)
        .post('/api/ledger')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Balanced adjustment',
          journalLines: [
            { account: accounts['1010'], debit: 10000, credit: 0 }, // DR Cash $100.00
            { account: accounts['4000'], debit: 0, credit: 10000 }  // CR Sales $100.00
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.journalLines.length).toBe(2);

      // Verify that journal entries are immutable
      const entryId = res.body._id;
      const entryObj = await JournalEntry.findById(entryId);
      
      // Attempting to modify should throw a validation/immutability error
      await expect(async () => {
        entryObj.description = 'Hacked description';
        await entryObj.save();
      }).rejects.toThrow('Immutability Error');
    });
  });

  describe('Invoice Lifecycle and Ledger Posting', () => {
    beforeEach(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'invoiceuser',
          email: 'invoice@ledger.io',
          password: 'password123'
        });
      token = reg.body.token;
      userId = reg.body.user.id;

      const accList = await Account.find({ user: userId });
      accList.forEach(acc => {
        accounts[acc.code] = acc._id;
      });
    });

    test('Creating a Draft invoice does not post journal lines', async () => {
      const invRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          invoiceNumber: 'INV-1001',
          clientName: 'Acme Corp',
          clientEmail: 'billing@acme.com',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          items: [
            { description: 'Consulting services', quantity: 5, unitPrice: 20000 } // $200.00 each -> $1000.00 total
          ]
        });

      expect(invRes.status).toBe(201);
      expect(invRes.body.status).toBe('Draft');
      expect(invRes.body.totalAmount).toBe(100000); // 100000 cents ($1000)

      // Count journal entries
      const journalCount = await JournalEntry.countDocuments({ user: userId });
      expect(journalCount).toBe(0);
    });

    test('Finalizing invoice (Send) posts Sales Journal Entry (DR Accounts Receivable, CR Sales Revenue)', async () => {
      // 1. Create draft
      const invRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          invoiceNumber: 'INV-1002',
          clientName: 'Globex Corp',
          clientEmail: 'billing@globex.com',
          dueDate: new Date(),
          items: [{ description: 'Cloud Audit', quantity: 1, unitPrice: 150000 }] // $1500.00
        });

      const invId = invRes.body._id;

      // 2. Send (Finalize)
      const sendRes = await request(app)
        .post(`/api/invoices/${invId}/send`)
        .set('Authorization', `Bearer ${token}`);

      expect(sendRes.status).toBe(200);
      expect(sendRes.body.status).toBe('Sent');
      expect(sendRes.body.salesJournalEntry).toBeDefined();

      // Check ledger
      const postedJournal = await JournalEntry.findById(sendRes.body.salesJournalEntry);
      expect(postedJournal).toBeDefined();
      expect(postedJournal.description).toContain('Sales Invoice Issued: INV-1002');
      
      const lines = postedJournal.journalLines;
      const arLine = lines.find(l => l.account.toString() === accounts['1200'].toString());
      const revLine = lines.find(l => l.account.toString() === accounts['4000'].toString());

      expect(arLine.debit).toBe(150000);
      expect(arLine.credit).toBe(0);
      expect(revLine.debit).toBe(0);
      expect(revLine.credit).toBe(150000);
    });

    test('Paying invoice posts Payment Entry (DR Cash, CR Accounts Receivable)', async () => {
      // 1. Create draft
      const invRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          invoiceNumber: 'INV-1003',
          clientName: 'Oscorp',
          clientEmail: 'norman@oscorp.com',
          dueDate: new Date(),
          items: [{ description: 'Tech Licensing', quantity: 10, unitPrice: 100000 }] // $10,000.00
        });

      const invId = invRes.body._id;

      // 2. Pay directly (will trigger sale entry and payment entry)
      const payRes = await request(app)
        .post(`/api/invoices/${invId}/pay`)
        .set('Authorization', `Bearer ${token}`);

      expect(payRes.status).toBe(200);
      expect(payRes.body.status).toBe('Paid');
      expect(payRes.body.salesJournalEntry).toBeDefined();
      expect(payRes.body.paymentJournalEntry).toBeDefined();

      // Verify cash debit
      const paymentJournal = await JournalEntry.findById(payRes.body.paymentJournalEntry);
      const cashLine = paymentJournal.journalLines.find(l => l.account.toString() === accounts['1010'].toString());
      const arLine = paymentJournal.journalLines.find(l => l.account.toString() === accounts['1200'].toString());

      expect(cashLine.debit).toBe(1000000); // DR Cash $10,000.00
      expect(arLine.credit).toBe(1000000); // CR Accounts Receivable $10,000.00
    });
  });
});
