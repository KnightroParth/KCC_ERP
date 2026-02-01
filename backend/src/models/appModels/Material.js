// backend/src/models/appModels/Material.js

const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema(
  {
    removed: {
      type: Boolean,
      default: false,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    specifications: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    uom: {
      type: String,
      trim: true,
      default: 'nos',
    },
    openingStock: {
      type: Number,
      default: 0,
    },
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
    timestamps: false,
  }
);

MaterialSchema.pre('save', async function (next) {
  this.updated = new Date();
  next();
});

// Index for faster searches
MaterialSchema.index({ name: 1, removed: 1 });
MaterialSchema.index({ category: 1, removed: 1 });

module.exports = mongoose.model('Material', MaterialSchema);
