const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../backend/.env');
console.log('Target:', envPath);

const content = `# Server Configuration
PORT=10000
FRONTEND_URL=https://abroad-vision-carrerz-frontend.onrender.com
ALLOW_NULL_ORIGIN=0

# Database (TiDB Cloud)
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=2GjG4j65eKpQiZ2.root
DB_PASSWORD=k63HssmmI6CkOpOc
DB_NAME=test
DB_SSL=true

# WhatsApp Cloud API (Meta)
WHATSAPP_PHONE_NUMBER_ID=931920886675591
WHATSAPP_ACCESS_TOKEN=EAALZC5Gj0ZCl0BQgCBZBITvPRnpovOmNeq9nvweqHLdjbwqJ65HYtwD6pgK6bNDHOoU4O53q1dvuReTJhKZCearYubZADepamAW4pJUNijPSnB975Ch0Y5g0uJRZBhIrgaKaL9Jc9SXrEwNetWavZCezEeN82tfmPanQmyNCyiWRzF7TppFrMfo8Nt5eAgwFZBd4SgZDZD
ADMIN_WHATSAPPS=918639169633

# Email Configuration (Gmail)
EMAIL_USER=abroadvisioncarrerz@gmail.com
EMAIL_PASSWORD=hxwn tmvq uzir tvlf
ADMIN_EMAIL=buddymic28@gmail.com
RESEND_API_KEY=re_dFsFnWcg_2KHggjV8v5c1emhWSzLwYcfQ
# Security
RESET_PASSWORD_PEPPER=random_pepper_string_here
`;

try {
    if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath); // Delete first
    }
    fs.writeFileSync(envPath, content, { encoding: 'utf8' });
    console.log('✅ File rewritten with UTF-8 encoding.');
    
    // Check
    const checkBuffer = fs.readFileSync(envPath);
    console.log('New Hex Header:', checkBuffer.subarray(0, 20).toString('hex'));
} catch (err) {
    console.error('❌ Failed:', err);
}
