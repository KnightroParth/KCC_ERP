// backend/src/models/appModels/SiteTransfer.js
// Site Transfer: Move materials from one project/site (A) to another (B) – e.g. cement, diesel

const mongoose = require('mongoose');

const SiteTransferSchema = new mongoose.Schema(
  {
    removed: {
      type: Boolean,
      default: false,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    fromProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    toProjectId: {
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

SiteTransferSchema.pre('save', async function (next) {
  this.updated = new Date();
  next();
});

SiteTransferSchema.index({ fromProjectId: 1, date: -1 });
SiteTransferSchema.index({ toProjectId: 1, date: -1 });
SiteTransferSchema.index({ date: -1 });

module.exports = mongoose.model('SiteTransfer', SiteTransferSchema);
