// backend/src/models/appModels/StockRequirement.js

const mongoose = require('mongoose');

const StockRequirementSchema = new mongoose.Schema(
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
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    requestDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    requiredDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Fulfilled'],
      default: 'Pending',
      index: true,
    },
    items: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Material',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 0.01,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    estimatedCost: {
      type: Number,
      default: 0,
    },
    budgetExceeded: {
      type: Boolean,
      default: false,
    },
    budgetWarning: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
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

StockRequirementSchema.pre('save', async function (next) {
  this.updated = new Date();
  next();
});

// Indexes
StockRequirementSchema.index({ projectId: 1, status: 1 });
StockRequirementSchema.index({ status: 1, requestDate: -1 });

module.exports = mongoose.model('StockRequirement', StockRequirementSchema);
