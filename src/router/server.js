const express = require("express");
const axios = require("axios");

const resolveShard = require("./routing");

const db = require("./db");

const rollback = require("./recovery");

const SHARDS = require("../shared/shardConfig");

const log = require("../shared/logger");

const { startTimer, endTimer } = require("./metrics");

const app = express();

app.use(express.json());

let FAIL_AFTER_COPY = false;

function updateMetadata(id, shard) {
  db.run(
    `
    INSERT OR REPLACE INTO DriverShardMap
    VALUES (?,?)
    `,
    [id, shard],
  );
}

function getMetadata(id) {
  return new Promise((resolve) => {
    db.get(
      `
      SELECT CurrentShard
      FROM DriverShardMap
      WHERE DriverID=?
      `,
      [id],
      (_, row) => {
        resolve(row);
      },
    );
  });
}

async function retryRequest(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) {
        throw err;
      }

      log("RETRY", `Attempt ${i + 1}`);
    }
  }
}

async function migrate(driver, oldShard, newShard) {
  const migrationStart = startTimer();

  let copied = false;

  log("MIGRATION", `${driver.DriverID}: ${oldShard} -> ${newShard}`);

  await retryRequest(() =>
    axios.post(`${SHARDS[newShard]}/write`, driver, {
      timeout: 2000,
    }),
  );

  copied = true;

  if (FAIL_AFTER_COPY) {
    throw new Error("Simulated crash after copy");
  }

  const verify = await axios.get(
    `${SHARDS[newShard]}/driver/${driver.DriverID}`,
    {
      timeout: 2000,
    },
  );

  if (!verify.data) {
    throw new Error("Verification failed");
  }

  updateMetadata(driver.DriverID, newShard);

  await axios.delete(`${SHARDS[oldShard]}/driver/${driver.DriverID}`, {
    timeout: 2000,
  });

  endTimer(migrationStart, "Migration time");

  return copied;
}

app.post("/toggleFailure", (_, res) => {
  FAIL_AFTER_COPY = !FAIL_AFTER_COPY;

  res.send({
    FAIL_AFTER_COPY,
  });
});

app.post("/updateLocation", async (req, res) => {
  const routingStart = startTimer();

  const driver = req.body;

  const target = resolveShard(driver.City);

  const existing = await getMetadata(driver.DriverID);

  let copied = false;

  try {
    await axios.get(`${SHARDS[target]}/health`, {
      timeout: 2000,
    });

    if (!existing) {
      await retryRequest(() =>
        axios.post(`${SHARDS[target]}/write`, driver, {
          timeout: 2000,
        }),
      );

      updateMetadata(driver.DriverID, target);

      log("ROUTER", `Inserted ${driver.DriverID} -> ${target}`);
    } else if (existing.CurrentShard !== target) {
      copied = await migrate(driver, existing.CurrentShard, target);
    } else {
      await retryRequest(() =>
        axios.post(`${SHARDS[target]}/write`, driver, {
          timeout: 2000,
        }),
      );
    }

    endTimer(routingStart, "Routing latency");

    res.send({
      success: true,
      target,
    });
  } catch (err) {
    if (copied) {
      const recoveryStart = startTimer();

      await rollback(driver.DriverID, target);

      endTimer(recoveryStart, "Recovery time");
    }

    log("ERROR", err.message);

    res.status(500).send({
      error: err.message,
    });
  }
});

app.get("/driver/:id", async (req, res) => {
  const meta = await getMetadata(req.params.id);

  if (!meta) {
    return res.status(404).send({
      error: "Not found",
    });
  }

  const result = await axios.get(
    `${SHARDS[meta.CurrentShard]}/driver/${req.params.id}`,
    {
      timeout: 2000,
    },
  );

  res.send(result.data);
});

app.listen(8000, () => {
  console.log("Router:8000");
});
