const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./metadata.db");

db.run(`
CREATE TABLE IF NOT EXISTS DriverShardMap(
   DriverID TEXT PRIMARY KEY,
   CurrentShard TEXT
)
`);

module.exports = db;
