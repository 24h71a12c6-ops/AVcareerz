// Path ni direct ga mention cheyandi
require('dotenv').config(); 

const nodemailer = require('nodemailer');

// Deenivalla variables load ayyayo ledo check cheyocchu
console.log('User:', process.env.EMAIL_USER);
console.log('Pass:', process.env.EMAIL_PASS ? 'Found' : 'Missing');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});