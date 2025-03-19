const { ethers } = require("ethers");
const info = require("../testnet.json");
const path = require("path");
const fs = require("fs");
require('dotenv').config()
const { keccak256, toUtf8Bytes } = require('ethers/lib/utils');

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
    const salt = process.env.SALT;
    console.log("salt", salt)

    // const tokenId1 = await itfContract1.linkedTokenId(
    //     process.env.PUBLIC_KEY, // sender
    //     salt, // salt, same as previously used
    // );
    // const tokenManagerAddress1 = await itsContract1.tokenManagerAddress(tokenId1);
    // console.log("tokenManagerAddress", tokenManagerAddress1)
    // const tokenId2 = await itfContract2.linkedTokenId(
    //     process.env.PUBLIC_KEY, // sender
    //     salt, // salt, same as previously used
    // );
    // const tokenManagerAddress2 = await itsContract2.tokenManagerAddress(tokenId2);
    // console.log("tokenManagerAddress", tokenManagerAddress2)
    const tokenContract1 = getContract(network1, userArgs[2], DSTRXToken.abi);
    const tokenContract2 = getContract(network2, userArgs[3], DSTRXToken.abi);

    // await tokenContract1
    //     .grantRole(keccak256(toUtf8Bytes("MINTER_ROLE")), tokenManagerAddress1, { gasLimit: 5000000 });
    // console.log("xxxxxx8")
    // await sleep(2000)
    // await tokenContract2
    //     .grantRole(keccak256(toUtf8Bytes("MINTER_ROLE")), tokenManagerAddress2, { gasLimit: 5000000 });
    // await sleep(2000)
    // console.log("xxxxxx9")
    
    let hasRole1 = await tokenContract1
        .hasRole(keccak256(toUtf8Bytes("0x00")), process.env.PUBLIC_KEY);
    console.log("xxxxxx8", hasRole1)
    let hasRole2 = await tokenContract2
        .hasRole(keccak256(toUtf8Bytes("0x00")), process.env.PUBLIC_KEY);
    console.log("xxxxxx8", hasRole2)
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
    const provider = new ethers.providers.JsonRpcProvider(network.rpc);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    return new ethers.Contract(address, abi, wallet);
}

main()