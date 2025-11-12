const mongoose = require("mongoose");
const createCRUDController = require("@/controllers/middlewaresControllers/createCRUDController");

function unitsController() {
  const Model = mongoose.model("Units");
  const methods = createCRUDController("Units");
  return methods;
}

module.exports = unitsController();
