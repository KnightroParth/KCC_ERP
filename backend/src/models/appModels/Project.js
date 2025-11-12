const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
  },
  location: String,
  startDate: Date,
  endDate: Date,

  createdBy: { type: mongoose.Schema.ObjectId, ref: "Admin" },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

schema.plugin(require("mongoose-autopopulate"));

module.exports = mongoose.model("Project", schema);
