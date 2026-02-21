const mysql = require('mysql2/promise');
const { Resend } = require('resend');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Debug: print keys loaded
console.log('Loaded keys:', Object.keys(process.env).filter(k => !k.startsWith('npm_')));

async function main() {
  console.log('--- Checking Database ---');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
    });
    console.log('✅ Database connected successfully.');

    const [rows] = await connection.execute("SHOW TABLES LIKE 'password_reset_codes'");
    if (rows.length > 0) {
      console.log('✅ Table password_reset_codes exists.');
    } else {
      console.error('❌ Table password_reset_codes DOES NOT exist.');
      // Attempt to create it? Better to just report.
    }
    await connection.end();
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }

  console.log('\n--- Checking Resend Email ---');
  if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is missing in .env');
      return;
  }
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  console.log('Using API Key starts with:', process.env.RESEND_API_KEY.substring(0, 5) + '...');

  try {
    // Send to the admin email defined in .env, or a hardcoded one if missing
    // Since we used onboarding@resend.dev, we MUST send to the resend account email.
    // We'll try sending to the ADMIN_EMAIL from .env as a best guess for the verified email.
    // Also try the email from the screenshot to see if it's allowed.
    const toEmail = '24h71a12c6@gmail.com'; 
    console.log(`Attempting to send test email to: ${toEmail} using onboarding@resend.dev`);

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: toEmail,
      subject: 'Test Email from Debug Tool',
      html: '<p>If you see this, Resend is working!</p>'
    });

    if (error) {
      console.error('❌ Resend failed:', error);
    } else {
      console.log('✅ Resend success! Email ID:', data.id);
    }
  } catch (error) {
    console.error('❌ Resend exception:', error);
  }
}

main();
