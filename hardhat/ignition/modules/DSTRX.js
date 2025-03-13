const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { HDNodeWallet, Mnemonic } = require('ethers');

function getDefaultLocalWallets() {
    const defaultSeed = process.env.SEED ? process.env.SEED : "recall ready story unable gesture load devote narrow polar hire damage host";
    const wallets = [];
    const mnemonic = Mnemonic.fromPhrase(defaultSeed);

    for (let i = 0; i < 10; i++) {
        wallets.push(HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${i}`));
    }

    return wallets;
}

const DSTRXModule = buildModule("DSTRXModule", (m, hre) => {
    var wallets = getDefaultLocalWallets()

    const dstrxContract = m.contract("DSTRX", [wallets[1].address, wallets[0].address, wallets[0].address]);

    return { dstrxContract };
});

module.exports = DSTRXModule;