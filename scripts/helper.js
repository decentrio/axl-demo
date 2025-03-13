const { ethers, Wallet } = require('ethers');

function getDefaultLocalWallets() {
    const defaultSeed = process.env.SEED ? process.env.SEED : "recall ready story unable gesture load devote narrow polar hire damage host";
    const wallets = [];

    for (let i = 0; i < 10; i++) {
        wallets.push(Wallet.fromMnemonic(defaultSeed, `m/44'/60'/0'/0/${i}`));
    }

    return wallets;
}

async function getContractInstance(contractAddress, contractABI, signer) {
    return new ethers.Contract(contractAddress, contractABI, signer);
}

module.exports = {
    getDefaultLocalWallets,
    getContractInstance
}