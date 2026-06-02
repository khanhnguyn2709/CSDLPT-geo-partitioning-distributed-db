const axios = require("axios");

const shards = [
  "http://localhost:8001",
  "http://localhost:8002",
  "http://localhost:8003",
  "http://localhost:8004",
];

async function verify(id) {
  let count = 0;

  for (const shard of shards) {
    try {
      const r = await axios.get(`${shard}/driver/${id}`);

      if (r.data) {
        count++;
      }
    } catch {}
  }

  console.log(
    count === 1
      ? `[CONSISTENCY] OK — driver ${id} on 1 shard`
      : `[CONSISTENCY] FAILED — driver ${id} found on ${count} shards`,
  );
}

verify(101);
