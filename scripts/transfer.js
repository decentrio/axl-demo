const { Network, relay, EvmRelayer } = require('@axelar-network/axelar-local-dev');

const { ethers, Wallet, Contract } = require('ethers');
const { outputJsonSync } = require('fs-extra');
const seed = "recall ready story unable gesture load devote narrow polar hire damage host"
const chainsData = require("../local.json");
const { AxelarGasReceiver, AxelarGateway, ConstAddressDeployer, Create3Deployer,
    InterchainTokenService, InterchainTokenFactory
 } = require('@axelar-network/axelar-local-dev/dist/contracts');
const defaultEvmRelayer = new EvmRelayer();
let relaying = false;

async function main() {
    // await setupNetwork("Ganache", "http://127.0.0.1:7545")
    const chains = [
        { name: "Ganache", rpcUrl: "http://127.0.0.1:7545" },
        { name: "Realio", rpcUrl: "http://127.0.0.1:8545" }
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
    // await registerRemoteITS(networks);
    const _options = {
        chainOutputPath: 'local.json',
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
    await sendTokens(networks)
    return networks;
}

async function sendTokens(networks) {
    const ganache = networks[0]
    const realio = networks[1]

    // await ganache.deployToken("USDC", "aUSDC", 6, BigInt(100_000e6));
    // await realio.deployToken("USDC", "aUSDC", 6, BigInt(100_000e6));
    // const userWallet = getDefaultLocalWallets()[0]
    // const ruserWallet = getDefaultLocalWallets()[0]

    const gncTokenAddr = await ganache.gateway.tokenAddresses("aUSDC");
    const realioTokenAddr = await realio.gateway.tokenAddresses("aUSDC");
    console.log(gncTokenAddr, realioTokenAddr)
    // await ganache.giveToken(userWallet.address, "aUSDC", BigInt(100e6));
    // const usdcGncContract = await ganache.getTokenContract("aUSDC");
    // const usdcRealioContract = await realio.getTokenContract("aUSDC");

    // const gncApproveTx = await usdcGncContract
    //     .connect(userWallet)
    //     .approve(ganache.gateway.address, 100e6);
    // await gncApproveTx.wait();

    // const gncGatewayTx = await ganache.gateway
    //     .connect(userWallet)
    //     .sendToken(realio.name, ruserWallet.address, "aUSDC", 100e6);
    // await gncGatewayTx.wait();
    // console.log(
    //     (await usdcGncContract.balanceOf(userWallet.address)) / 1e6,
    //     "aUSDC in Ganache wallet"
    // );
    // console.log(
    //     (await usdcRealioContract.balanceOf(ruserWallet.address)) / 1e6,
    //     "aUSDC in Realio wallet"
    // );
}

async function setupNetwork(name, urlOrProvider) {
    const chainImp = chainsData[name]
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

    chain.constAddressDeployer = new Contract(chainImp.constAddressDeployerAddress, ConstAddressDeployer.abi, userWallet);
    chain.create3Deployer = new Contract(chainImp.create3DeployerAddress, Create3Deployer.abi, userWallet);
    chain.gateway = new Contract(chainImp.gatewayAddress, AxelarGateway.abi, userWallet);
    chain.gasService = new Contract(chainImp.gasReceiverAddress, AxelarGasReceiver.abi, userWallet)
    chain.interchainTokenFactory = new Contract(chainImp.InterchainTokenFactory, InterchainTokenFactory.abi, userWallet)
    chain.interchainTokenService = new Contract(chainImp.InterchainTokenService, InterchainTokenService.abi, userWallet)

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