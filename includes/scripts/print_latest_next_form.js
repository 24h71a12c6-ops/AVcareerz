const db = require('../config/firebaseClient');

(async function() {
  try {
    const snap = await db.collection('next_form')
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (snap.empty) {
      console.log('No next_form documents found');
      process.exit(0);
    }

    snap.forEach(doc => {
      const data = doc.data();
      // Avoid printing large binary blobs if present
      if (data.uploaded_files) {
        // only print metadata
        data.uploaded_files = data.uploaded_files;
      }
      console.log(JSON.stringify({ id: doc.id, ...data }, null, 2));
    });
    process.exit(0);
  } catch (err) {
    console.error('Error reading next_form:', err);
    process.exit(1);
  }
})();
