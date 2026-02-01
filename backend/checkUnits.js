require("dotenv").config();
const mongoose = require("mongoose");
const Units = require("./src/models/appModels/Units");

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const units = await Units.find().lean();
  console.log(JSON.stringify(units, null, 2));
  process.exit();
}

check();