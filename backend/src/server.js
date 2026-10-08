import app from './app.js';
import { connectDB } from './utils/db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Establish database connection (or spin up MongoMemoryReplicaSet)
    await connectDB();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=========================================`);
      console.log(` Smart Ledger accounting server running  `);
      console.log(` Port: ${PORT}                          `);
      console.log(` Environment: ${process.env.NODE_ENV}   `);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error('Failed to initialize server application:', err);
    process.exit(1);
  }
}

startServer();
