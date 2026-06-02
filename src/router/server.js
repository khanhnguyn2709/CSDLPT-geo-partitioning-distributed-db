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
        log(
          "ROUTER",
          `Lookup ${id} -> ${row ? row.CurrentShard : "not found"}`,
        );

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

      log("RETRY", `Attempt ${i + 1}/${retries}`);
    }
  }
}

async function migrate(driver, oldShard, newShard) {
  const migrationStart = startTimer();

  log("MIGRATION", `Driver ${driver.DriverID}: ${oldShard} -> ${newShard}`);

  log("MIGRATION", "[STEP 1/4] Copy to target shard");

  await retryRequest(() =>
    axios.post(`${SHARDS[newShard]}/write`, driver, {
      timeout: 2000,
    }),
  );

  log("MIGRATION", `${driver.DriverID} copied to ${newShard}`);

  if (FAIL_AFTER_COPY) {
    throw new Error("Simulated crash after copy");
  }

  log("MIGRATION", "[STEP 2/4] Verify copied data");

  const verify = await axios.get(
    `${SHARDS[newShard]}/driver/${driver.DriverID}`,
    {
      timeout: 2000,
    },
  );

  if (!verify.data) {
    throw new Error("Verification failed");
  }

  log("VERIFY", `${driver.DriverID} confirmed on ${newShard}`);

  log("MIGRATION", "[STEP 3/4] Update metadata");

  updateMetadata(driver.DriverID, newShard);

  log(
    "MIGRATION",
    `Metadata updated: Driver ${driver.DriverID} moved from ${oldShard} to ${newShard}`,
  );

  log("MIGRATION", "[STEP 4/4] Delete stale copy");

  await axios.delete(`${SHARDS[oldShard]}/driver/${driver.DriverID}`, {
    timeout: 2000,
  });

  log("MIGRATION", `Deleted stale copy from ${oldShard}`);

  endTimer(migrationStart, "Migration time");
}

app.post("/toggleFailure", (_, res) => {
  FAIL_AFTER_COPY = !FAIL_AFTER_COPY;

  log("ROUTER", `FAIL_AFTER_COPY = ${FAIL_AFTER_COPY}`);

  res.send({
    FAIL_AFTER_COPY,
  });
});

app.post("/updateLocation", async (req, res) => {
  const routingStart = startTimer();

  const driver = req.body;

  const target = resolveShard(driver.City);

  log("ROUTER", `City ${driver.City} mapped to shard ${target}`);

  const existing = await getMetadata(driver.DriverID);

  try {
    log("ROUTER", `Health check ${target}`);

    await axios.get(`${SHARDS[target]}/health`, {
      timeout: 2000,
    });

    log("ROUTER", `${target} shard alive`);

    if (!existing) {
      await retryRequest(() =>
        axios.post(`${SHARDS[target]}/write`, driver, {
          timeout: 2000,
        }),
      );

      updateMetadata(driver.DriverID, target);

      log("ROUTER", `Inserted ${driver.DriverID} -> ${target}`);
    } else if (existing.CurrentShard !== target) {
      await migrate(driver, existing.CurrentShard, target);
    } else {
      await retryRequest(() =>
        axios.post(`${SHARDS[target]}/write`, driver, {
          timeout: 2000,
        }),
      );

      log("ROUTER", `Updated ${driver.DriverID} on ${target}`);
    }

    endTimer(routingStart, "Routing latency");

    res.send({
      success: true,
      target,
    });
  } catch (err) {
    if (FAIL_AFTER_COPY) {
      const recoveryStart = startTimer();

      log(
        "RECOVERY",
        "Failure detected - system chooses Availability and Partition Tolerance before immediate Consistency",
      );

      log("RECOVERY", `Rollback start for Driver ${driver.DriverID}`);

      await rollback(driver.DriverID, target);

      log("RECOVERY", `Rollback completed for Driver ${driver.DriverID}`);

      endTimer(recoveryStart, "Recovery time");
    }

    log("ERROR", err.message);

    res.status(500).send({
      error: err.message,
    });
  }
});

app.get("/driver/:id", async (req, res) => {
  const queryStart = startTimer();

  const meta = await getMetadata(req.params.id);

  if (!meta) {
    return res.status(404).send({
      error: "Not found",
    });
  }

  log("ROUTER", `Query ${req.params.id} -> ${meta.CurrentShard}`);

  const result = await axios.get(
    `${SHARDS[meta.CurrentShard]}/driver/${req.params.id}`,
    {
      timeout: 2000,
    },
  );

  endTimer(queryStart, "Query response time");

  res.send(result.data);
});

app.listen(8000, () => {
  console.log("Router:8000");
});
