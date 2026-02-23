// backend/src/models/appModels/StockTransaction.js

const mongoose = require('mongoose');

const StockTransactionSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    type: {
      type: String,
      enum: ['IN', 'OUT'],
      required: true,
      index: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      // Required only for IN type
    },
    issuedTo: {
      type: String,
      trim: true,
      // Required only for OUT type
    },
    workActivity: {
      type: String,
      trim: true,
      // Optional for OUT type
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
        unit: {
          type: String,
          trim: true,
        },
        rate: {
          type: Number,
          default: 0,
        },
      },
    ],
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

StockTransactionSchema.pre('save', async function (next) {
  this.updated = new Date();
  next();
});

// Indexes for efficient queries
StockTransactionSchema.index({ projectId: 1, type: 1, date: -1 });
StockTransactionSchema.index({ purchaseOrder: 1 });
StockTransactionSchema.index({ date: -1 });

module.exports = mongoose.model('StockTransaction', StockTransactionSchema);
