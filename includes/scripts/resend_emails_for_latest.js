const db = require('../config/firebaseClient');
const { sendAdminEmail, sendConfirmationEmail } = require('../services/emailService');

(async function(){
  try {
    const snap = await db.collection('next_form').orderBy('created_at','desc').limit(1).get();
    if (snap.empty) {
      console.log('No next_form documents found');
      process.exit(0);
    }

    const doc = snap.docs[0];
    const data = doc.data();

    console.log('Latest next_form id=', doc.id);
    console.log('Calling sendAdminEmail...');
    const adminOk = await sendAdminEmail(data, `Resend: New Registration ${data.fullName || data.email}`);
    console.log('sendAdminEmail returned:', adminOk);

    console.log('Calling sendConfirmationEmail to user:', data.email);
    const userOk = await sendConfirmationEmail(data.email, data.fullName || '', 'Thank you for submitting your details. This is a confirmation resend.');
    console.log('sendConfirmationEmail returned:', userOk);

    process.exit(0);
  } catch (err) {
    console.error('Error in resend script:', err?.response || err?.message || err);
    process.exit(1);
  }
})();
