module.exports = {
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: [process.env.PRIVATE_KEY
      ],
    },
    realio: {
      url: "http://127.0.0.1:8545",
      accounts: [process.env.PRIVATE_KEY
      ],
      gas: 5000000,
      gasPrice: 8000000000,
    },
    fuji: {
      url: process.env.FUJI_API_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 43113,
    }
  }
}