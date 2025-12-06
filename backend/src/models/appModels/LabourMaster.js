const mongoose = require('mongoose');

const LabourMasterSchema = new mongoose.Schema(
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
    },
    trade: {
      type: String,
      required: true,
      trim: true,
    },
    labourType: {
      type: String,
      // ✅ FIX: Added Skilled, Semi-Skilled, Unskilled to the allowed list
      enum: ['Skilled', 'Semi-Skilled', 'Unskilled', 'Female', 'Helper', 'Mistri'],
      required: true,
    },
    vendorType: {
      type: String,
      enum: ['Vendor Labour', 'My Labour'],
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
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

LabourMasterSchema.pre('save', async function (next) {
  this.updated = new Date();
  next();
});

module.exports = mongoose.model('LabourMaster', LabourMasterSchema);