// backend/src/models/appModels/Units.js

const mongoose = require("mongoose");

const UnitsSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",   // ✅ REUSE CLIENT AS PROJECT
      required: true,
    },

    unitNumber: { type: String, required: true },          // A-502, Shop-3
    towerOrWing: { type: String },                          // Tower A / Wing B
    floor: { type: Number },

    unitType: { type: String },                             // 2BHK | 3BHK | Shop
    carpetArea: { type: Number },
    saleableArea: { type: Number },

    ratePerSqft: { type: Number, required: true },
    totalAmount: { type: Number },                          // auto-calculated

    status: {
      type: String,
      enum: ["Available", "Sold", "Blocked"],
      default: "Available",
    },

    ownerName: { type: String },                            // only if Sold
  },
  { timestamps: true }
);

// ✅ AUTO TOTAL CALCULATION
UnitsSchema.pre("save", function (next) {
  if (this.ratePerSqft && this.saleableArea) {
    this.totalAmount = this.ratePerSqft * this.saleableArea;
  }
  next();
});

// ✅ AUTO TOTAL CALCULATION ON UPDATE
UnitsSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.saleableArea && update.ratePerSqft) {
    update.totalAmount = update.saleableArea * update.ratePerSqft;
  }

  next();
});

module.exports = mongoose.model("Units", UnitsSchema);
