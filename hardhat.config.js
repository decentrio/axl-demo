require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: [process.env.PRIVATE_KEY],
    },
    realio: {
      url: "http://127.0.0.1:8545",
      accounts: [process.env.PRIVATE_KEY],
    },
    fuji: {
      url: process.env.FUJI_API_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 43113,
    },
  },
};