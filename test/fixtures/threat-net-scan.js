// Scenario: Port Scanning Internal Network
import net from 'net';

function scanInternal(host) {
  for (let port = 1; port < 1024; port++) {
    const s = new net.Socket();
    s.connect(port, host, () => {
      console.log(`Port ${port} open on ${host}`);
      s.destroy();
    });
    s.on('error', () => {});
  }
}

scanInternal('192.168.1.1');
