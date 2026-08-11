const fs = require('fs');
const path = require('path');

// Custom parser for .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '../../../../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('No .env.local file found at:', envPath);
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    process.env[key] = val;
  });
}

loadEnv();

async function testWhatsApp() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const to = '918179238137';

  console.log('Phone ID:', phoneNumberId);
  console.log('Token starts with:', accessToken?.substring(0, 15));

  if (!phoneNumberId || !accessToken) {
    console.error('Missing configuration');
    return;
  }

  const textUrl = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;

  // 1. Try sending free-form text
  console.log('\n--- 1. Testing Free-form Text Message ---');
  try {
    const res = await fetch(textUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: 'Test text message from Pala Pitta Ruchulu' },
      }),
    });
    const data = await res.json();
    console.log('Text Response Status:', res.status);
    console.log('Text Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Text error:', err);
  }

  // 2. Try sending template message (hello_world)
  console.log('\n--- 2. Testing Template Message (hello_world) ---');
  try {
    const res = await fetch(textUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: 'hello_world',
          language: { code: 'en_US' }
        }
      }),
    });
    const data = await res.json();
    console.log('Template Response Status:', res.status);
    console.log('Template Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Template error:', err);
  }
}

testWhatsApp();
