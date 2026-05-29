const express = require("express");
const sqlite3 = require("sqlite3").verbose();

function createShardServer(dbPath, port, shardName) {
  const app = express();
  app.use(express.json());

  const db = new sqlite3.Database(dbPath);

  db.run(`
   CREATE TABLE IF NOT EXISTS DriverData(
      DriverID TEXT PRIMARY KEY,
      payload TEXT
   )
   `);

  app.get("/health", (_, res) => {
    res.send({
      alive: true,
      shard: shardName,
    });
  });

  app.post("/write", (req, res) => {
    const d = req.body;

    const payload = JSON.stringify({
      city: d.City,
      lat: d.Lat,
      long: d.Long,
      status: d.Status || "available",
    });

    db.run(
      `
         INSERT OR REPLACE INTO DriverData
         VALUES (?,?)
         `,
      [d.DriverID, payload],
    );

    res.send({ ok: true });
  });

  app.get("/driver/:id", (req, res) => {
    db.get(
      `
         SELECT * FROM DriverData
         WHERE DriverID=?
         `,
      [req.params.id],
      (_, row) => {
        if (!row) {
          return res.send(null);
        }

        res.send({
          DriverID: row.DriverID,
          ...JSON.parse(row.payload),
        });
      },
    );
  });

  app.delete("/driver/:id", (req, res) => {
    db.run(
      `
         DELETE FROM DriverData
         WHERE DriverID=?
         `,
      [req.params.id],
    );

    res.send({ deleted: true });
  });

  app.listen(port, () => {
    console.log(`${shardName}:${port}`);
  });
}

module.exports = createShardServer;
