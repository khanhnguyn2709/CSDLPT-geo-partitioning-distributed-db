const axios = require("axios");

const SHARDS = require("../shared/shardConfig");

const log = require("../shared/logger");

async function rollback(driverID, shard) {
  await axios.delete(`${SHARDS[shard]}/driver/${driverID}`, {
    timeout: 2000,
  });

  log("ROLLBACK", `Deleted stale copy from ${shard}`);
}

module.exports = rollback;
