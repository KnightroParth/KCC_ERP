// backend/src/models/appModels/Unit.js

const mongoose = require('mongoose');

const UnitSchema = new mongoose.Schema(
  {
    // Common Idurar flags
    removed: {
      type: Boolean,
      default: false,
    },
    enabled: {
      type: Boolean,
      default: true,
    },

    // Reference to Project
    projectId: {
      type: String,
      required: true,
      ref: 'Project',
    },

    // Unit identification
    unitNumber: {
      type: String,
      required: true,
      trim: true,
    },
    buildingName: {
      type: String,
      required: true,
      trim: true,
    },
    floorNumber: {
      type: String,
      required: true,
      trim: true,
    },
    unitType: {
      type: String,
      required: true,
      trim: true,
    },
    areaSqft: {
      type: Number,
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Available', 'Booked', 'Sold'],
      default: 'Available',
    },
    buyerName: {
      type: String,
      trim: true,
    },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    // Idurar-style timestamps
    created: {
      type: Date,
      default: Date.now,
    },
    updated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // we already use created / updated above
  }
);

// ===== Keep updated timestamp =====
UnitSchema.pre('save', async function (next) {
  this.updated = new Date();
  next();
});

module.exports = mongoose.model('Unit', UnitSchema);

