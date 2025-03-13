const { Network, relay, EvmRelayer, networks, deployContract } = require('@axelar-network/axelar-local-dev');
const { ethers, Wallet } = require('ethers');
const { outputJsonSync } = require('fs-extra');
const crypto = require("crypto");
const fs = require("fs");
const seed = "include forward empty route clown nature era decorate settle market defy certain"

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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupAndExport(chains) {
    const networkInfos = [];
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
    await sleep(5000)
    await registerRemoteITS(networks);
    const _options = {
        chainOutputPath: 'local1.json',
        afterRelay: null,
        relayers: { evm: defaultEvmRelayer },
        callback: null,
        relayInterval: 2000,
    };

    // interval = setInterval(async () => {
    //     if (relaying) return;
    //     relaying = true;
    //     await relay(_options.relayers).catch(() => undefined);
    // }, _options.relayInterval);

    // const evmRelayer = _options.relayers['evm'];
    // evmRelayer?.subscribeExpressCall();
    // await deployTokens(networks)
    await deployCustomTokens(networks)
    networks[0].deployCon
    setJSON(networkInfos, _options.chainOutputPath);
    // await sendTokens(networks)
    return networks;
}

async function deployTokens(networks) {
    const ganache = networks[0]

    await ganache.deployToken("UST", "aUSDX", 6, BigInt(100_000e6));
    const userWallet = getDefaultLocalWallets()[0]
    sleep(2000)
    await ganache.giveToken(userWallet.address, "aUSDX", BigInt(100e6));
    sleep(2000)


    const realio = networks[1]
    await realio.deployToken("UST", "aUSDX", 6, BigInt(100_000e6));
    const realioWallet = getDefaultLocalWallets()[1]
    sleep(5000)
    await realio.giveToken(realioWallet.address, "aUSDX", BigInt(100e6));
    sleep(2000)
}

async function deployCustomTokens(networks) {
    contractJson = JSON.parse(fs.readFileSync("contracts/DSTRXToken.json", "utf8"));
    const salt = "0x" + crypto.randomBytes(32).toString("hex");

    // deloy token on Ganache
    const ganache = networks[0]
    const userWallet = ganache.ownerWallet
    ganacheToken = await deployContract(userWallet, contractJson, [userWallet.address])
    // await ganache.giveToken(userWallet.address, "DSTRX", BigInt(100e6));
    console.log("Deploy token on Ganache at", ganacheToken.address)
    sleep(2000)

    // register token metadata on Ganache
    console.log("interchainTokenService", ganache.interchainTokenService)
    await ganache.interchainTokenService.registerTokenMetadata(
        ganacheToken.address,
        ethers.utils.parseEther("0.0001"), // gas value
        { value: ethers.utils.parseEther("0.001") },
    );
    sleep(2000)

    // deploy token on Realio
    const realio = networks[1]
    const realioWallet = realio.ownerWallet
    realioToken = await deployContract(realioWallet, contractJson, [realioWallet.address])
    // await ganache.giveToken(userWallet.address, "DSTRX", BigInt(100e6));
    console.log("Deploy token on Realio at", realio.address)
    sleep(2000)

    // register token metadata on Realio
    await ganache.interchainTokenService.registerTokenMetadata(
        realioToken.address,
        ethers.utils.parseEther("0.0001"), // gas value
        { value: ethers.utils.parseEther("0.001") },
      );
    sleep(2000)
    
    // register token with Interchain Token Factory on Ganache
    await ganache.interchainTokenFactory.registerCustomToken(
        salt, // salt
        ganacheToken.address, // token address
        4, // token management type
        userWallet.address, //  the address of the operator
        { value: ethers.utils.parseEther("0.001") },
      );
      sleep(2000)

    // Link registered token on Realio
    await ganache.interchainTokenFactory.linkToken(
        salt, // salt, same as previously used
        "Realio", // destination chain
        realioToken.address, // destination token address
        4, // token manager type
        userWallet.address, //  the address of the operator - linkParams
        ethers.utils.parseEther("0.001"), // gas value
        { value: ethers.utils.parseEther("0.001") },
    );
    sleep(2000)

    // Assign the minter role to TokenManager on Ganache
    tokenId = await ganache.interchainTokenFactory.linkedTokenId(
        userWallet.address, // sender
        salt, // salt, same as previously used
    );
    const ganacheTokenManagerAddress = await ganache.interchainTokenService.tokenManagerAddress(tokenId);
    console.log("ganache tokenManagerAddress", ganacheTokenManagerAddress)

    const realioTokenManagerAddress = await realio.interchainTokenService.tokenManagerAddress(tokenId);
    console.log("realio tokenManagerAddress", realioTokenManagerAddress)

}

async function sendTokens(networks) {
    const ganache = networks[0]
    const realio = networks[1]

    const [ganacheUserWallet] = ganache.userWallets;
    const [realioUserWallet] = realio.userWallets;

    // Get the token contracts for both Ethereum and Avalanche networks
    const usdcGanacheContract = await ganache.getTokenContract("aUSDX");
    const usdcRealioContract = await realio.getTokenContract("aUSDX");

    console.log(
        (await usdcGanacheContract.balanceOf(ganacheUserWallet.address)) / 1e6,
        "aUSDX in Ganache wallet before send"
    );

    // Approve the gateway to use tokens on the source chain (Ganache)
    const ganacheApproveTx = await usdcGanacheContract
        .connect(ganacheUserWallet)
        .approve(ganache.gateway.address, 100e6);
    await ganacheApproveTx.wait();

    // Request the Ethereum gateway to send tokens to the Realio network
    const ganacheGatewayTx = await ganache.gateway
        .connect(ganacheUserWallet)
        .sendToken(realio.name, realioUserWallet.address, "aUSDX", 100e6);
    await ganacheGatewayTx.wait();

    // Log the token balances
    console.log(
        (await usdcGanacheContract.balanceOf(ganacheUserWallet.address)) / 1e6,
        "aUSDX in Ganache wallet before relay"
    );
    console.log(
        (await usdcRealioContract.balanceOf(realioUserWallet.address)) / 1e6,
        "aUSDX in Realio wallet before relay"
    );

    // Relay the transactions
    await relay();
    await sleep(10000)

    // Log the token balances
    console.log(
        (await usdcGanacheContract.balanceOf(ganacheUserWallet.address)) / 1e6,
        "aUSDX in Ganache wallet"
    );
    console.log(
        (await usdcRealioContract.balanceOf(realioUserWallet.address)) / 1e6,
        "aUSDX in Realio wallet"
    );
}

async function setupNetwork(name, urlOrProvider) {
    const chain = new Network();
    chain.name = name
    chain.provider = ethers.getDefaultProvider(urlOrProvider)
    chain.chainId = (await chain.provider.getNetwork()).chainId;

    const defaultWalelts = getDefaultLocalWallets();

    console.log(`Setting up ${chain.name} on a network with a chainId of ${chain.chainId}...`);
    var userWallet = new Wallet(defaultWalelts[0], chain.provider)
    if(chain.name == "Realio") {
        userWallet = new Wallet(defaultWalelts[1], chain.provider)
    } 
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
    await sleep(5000)
    nonce = await chain.provider.getTransactionCount(userWallet.address, "pending")
    console.log("nonce", nonce)
    await chain.deployGasReceiver();
    await sleep(5000)
    nonce = await chain.provider.getTransactionCount(userWallet.address, "pending")
    console.log("nonce", nonce)
    await chain.deployInterchainTokenService();
    chain.tokens = {};
    return chain;
}

function getDefaultLocalWallets() {
    const defaultSeed = seed;

    const wallets = [];

    for (let i = 0; i < 1; i++) {
        wallets.push(Wallet.fromMnemonic(defaultSeed, `m/44'/60'/0'/0/${i}`));
    }

    wallets.push(new Wallet("0xCA8920CA65CD664FBCC7A1E3E68E5EEE0CCCD395C61D85E3E8059D0943A4876F"))

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