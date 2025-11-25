// backend/src/models/appModels/Project.js

const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
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

    // ===== Core identity =====
    // Auto-generated code like KCC-2025-001
    projectId: {
      type: String,
      unique: true,
    },

    // Main project name (used in UI & search)
    name: {
      type: String,
      required: true,
    },

    // ===== Mandatory business fields (user input) =====
    stakeholderName: {
      type: String,
      required: true,
    },
    projectManagerId: {
      type: String,
      required: true,
    },
    scopeDescription: {
      type: String,
      required: true,
    },
    plannedStartDate: {
      type: Date,
      required: true,
    },
    targetEndDate: {
      type: Date,
      required: true,
    },
    // Total approved budget (we keep key as "budget" for simplicity)
    budget: {
      type: Number,
      required: true,
    },

    // ===== Status & tracking =====
    status: {
      type: String,
      enum: ['Planning', 'Execution', 'Complete'],
      default: 'Planning',
    },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    actualEndDate: { type: Date },
    actualTotalCost: { type: Number, default: 0 },
    actualTotalHours: { type: Number, default: 0 },

    healthIndicator: {
      type: String,
      enum: ['Red', 'Amber', 'Green'],
      default: 'Amber',
    },

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

// ===== Auto-generate projectId & keep updated timestamp =====
ProjectSchema.pre('save', async function (next) {
  // Auto projectId only on first creation
  if (!this.projectId) {
    const now = new Date();
    const year = now.getFullYear();

    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

    const count = await this.constructor.countDocuments({
      created: { $gte: startOfYear, $lte: endOfYear },
    });

    // KCC-2025-001 style
    this.projectId = `KCC-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  this.updated = new Date();
  next();
});

module.exports = mongoose.model('Project', ProjectSchema);