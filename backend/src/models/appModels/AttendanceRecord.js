const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  // Type: Individual (Staff) or Group (Vendor)
  attendanceType: {
    type: String,
    enum: ['Individual', 'Group'],
    default: 'Individual',
  },
  // For Individual Staff
  labourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabourMaster',
  },
  // For Vendor Groups
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  // Data
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half Day'],
    default: 'Present',
  },
  fullDay: { type: Number, default: 0 },
  halfDay: { type: Number, default: 0 },
  
  // Vendor Counts Breakdown
  labourCounts: [{
    labourType: String,
    count: Number
  }],

  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

// =========================================================
// CRITICAL: PARTIAL INDEXES (The Fix)
// =========================================================
// 1. Ensure ONE record per STAFF per DAY (Only for Individuals)
schema.index(
  { labourId: 1, date: 1 }, 
  { unique: true, partialFilterExpression: { attendanceType: 'Individual', removed: false } }
);

// 2. Ensure ONE record per VENDOR per PROJECT per DAY (Only for Groups)
// This allows multiple DIFFERENT vendors on the same day
schema.index(
  { vendorId: 1, projectId: 1, date: 1 }, 
  { unique: true, partialFilterExpression: { attendanceType: 'Group', removed: false } }
);

module.exports = mongoose.model('AttendanceRecord', schema);