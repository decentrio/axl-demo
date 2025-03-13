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
const { getContractInstance, getDefaultLocalWallets } = require('./helper.js');
const { chainConfigs } = require("../network.config.js");

async function main() {
    const args = process.argv.slice(2);
    const chainName = args[0];
    const chainConfig = readConfig(chainName)
    await registerTokenMetadata(chainConfig, chainConfig.tokens[0])
}

async function registerTokenMetadata(chain, tokenAddress) {
    var wallets = getDefaultLocalWallets()
    var provider = ethers.getDefaultProvider(chainConfigs[chain.name].url);
    
    const interchainTokenServiceContract = await getContractInstance(
        chain.InterchainTokenService,
        InterchainTokenServiceContract.abi,
        wallets[0],
    );
}

async function registerCustomToken(chain, tokenAddress) {

}

async function linkToken(chain, tokenAddress) {

}

async function transferMintership(chain, tokenAddress) {

}

function readConfig(chainName) {
    const configDir = path.join(__dirname, "../config");
    const configFile = path.join(configDir, `${chainName}.json`);

    if (fs.existsSync(configFile)) {
        return JSON.parse(fs.readFileSync(configFile, "utf8"));
    }
    return {}
}

main()