// Scenario: Typosquatting/Malicious Package Substitution
// This simulates a developer accidentally installing a malicious package named 'lodashs'
import lodashs from 'lodashs';

export function processData(input) {
  // The 'lodashs' package (fake) would exfiltrate data on import
  return lodashs.map(input, (i) => i * 2);
}
