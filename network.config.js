module.exports = {
    chainConfigs: {
        ganache: {
            url: "http://127.0.0.1:3636",
            accounts: [process.env.PRIVATE_KEY],
        },
    }
};