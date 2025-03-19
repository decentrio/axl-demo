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

    const dstrxContract = m.contract("DSTRXToken", ["0x157290044D8aF086cFfba03699A67d70E999CaFF"]);

    return { dstrxContract };
});

module.exports = DSTRXModule;