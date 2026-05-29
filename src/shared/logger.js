function log(type, msg) {
  const now = new Date().toISOString();

  console.log(`[${now}] [${type}] ${msg}`);
}

module.exports = log;
