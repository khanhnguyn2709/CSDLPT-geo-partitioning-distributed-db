const CITY_TO_SHARD = {
  Paris: "EU",
  Berlin: "EU",

  London: "UK",
  Manchester: "UK",

  "New York": "US",
  Boston: "US",

  Tokyo: "APAC",
  Singapore: "APAC",
};

function resolveShard(city) {
  return CITY_TO_SHARD[city];
}

module.exports = resolveShard;
