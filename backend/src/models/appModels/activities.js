// backend/src/models/appModels/activities.js

const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
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

    // Project and Unit linkage
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Units',
      required: true,
    },

    // Activity identification
    activityCode: {
      type: String,
      required: true,
      trim: true,
    },
    activityName: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    defaultRate: {
      type: Number,
      required: false,
    },
    category: {
      type: String,
      required: false,
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
ActivitySchema.pre('save', async function (next) {
  this.updated = new Date();
  next();
});

module.exports = mongoose.model('Activities', ActivitySchema);
