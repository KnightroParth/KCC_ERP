const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },

  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },
  number: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  content: String,
  recurring: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'annually', 'quarter'],
  },
  date: {
    type: Date,
    required: true,
  },
  expiredDate: {
    type: Date,
    required: true,
  },
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: true,
    autopopulate: true,
  },
  converted: {
    from: {
      type: String,
      enum: ['quote', 'offer'],
    },
    // offer: {
    //   type: mongoose.Schema.ObjectId,
    //   ref: 'Offer',
    // },
    // quote: {
    //   type: mongoose.Schema.ObjectId,
    //   ref: 'Quote',
    // },
  },
  items: [
    {
      // product: {
      //   type: mongoose.Schema.ObjectId,
      //   ref: 'Product',
      //   // required: true,
      // },
      itemName: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      quantity: {
        type: Number,
        default: 1,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      // discount: {
      //   type: Number,
      //   default: 0,
      // },
      // taxRate: {
      //   type: Number,
      //   default: 0,
      // },
      // subTotal: {
      //   type: Number,
      //   default: 0,
      // },
      // taxTotal: {
      //   type: Number,
      //   default: 0,
      // },
      total: {
        type: Number,
        required: true,
      },
    },
  ],
  taxRate: {
    type: Number,
    default: 0,
  },
  subTotal: {
    type: Number,
    default: 0,
  },
  taxTotal: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'NA',
    uppercase: true,
    required: true,
  },
  credit: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  // payment: [
  //   {
  //     type: mongoose.Schema.ObjectId,
  //     ref: 'Payment',
  //   },
  // ],
  paymentStatus: {
    type: String,
    default: 'unpaid',
    enum: ['unpaid', 'paid', 'partially'],
  },
  isOverdue: {
    type: Boolean,
    default: false,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'refunded', 'cancelled', 'on hold'],
    default: 'draft',
  },
  // ----- Billing module: normal (from planning) vs direct -----
  billType: {
    type: String,
    enum: ['normal', 'direct'],
    default: 'direct',
  },
  billingStage: {
    type: String,
    enum: ['draft', 'audit_check', 'final_check', 'approved', 'payment', 'on_hold', 'cancelled'],
    default: 'draft',
  },
  // Billing period (weekly / Saturday)
  billingPeriod: {
    start: { type: Date },
    end: { type: Date },
  },
  billingWeekEnd: { type: Date },
  billingWeekStart: { type: Date },
  sourceProjectId: { type: mongoose.Schema.ObjectId, ref: 'Project' },
  sourceContractorId: { type: mongoose.Schema.ObjectId, ref: 'Vendor' },
  plannedWorkIds: [{ type: mongoose.Schema.ObjectId, ref: 'PlannedWork' }],
  // Audit stage: which rows are audited (workAssignId = PlannedWork._id or Activity._id)
  auditChecklist: [
    {
      workAssignId: { type: mongoose.Schema.Types.ObjectId, required: true },
      isAudited: { type: Boolean, default: false },
      remarks: { type: String },
    },
  ],
  // Final stage: which rows are finalized
  finalChecklist: [
    {
      workAssignId: { type: mongoose.Schema.Types.ObjectId, required: true },
      isFinalized: { type: Boolean, default: false },
    },
  ],
  // Adjustments (advance, penalty, hold)
  adjustments: {
    advanceDeduction: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 },
    holdAmount: { type: Number, default: 0 },
    holdReason: { type: String },
    holdPhotos: [{ type: String }],
  },
  // Legacy on-hold fields (kept for compatibility)
  onHoldReasons: { type: String },
  onHoldPhotos: [{ type: String }],
  pdf: {
    type: String,
  },
  files: [
    {
      id: String,
      name: String,
      path: String,
      description: String,
      isPublic: {
        type: Boolean,
        default: true,
      },
    },
  ],
  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

invoiceSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Invoice', invoiceSchema);
