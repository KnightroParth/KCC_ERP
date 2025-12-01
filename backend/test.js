const mongoose = require("mongoose");
require("dotenv").config();

const Client = require("./src/models/appModels/Client");

mongoose.connect(process.env.DATABASE.replace("<password>", process.env.DATABASE_PASSWORD))
  .then(async () => {
    const clients = await Client.find().limit(50);
    console.log("\n=== All Clients ===");
    clients.forEach(c => console.log(c));
    process.exit();
  })
  .catch(err => console.error(err));