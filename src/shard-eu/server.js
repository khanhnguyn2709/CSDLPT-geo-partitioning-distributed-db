const createShardServer = require("../shared/createShardServer");

createShardServer("./eu.db", 8001, "EU");
