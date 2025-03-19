const { ethers } = require("ethers");
const info = require("../testnet.json");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
require('dotenv').config()
const DSTRXToken = require("../hardhat/artifacts/contracts/DSTRXToken.sol/DSTRXToken.json")
const args = process.argv;
const userArgs = args.slice(2);

async function main() {
    const network1 = info.chains[userArgs[0]]
    const network2 = info.chains[userArgs[1]]
    await registerCustomTokens(network1, network2)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function registerCustomTokens(network1, network2) {
    const salt = process.env.SALT
    console.log("salt", salt)
    const itsContract1 = getContract(network1, network1.contracts.InterchainTokenService.address, getContractJSON('InterchainTokenService').abi)
    const itfContract1 = getContract(network1, network1.contracts.InterchainTokenFactory.address, getContractJSON('InterchainTokenFactory').abi)
    const itsContract2 = getContract(network2, network2.contracts.InterchainTokenService.address, getContractJSON('InterchainTokenService').abi)
    const itfContract2 = getContract(network2, network2.contracts.InterchainTokenFactory.address, getContractJSON('InterchainTokenFactory').abi)
    const tokenId1 = await itfContract1.linkedTokenId(
        process.env.PUBLIC_KEY, // sender
        salt, // salt, same as previously used
    );
    const tokenId2 = await itfContract2.linkedTokenId(
        process.env.PUBLIC_KEY, // sender
        salt, // salt, same as previously used
    );
    const tokenContract = getContract(network1, userArgs[2], DSTRXToken.abi);

    // Approve the gateway to use tokens on the source chain (Ganache)
    await tokenContract
        .approve(itsContract1.address, 1000000, { gasLimit: 5000000 });
    await sleep(2000)

    await itsContract1.interchainTransfer(
        tokenId1,
        network2.axelarId, // destination chain
        "0x11818ED622bA462945e83F641E793F0e5Df4c06e",
        100000,
        ethers.utils.toUtf8Bytes(''),
        ethers.utils.parseEther("0.005"), // gas value
        { value: ethers.utils.parseEther("0.006"), gasLimit: 5000000 },
    );
    sleep(2000)
    console.log("xxxxxx2")
}

function getContractPath(contractName, projectRoot = '') {
    if (projectRoot === '') {
        projectRoot = path.join(findProjectRoot(__dirname), 'node_modules', '@axelar-network');
    }

    projectRoot = path.resolve(projectRoot);

    const searchDirs = [
        path.join(projectRoot, 'axelar-gmp-sdk-solidity', 'artifacts', 'contracts'),
        path.join(projectRoot, 'axelar-cgp-solidity', 'artifacts', 'contracts'),
        path.join(projectRoot, 'interchain-token-service', 'artifacts', 'contracts'),
    ];

    for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
            const contractPath = findContractPath(dir, contractName);

            if (contractPath) {
                return contractPath;
            }
        }
    }

    throw new Error(`Contract path for ${contractName} must be entered manually.`);
}

function getContractJSON(contractName) {
    let contractPath = getContractPath(contractName)

    try {
        const contractJson = require(contractPath);
        return contractJson;
    } catch (err) {
        throw new Error(`Failed to load contract JSON for ${contractName} at path ${contractPath} with error: ${err}`);
    }
}

function findProjectRoot(startDir) {
    let currentDir = startDir;

    while (currentDir !== path.parse(currentDir).root) {
        const potentialPackageJson = path.join(currentDir, 'package.json');

        if (fs.existsSync(potentialPackageJson)) {
            return currentDir;
        }

        currentDir = path.resolve(currentDir, '..');
    }

    throw new Error('Unable to find project root');
}

function findContractPath(dir, contractName) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            const recursivePath = findContractPath(filePath, contractName);

            if (recursivePath) {
                return recursivePath;
            }
        } else if (file === `${contractName}.json`) {
            return filePath;
        }
    }
}

function getContract(network, address, abi) {
    console.log(network.rpc, address)
    const provider = new ethers.providers.JsonRpcProvider(network.rpc);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    return new ethers.Contract(address, abi, wallet);
}

main()