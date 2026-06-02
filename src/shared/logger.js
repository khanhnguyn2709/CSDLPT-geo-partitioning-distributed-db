function log(type, msg) {
  const colors = {
    ROUTER: "\x1b[36m",
    MIGRATION: "\x1b[33m",
    VERIFY: "\x1b[32m",
    RETRY: "\x1b[35m",
    RECOVERY: "\x1b[34m",
    ROLLBACK: "\x1b[31m",
    ERROR: "\x1b[31m",
  };

  const reset = "\x1b[0m";

  const color = colors[type] || "";

  const now = new Date().toISOString();

  console.log(`${color}[${now}] [${type}] ${msg}${reset}`);
}

module.exports = log;
