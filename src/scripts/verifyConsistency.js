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

  if (count === 1) {
    console.log("[CONSISTENCY] OK");
  } else {
    console.log("[CONSISTENCY] FAILED");
  }
}

verify(101);
