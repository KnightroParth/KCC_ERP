const mongoose = require("mongoose");

const UnitsSchema = new mongoose.Schema(
  {
    // Store projectCode directly — NOT ObjectId
    projectId: {
      type: String,      // 🔥 critical fix
      required: true,
    },

    unitNumber: { type: String, required: true },
    towerOrWing: { type: String },
    // Also support buildingName for consistency with Unit model
    buildingName: { type: String },
    floor: { type: Number },
    floorNumber: { type: Number }, // For frontend compatibility

    unitType: { type: String },
    constructionUnitType: {
      type: String,
      trim: true,
    },
    chatursima: {
      east: { type: String, trim: true },
      west: { type: String, trim: true },
      north: { type: String, trim: true },
      south: { type: String, trim: true },
    },
    carpetArea: { type: Number },
    saleableArea: { type: Number },
    areaSqft: { type: Number }, // For frontend compatibility

    ratePerSqft: { type: Number, required: true },
    totalAmount: { type: Number },

    status: {
      type: String,
      enum: ["Available", "Sold", "Blocked"],
      default: "Available",
    },

    ownerName: { type: String },
    grade: {
      type: String,
      enum: ["A", "A+", "A++", "A+++", "Ready", "Complete"],
      default: "A",
    },
    removed: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-calculation on save
UnitsSchema.pre("save", function (next) {
  if (this.saleableArea && this.ratePerSqft) {
    this.totalAmount = this.saleableArea * this.ratePerSqft;
  }
  next();
});

// Auto-calculation on update
UnitsSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.saleableArea && update.ratePerSqft) {
    update.totalAmount = update.saleableArea * update.ratePerSqft;
  }
  next();
});

module.exports = mongoose.model("Units", UnitsSchema);