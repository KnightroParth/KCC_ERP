const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema(
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
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    workType: {
      type: String,
      trim: true,
    },
    labourSupplyDetails: [
      {
        labourType: {
          type: String,
          required: true,
          trim: true,
        },
        count: {
          type: Number,
          default: 0,
        },
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
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

VendorSchema.pre('save', async function (next) {
  this.updated = new Date();
  next();
});

module.exports = mongoose.model('Vendor', VendorSchema);
