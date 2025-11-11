const mongoose = require("mongoose");

const UnitSchema = new mongoose.Schema(
  {
    project: { type: String, required: true },
    tower: { type: String, required: true },
    floor: { type: Number, required: true },
    unitNumber: { type: String, required: true },
    totalArea: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Available", "Sold", "Blocked"],
      default: "Available",
    },
    ownerName: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Units", UnitSchema);
