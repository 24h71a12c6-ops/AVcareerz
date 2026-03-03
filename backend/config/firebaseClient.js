const admin = require('firebase-admin');
const path = require('path');

// load service account key from GOOGLE_APPLICATION_CREDENTIALS environment variable or explicit path
// if you want to embed the JSON, you can require it directly here.

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
