const mongoose = require("mongoose");
const createCRUDController = require("@/controllers/middlewaresControllers/createCRUDController");

function workAssignController() {
    const Model = mongoose.model("WorkAssign");
    const methods = createCRUDController("WorkAssign");
    return methods;
}

module.exports = workAssignController();
