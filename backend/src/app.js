import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Routes
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import ledgerRoutes from './routes/ledger.js';
import invoiceRoutes from './routes/invoices.js';
import expenseRoutes from './routes/expenses.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import apiKeyRoutes from './routes/apiKeys.js';
import aiAutomationRoutes from './routes/aiAutomation.js';
import reminderRoutes from './routes/reminders.js';
import externalApiRoutes from './routes/externalApi.js';
import inventoryRoutes from './routes/inventory.js';
import bankReconcileRoutes from './routes/bankReconciliation.js';
import gstReportRoutes from './routes/gstReports.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes registration
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/ai', aiAutomationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/v1/external', externalApiRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/bank-reconciliation', bankReconcileRoutes);
app.use('/api/reports/gst', gstReportRoutes);

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

// Serve static frontend assets
app.use(express.static(frontendDist));

// Base health route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// SPA fallback for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Global 404 Route for API requests
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
