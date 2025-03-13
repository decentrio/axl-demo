const { Network, deployContract } = require('@axelar-network/axelar-local-dev');
const { ethers, Wallet, ContractFactory } = require('ethers');
const { chainConfigs } = require("../network.config.js");
const { keccak256, defaultAbiCoder } = require('ethers/lib/utils');
const {
    TokenManagerDeployer,
    InterchainTokenDeployer,
    InterchainToken,
    TokenManager,
    TokenHandler,
    InterchainTokenService: InterchainTokenServiceContract,
    InterchainTokenFactory: InterchainTokenFactoryContract,
    InterchainProxy,
} = require('@axelar-network/axelar-local-dev/dist/contracts');
const path = require("path")
const fs = require("fs")
const {
    InterchainTokenService__factory: InterchainTokenServiceFactory,
    InterchainTokenFactory__factory: InterchainTokenFactoryFactory,
} = require('@axelar-network/axelar-local-dev/dist/types/factories/@axelar-network/interchain-token-service/contracts');
async function main() {
    const args = process.argv.slice(2);
    const chainName = args[0];
    const chainInfo = await deployITS(chainConfigs[chainName].url, { name: chainName })
    saveDeployment(chainName, chainInfo)
}

async function deployITS(rpcUrl, options = {}) {
    const chain = new Network();

    chain.name = options.name;
    chain.provider = ethers.getDefaultProvider(rpcUrl);
    chain.chainId = (await chain.provider.getNetwork()).chainId;

    const defaultWalelts = getDefaultLocalWallets();

    console.log(`Setting up ${chain.name} on a network with a chainId of ${chain.chainId}...`);
    if (options.userKeys == null) options.userKeys = options.userKeys || defaultWalelts.slice(5, 10);
    if (options.relayerKey == null) options.relayerKey = options.ownerKey || defaultWalelts[2];
    if (options.operatorKey == null) options.operatorKey = options.ownerKey || defaultWalelts[3];
    if (options.adminKeys == null) options.adminKeys = options.ownerKey ? [options.ownerKey] : [defaultWalelts[4]];

    options.ownerKey = options.ownerKey || defaultWalelts[0];
    chain.options = options;
    chain.userWallets = options.userKeys.map((x) => new Wallet(x, chain.provider));
    chain.ownerWallet = new Wallet(options.ownerKey, chain.provider);
    chain.operatorWallet = new Wallet(options.operatorKey, chain.provider);
    chain.relayerWallet = new Wallet(options.relayerKey, chain.provider);

    chain.adminWallets = options.adminKeys.map((x) => new Wallet(x, chain.provider));
    chain.threshold = options.threshold != null ? options.threshold : 1;
    chain.lastRelayedBlock = await chain.provider.getBlockNumber();
    chain.lastExpressedBlock = chain.lastRelayedBlock;
    await chain.deployConstAddressDeployer();
    await chain.deployCreate3Deployer();
    await chain.deployGateway();
    await chain.deployGasReceiver();
    const newChain = await deployInterchainTokenService(chain);
    const chainInfo = await newChain.getInfo()
    return chainInfo;
}

async function deployInterchainTokenService(chain) {
    console.log(`Deploying the InterchainTokenService for ${chain.name}... `);
    const deploymentSalt = keccak256(defaultAbiCoder.encode(['string'], ['interchain-token-service-salt']));
    const factorySalt = keccak256(defaultAbiCoder.encode(['string'], ['interchain-token-factory-salt']));
    const wallet = chain.ownerWallet;
    const interchainTokenServiceAddress = await chain.create3Deployer.deployedAddress('0x', wallet.address, deploymentSalt);
    const tokenManagerDeployer = await deployContract(wallet, TokenManagerDeployer);
    await sleep(2000)
    const intercahinToken = await deployContract(wallet, InterchainToken, [interchainTokenServiceAddress]);
    await sleep(2000)
    const interchainTokenDeployer = await deployContract(wallet, InterchainTokenDeployer, [intercahinToken.address]);
    await sleep(2000)
    const tokenManager = await deployContract(wallet, TokenManager, [interchainTokenServiceAddress]);
    await sleep(2000)
    const tokenHandler = await deployContract(wallet, TokenHandler, []);
    await sleep(2000)
    const interchainTokenFactoryAddress = await chain.create3Deployer.deployedAddress('0x', wallet.address, factorySalt);

    const tokenServiceImplementation = await deployContract(wallet, InterchainTokenServiceContract, [
        tokenManagerDeployer.address,
        interchainTokenDeployer.address,
        chain.gateway.address,
        chain.gasService.address,
        interchainTokenFactoryAddress,
        chain.name,
        tokenManager.address,
        tokenHandler.address,
    ]);
    await sleep(2000)
    const factory = new ContractFactory(InterchainProxy.abi, InterchainProxy.bytecode);
    let bytecode = factory.getDeployTransaction(
        tokenServiceImplementation.address,
        wallet.address,
        defaultAbiCoder.encode(['address', 'string', 'string[]', 'string[]'], [wallet.address, chain.name, [], []])
    ).data;
    await chain.create3Deployer.connect(wallet).deploy(bytecode, deploymentSalt);
    chain.interchainTokenService = InterchainTokenServiceFactory.connect(interchainTokenServiceAddress, wallet);

    const tokenFactoryImplementation = await deployContract(wallet, InterchainTokenFactoryContract, [interchainTokenServiceAddress]);
    await sleep(2000)

    bytecode = factory.getDeployTransaction(tokenFactoryImplementation.address, wallet.address, '0x').data;

    await chain.create3Deployer.connect(wallet).deploy(bytecode, factorySalt);
    chain.interchainTokenFactory = InterchainTokenFactoryFactory.connect(interchainTokenFactoryAddress, wallet);

    console.log(`Deployed at ${chain.interchainTokenService.address}.`);
    return chain;
}

function getDefaultLocalWallets() {
    const defaultSeed = process.env.SEED ? process.env.SEED : "recall ready story unable gesture load devote narrow polar hire damage host";
    const wallets = [];

    for (let i = 0; i < 10; i++) {
        wallets.push(Wallet.fromMnemonic(defaultSeed, `m/44'/60'/0'/0/${i}`));
    }

    return wallets;
}

function saveDeployment(networkName, info) {
    const configDir = path.join(__dirname, "../config");
    const configFile = path.join(configDir, `${networkName}.json`);

    let config = info;
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    if (fs.existsSync(configFile)) {
        let oldConfig = JSON.parse(fs.readFileSync(configFile, "utf8"));
        config.tokens = oldConfig.tokens
    }

    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main()