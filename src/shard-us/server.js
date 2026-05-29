const createShardServer = require("../shared/createShardServer");

createShardServer("./us.db", 8003, "US");
