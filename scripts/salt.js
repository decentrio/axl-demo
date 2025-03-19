const crypto = require("crypto");

const salt = "0x" + crypto.randomBytes(32).toString("hex");
console.log("salt", salt)