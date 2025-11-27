const mongoose = require("mongoose");
const createCRUDController = require("@/controllers/middlewaresControllers/createCRUDController");

function unitController() {
  const Model = mongoose.model("Unit");
  const methods = createCRUDController("Unit");
  return methods;
}

module.exports = unitController();

