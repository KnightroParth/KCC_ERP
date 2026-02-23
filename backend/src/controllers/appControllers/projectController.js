const mongoose = require("mongoose");
const createCRUDController = require("@/controllers/middlewaresControllers/createCRUDController");

function projectController() {
  const Model = mongoose.model("Project");
  const methods = createCRUDController("Project");
  return methods;
}

module.exports = projectController();
