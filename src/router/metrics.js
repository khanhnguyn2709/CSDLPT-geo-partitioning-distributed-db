function startTimer() {
  return Date.now();
}

function endTimer(start, label) {
  const elapsed = Date.now() - start;

  console.log(`[METRIC] ${label}: ${elapsed} ms`);
}

module.exports = {
  startTimer,
  endTimer,
};
