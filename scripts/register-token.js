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
    const itsContract1 = getContract(network1, network1.contracts.InterchainTokenService.address, getContractJSON('InterchainTokenService').abi)
    const itfContract1 = getContract(network1, network1.contracts.InterchainTokenFactory.address, getContractJSON('InterchainTokenFactory').abi)
    const itsContract2 = getContract(network2, network2.contracts.InterchainTokenService.address, getContractJSON('InterchainTokenService').abi)
    const itfContract2 = getContract(network2, network2.contracts.InterchainTokenFactory.address, getContractJSON('InterchainTokenFactory').abi)
    console.log("xxxxxx1")
    await itsContract1.registerTokenMetadata(
        userArgs[2],
        ethers.utils.parseEther("0.0001"), // gas value
        { value: ethers.utils.parseEther("0.001"), gasLimit: 5000000 },
    );
    await sleep(2000)
    console.log("xxxxxx2")
    await itsContract2.registerTokenMetadata(
        userArgs[3],
        ethers.utils.parseEther("0.0001"), // gas value
        { value: ethers.utils.parseEther("0.001"), gasLimit: 5000000 },
    );
    await sleep(2000)
    console.log("xxxxxx3")
    await itfContract1.registerCustomToken(
        salt,
        userArgs[2],
        4,
        process.env.PUBLIC_KEY,
        { value: ethers.utils.parseEther("0.001") },
    );
    await sleep(2000)
    console.log("xxxxxx4")
    await itfContract2.registerCustomToken(
        salt,
        userArgs[3],
        4,
        process.env.PUBLIC_KEY,
        { value: ethers.utils.parseEther("0.001") },
    );
    await sleep(7000)
    console.log("xxxxxx5")
    await itfContract1.linkToken(
        salt, // salt, same as previously used
        network2.axelarId, // destination chain
        userArgs[3], // destination token address
        4, // token manager type
        process.env.PUBLIC_KEY, //  the address of the operator - linkParams
        ethers.utils.parseEther("0.001"), // gas value
        { value: ethers.utils.parseEther("0.001") },
    );
    await sleep(2000)
    console.log("xxxxxx6")
    await itfContract2.linkToken(
        salt, // salt, same as previously used
        network1.axelarId, // destination chain
        userArgs[2], // destination token address
        4, // token manager type
        process.env.PUBLIC_KEY, //  the address of the operator - linkParams
        ethers.utils.parseEther("0.001"), // gas value
        { value: ethers.utils.parseEther("0.001") },
    );
    await sleep(2000)
    console.log("xxxxxx7")
    const tokenId1 = await itfContract1.linkedTokenId(
        process.env.PUBLIC_KEY, // sender
        salt, // salt, same as previously used
    );
    const tokenManagerAddress1 = await itsContract1.tokenManagerAddress(tokenId1);
    console.log("tokenManagerAddress", tokenManagerAddress1)
    const tokenId2 = await itfContract2.linkedTokenId(
        process.env.PUBLIC_KEY, // sender
        salt, // salt, same as previously used
    );
    const tokenManagerAddress2 = await itsContract2.tokenManagerAddress(tokenId2);
    console.log("tokenManagerAddress", tokenManagerAddress2)
    const tokenContract1 = getContract(network1, userArgs[2], DSTRXToken.abi);
    const tokenContract2 = getContract(network2, userArgs[3], DSTRXToken.abi);

    await tokenContract1
        .grantRole(keccak256(toUtf8Bytes("MINTER_ROLE")), tokenManagerAddress1, { gasLimit: 5000000 });
    console.log("xxxxxx8")
    await sleep(2000)
    await tokenContract2
        .grantRole(keccak256(toUtf8Bytes("MINTER_ROLE")), tokenManagerAddress2, { gasLimit: 5000000 });
    await sleep(2000)
    console.log("xxxxxx9")
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