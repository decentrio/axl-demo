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

function main(){
    const args = process.argv.slice(2);
    const chainName = args[0];

    
}

function registerTokenMetadata(chain, tokenAddress) {

}

function registerCustomToken(chain, tokenAddress) {

}

function linkToken(chain, tokenAddress) {

}

function transferMintership(chain, tokenAddress) {
    
}