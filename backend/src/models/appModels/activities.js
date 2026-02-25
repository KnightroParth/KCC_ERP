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
    contractorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: false,
    },
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
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
      required: false,
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

    // Activity photos (before and after)
    photos: {
      before: {
        type: String, // Base64 or file path/URL
        required: false,
      },
      after: {
        type: String, // Base64 or file path/URL
        required: false,
      },
    },
    progress: {
      type: String,
      enum: ['0%', '25%', '50%', '75%', '99%', '100%'],
      default: '0%',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
