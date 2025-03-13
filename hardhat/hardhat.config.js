require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition-ethers");
require('dotenv').config();

module.exports = {
  solidity: "0.8.22",
  networks: {
    ganache: {
      url: "http://127.0.0.1:3636",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  ignition: {
    defaultNetwork: "ganache", // Set default deployment network
  },
};