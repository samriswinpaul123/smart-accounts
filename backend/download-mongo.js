import { MongoBinary } from 'mongodb-memory-server';

async function preDownload() {
  console.log('Initiating MongoDB 5.0.22 binary pre-download...');
  try {
    const path = await MongoBinary.getPath({
      version: '5.0.22'
    });
    console.log('=========================================');
    console.log('SUCCESS: MongoDB binary is cached!       ');
    console.log(`Path: ${path}                            `);
    console.log('=========================================');
    process.exit(0);
  } catch (err) {
    console.error('MongoDB download failed:', err);
    process.exit(1);
  }
}

preDownload();
