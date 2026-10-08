import JournalEntry from '../models/JournalEntry.js';

/**
 * Validates a double-entry ledger transaction.
 * @param {Array} lines - The lines of the journal entry.
 * @throws {Error} if validation fails.
 */
export function validateDoubleEntry(lines) {
  if (!lines || lines.length < 2) {
    throw new Error('A journal entry must contain at least 2 lines (double-entry rules require debit/credit counterparts).');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line.account) {
      throw new Error(`Validation Error: Line ${i + 1} must specify a valid account ID.`);
    }

    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (!Number.isInteger(debit) || !Number.isInteger(credit)) {
      throw new Error(`Validation Error: Line ${i + 1} amounts must be integers representing cents.`);
    }

    if (debit < 0 || credit < 0) {
      throw new Error(`Validation Error: Line ${i + 1} amounts must be non-negative.`);
    }

    if (debit > 0 && credit > 0) {
      throw new Error(`Validation Error: Line ${i + 1} cannot contain both a debit and a credit.`);
    }

    if (debit === 0 && credit === 0) {
      throw new Error(`Validation Error: Line ${i + 1} must have a non-zero debit or credit.`);
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  if (totalDebit !== totalCredit) {
    throw new Error(`Ledger Balance Error: Unbalanced journal entry. Total Debits: ${totalDebit} cents. Total Credits: ${totalCredit} cents. Net Discrepancy: ${totalDebit - totalCredit} cents.`);
  }

  return true;
}

/**
 * Saves a validated JournalEntry inside a Mongoose transaction session.
 */
export async function postJournalEntry(session, { user, description, reference, date, lines }) {
  validateDoubleEntry(lines);
  const entry = new JournalEntry({
    user,
    description,
    reference,
    date: date || new Date(),
    journalLines: lines.map(line => ({
      account: line.account,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0)
    }))
  });
  
  await entry.save({ session });
  return entry;
}
