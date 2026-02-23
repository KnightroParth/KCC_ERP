require('module-alias/register');
const mongoose = require('mongoose');
const { globSync } = require('glob');
const path = require('path');
const fs = require('fs');

// Make sure we are running node 7.6+
const [major, minor] = process.versions.node.split('.').map(parseFloat);
if (major < 20) {
  console.log('Please upgrade your node.js version at least 20 or greater. 👌\n ');
  process.exit();
}

// Load .env from backend directory so it works regardless of cwd
const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
const envLocalPath = path.join(backendDir, '.env.local');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });
if (fs.existsSync(envLocalPath)) require('dotenv').config({ path: envLocalPath });

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;
if (!DATABASE) {
  console.error('❌ DATABASE (or MONGODB_URI) is not set. Add it to backend/.env');
  process.exit(1);
}

const mongooseOptions = {
  serverSelectionTimeoutMS: 20000,
  connectTimeoutMS: 20000,
  // Use primary so transactions work (MongoDB: "Read preference in a transaction must be primary").
  // Inventory stock transactions and site transfers use sessions; secondaryPreferred breaks them.
  readPreference: 'primary',
};

function connectMongo() {
  return mongoose.connect(DATABASE, mongooseOptions);
}

// Retry connection a few times (one Atlas replica node often fails DNS from some networks)
const maxRetries = 3;
let retries = 0;

function tryConnect() {
  connectMongo()
    .then(() => {
      console.log('✅ MongoDB connected');
      const app = require('./app');
      app.set('port', process.env.PORT || 8888);
      const server = app.listen(app.get('port'), () => {
        console.log(`Express running → PORT : ${server.address().port}`);
      });
    })
    .catch((err) => {
      retries += 1;
      const isServerSelection = err.name === 'MongooseServerSelectionError';
      const isENOTFOUND = err.message && err.message.includes('ENOTFOUND');

      if (isServerSelection && isENOTFOUND && retries < maxRetries) {
        console.warn(
          `⚠️ One Atlas node unreachable (DNS). Retry ${retries}/${maxRetries} in 3s...`
        );
        setTimeout(tryConnect, 3000);
        return;
      }

      console.error('🔥 MongoDB connection failed.');
      const isESERVFAIL = err.message && err.message.includes('ESERVFAIL');
      if (isESERVFAIL) {
        console.error('   DNS could not resolve MongoDB Atlas (ESERVFAIL). Try:');
        console.error('   1) Check internet connection');
        console.error('   2) Use Google DNS: 8.8.8.8 and 8.8.4.4 in your network settings');
        console.error('   3) In Atlas: Dashboard → your cluster → Connect → get a new connection string');
        console.error('   4) If on VPN/corporate network, try disconnecting or use a different network');
      } else if (isENOTFOUND) {
        console.error(
          '   One replica node failed DNS (ENOTFOUND). Try: 1) Different network/Wi‑Fi  2) DNS 8.8.8.8  3) Atlas → Get new connection string'
        );
      } else {
        console.error('   Check backend/.env (DATABASE) and Atlas network whitelist.');
      }
      console.error('   Error:', err.message);
      process.exit(1);
    });
}

tryConnect();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

mongoose.connection.on('error', (error) => {
  console.error('🔥 MongoDB connection error:', error.message);
});

const modelsFiles = globSync('./src/models/**/*.js');

for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}
