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
    type: {
      type: String,
      enum: ['Skilled', 'Unskilled'],
      default: 'Unskilled',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
      default: 'Male',
    },
    wages: {
      type: Number,
      default: 0,
    },
    phone: {
      type: String,
      trim: true,
    },
    trade: {
      type: String,
      required: false,
      trim: true,
    },
    labourType: {
      type: String,
      required: false,
      trim: true,
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