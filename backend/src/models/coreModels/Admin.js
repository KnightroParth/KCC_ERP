const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: false,
  },

  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
  },
  name: { type: String, required: true },
  surname: { type: String },
  photo: {
    type: String,
    trim: true,
  },
  /** Mobile number (unique, used for login). */
  mobile: {
    type: String,
    trim: true,
    sparse: true,
  },
  /** Display designation (e.g. "Project Manager", "Site Engineer"). */
  designation: {
    type: String,
    trim: true,
  },
  /** Project IDs this staff is assigned to. */
  assignedProjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Project',
  }],
  created: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['master', 'admin', 'pm', 'planner', 'site_engineer', 'store_incharge', 'accounts'],
  },
});

module.exports = mongoose.model('Admin', adminSchema);
