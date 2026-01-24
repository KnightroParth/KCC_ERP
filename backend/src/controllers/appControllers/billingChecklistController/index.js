const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

function modelController() {
    const methods = createCRUDController('BillingChecklist');
    return methods;
}

module.exports = modelController();
