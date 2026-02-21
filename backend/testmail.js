const nodemailer = require('nodemailer');
require('dotenv').config(); // Local ga .env file nundi values ravadaniki idi chala mukhyam

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER, 
  subject: 'Secure Test Mail',
  text: 'Ippudu ee code GitHub ki push chesina mee password safe ga untundi!'
};

console.log('Attempting to send mail...');
console.log('Using Email:', process.env.EMAIL_USER);

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log('❌ Error:', error);
  }
  console.log('✅ Success! Mail Sent: ' + info.response);
});