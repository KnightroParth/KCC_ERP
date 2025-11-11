const mongoose = require("mongoose");
const Units = mongoose.model("units");

exports.list = async (req, res) => {
  const result = await Units.find({});
  res.json({ success: true, result });
};

exports.create = async (req, res) => {
  const result = await Units.create(req.body);
  res.json({ success: true, result });
};

exports.read = async (req, res) => {
  const result = await Units.findById(req.params.id);
  res.json({ success: true, result });
};

exports.update = async (req, res) => {
  const result = await Units.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, result });
};

exports.delete = async (req, res) => {
  await Units.findByIdAndDelete(req.params.id);
  res.json({ success: true, result: "deleted" });
};
