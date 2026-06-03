const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// If the env var isn't set but a local `includes/service-account.json` exists,
// use it as a fallback. This makes local development simpler while keeping
// production deployments using the explicit `GOOGLE_APPLICATION_CREDENTIALS`.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const candidate = path.join(__dirname, '..', 'service-account.json');
  if (fs.existsSync(candidate)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = candidate;
  }
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable must be set to the service account JSON path');
}

// initializeApp will use the default credentials from the environment
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
});

// choose Firestore (preferred) or realtime database depending on your use-case
const db = admin.firestore();

module.exports = db;
