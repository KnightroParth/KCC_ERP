// backend/src/models/appModels/ProjectInventory.js

const mongoose = require('mongoose');

const ProjectInventorySchema = new mongoose.Schema(
  {
    removed: {
      type: Boolean,
      default: false,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
      index: true,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalReceived: {
      type: Number,
      default: 0,
    },
    totalConsumed: {
      type: Number,
      default: 0,
    },
    avgRate: {
      type: Number,
      default: 0,
    },
    lastTransactionDate: {
      type: Date,
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

ProjectInventorySchema.pre('save', async function (next) {
  this.updated = new Date();
  next();
});

// Unique compound index to ensure one inventory record per project-material combination
ProjectInventorySchema.index({ projectId: 1, material: 1 }, { unique: true });
ProjectInventorySchema.index({ projectId: 1 });
ProjectInventorySchema.index({ material: 1 });

module.exports = mongoose.model('ProjectInventory', ProjectInventorySchema);
