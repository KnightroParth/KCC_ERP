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
    labourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabourMaster',
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    labourType: {
      type: String,
      // ✅ FIX: Must match LabourMaster enum
      enum: ['Skilled', 'Semi-Skilled', 'Unskilled', 'Female', 'Helper', 'Mistri'],
      required: true,
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
    },
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

AttendanceRecordSchema.index({ labourId: 1, date: 1 }, { unique: true });

AttendanceRecordSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('date')) {
    const date = new Date(this.date);
    date.setHours(0, 0, 0, 0);
    date.setMilliseconds(0);
    this.date = date;
  }

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

  this.updated = new Date();
  next();
});

// Update timestamp on modifications
AttendanceRecordSchema.pre(['findOneAndUpdate', 'updateOne'], async function (next) {
  this.set({ updated: new Date() });
  next();
});

module.exports = mongoose.model('AttendanceRecord', AttendanceRecordSchema);