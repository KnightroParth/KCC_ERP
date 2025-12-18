const mongoose = require('mongoose');

const AttendanceRecordSchema = new mongoose.Schema(
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
    },
    attendanceType: {
      type: String,
      enum: ['Individual', 'Group'],
      default: 'Individual',
      required: true,
    },
    labourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabourMaster',
      required: function() {
        return this.attendanceType === 'Individual';
      },
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: function() {
        return this.attendanceType === 'Group';
      },
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    labourType: {
      type: String,
      // Only required for Individual type
      required: function() {
        return this.attendanceType === 'Individual';
      },
    },
    fullDay: {
      type: Number,
      default: 0,
      min: 0,
    },
    halfDay: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent'],
      default: 'Present',
      // Only required for Individual type
      required: function() {
        return this.attendanceType === 'Individual';
      },
    },
    labourCounts: [
      {
        labourType: {
          type: String,
          required: true,
        },
        count: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
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

// Partial indexes for unique constraints
AttendanceRecordSchema.index(
  { labourId: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { attendanceType: 'Individual' },
  }
);

AttendanceRecordSchema.index(
  { vendorId: 1, projectId: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { attendanceType: 'Group' },
  }
);

AttendanceRecordSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('date')) {
    const date = new Date(this.date);
    date.setHours(0, 0, 0, 0);
    date.setMilliseconds(0);
    this.date = date;
  }

  // Validation only for Individual type
  if (this.attendanceType === 'Individual') {
    if (this.status === 'Absent') {
      this.fullDay = 0;
      this.halfDay = 0;
    } else {
      if (this.fullDay + this.halfDay <= 0) {
        return next(new Error('fullDay + halfDay must be greater than 0'));
      }
      if (this.halfDay > 2) {
        return next(new Error('halfDay cannot be more than 2'));
      }
    }
  }

  // Validation for Group type
  if (this.attendanceType === 'Group') {
    if (!this.labourCounts || this.labourCounts.length === 0) {
      return next(new Error('labourCounts is required for Group attendance'));
    }
  }

  this.updated = new Date();
  next();
});

// Update timestamp on modifications
AttendanceRecordSchema.pre(['findOneAndUpdate', 'updateOne'], async function (next) {
  this.set({ updated: new Date() });
  next();
});

module.exports = mongoose.model('AttendanceRecord', AttendanceRecordSchema);