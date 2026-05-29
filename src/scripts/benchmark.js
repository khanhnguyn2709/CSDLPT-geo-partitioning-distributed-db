const axios = require("axios");

async function benchmark() {
  const start = Date.now();

  for (let i = 0; i < 100; i++) {
    await axios.post("http://localhost:8000/updateLocation", {
      DriverID: i,
      City: "Paris",
      Lat: 48.85,
      Long: 2.35,
    });
  }

  console.log(`100 writes in ${Date.now() - start} ms`);
}

benchmark();
