const { Network, relay, EvmRelayer } = require('@axelar-network/axelar-local-dev');
const { ethers, Wallet } = require('ethers');
const { outputJsonSync } = require('fs-extra');
const seed = "recall ready story unable gesture load devote narrow polar hire damage host"

const defaultEvmRelayer = new EvmRelayer();
let relaying = false;

async function main() {
    // await setupNetwork("Ganache", "http://127.0.0.1:7545")
    const chains = [
        { name: "Ganache", rpcUrl: "http://127.0.0.1:7545" },
        // { name: "Realio", rpcUrl: "http://127.0.0.1:8545" }
    ]
    await setupAndExport(chains)
}

async function setupAndExport(chains) {
    const networkInfos = [];
    const networks = [];
    for (let i = 0; i < chains.length; i++) {
        const network = await setupNetwork(chains[i].name, chains[i].rpcUrl);
        networks.push(network);
        const networkInfo = network.getInfo();
        networkInfo.rpc = chains[i].rpcUrl;
        networkInfos.push(networkInfo);

        if (Object.keys(network.tokens).length > 0) {
            // Check if there is a USDC token.
            const alias = Object.keys(network.tokens).find((alias) => alias.toLowerCase().includes('usdc'));

            // If there is no USDC token, return.
            if (!alias) return;
        }
    }
    await registerRemoteITS(networks);
    const _options = {
        chainOutputPath: 'local1.json',
        afterRelay: null,
        relayers: { evm: defaultEvmRelayer },
        callback: null,
        relayInterval: 2000,
    };

    interval = setInterval(async () => {
        if (relaying) return;
        relaying = true;
        await relay(_options.relayers).catch(() => undefined);
    }, _options.relayInterval);

    const evmRelayer = _options.relayers['evm'];
    evmRelayer?.subscribeExpressCall();
    deployTokens(networks)
    setJSON(networkInfos, _options.chainOutputPath);
    return networks;
}

async function deployTokens(networks) {
    const ganache = networks[0]

    await ganache.deployToken("UST", "aUST", 6, BigInt(100_000e6));
    const userWallet = getDefaultLocalWallets()[0]

    await ganache.giveToken(userWallet.address, "aUST", BigInt(100e6));
}

async function setupNetwork(name, urlOrProvider) {
    const chain = new Network();
    chain.name = name
    chain.provider = ethers.getDefaultProvider(urlOrProvider)
    chain.chainId = (await chain.provider.getNetwork()).chainId;

    const defaultWalelts = getDefaultLocalWallets();

    console.log(`Setting up ${chain.name} on a network with a chainId of ${chain.chainId}...`);
    var userWallet = new Wallet(defaultWalelts[0], chain.provider)
    chain.userWallets = [userWallet];
    chain.ownerWallet = userWallet;
    chain.operatorWallet = userWallet;
    chain.relayerWallet = userWallet;
    chain.adminWallets = [userWallet];
    chain.threshold = 4
    chain.lastRelayedBlock = await chain.provider.getBlockNumber();
    chain.lastExpressedBlock = chain.lastRelayedBlock;
    await chain.deployConstAddressDeployer();
    await chain.deployCreate3Deployer();
    await chain.deployGateway();
    await chain.deployGasReceiver();
    await chain.deployInterchainTokenService();
    chain.tokens = {};
    return chain;
}

function getDefaultLocalWallets() {
    const defaultSeed = seed;

    const wallets = [];

    for (let i = 0; i < 10; i++) {
        wallets.push(Wallet.fromMnemonic(defaultSeed, `m/44'/60'/0'/0/${i}`));
    }

    return wallets;
}

function setJSON(data, name){
    outputJsonSync(name, data, {
        spaces: 2,
        EOL: '\n',
    });
};

async function registerRemoteITS(networks) {
    for (const network of networks) {
        console.log(`Registerring ITS for ${networks.length} other chain for ${network.name}...`);
        const data = [];
        for (const otherNetwork of networks) {
            data.push(
                (
                    await network.interchainTokenService.populateTransaction.setTrustedAddress(
                        otherNetwork.name,
                        otherNetwork.interchainTokenService.address
                    )
                ).data
            );
        }
        await(await network.interchainTokenService.multicall(data)).wait();
    }
}


main()