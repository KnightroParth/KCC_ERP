const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

function modelController() {
    const methods = createCRUDController('BillingMethod');
    return methods;
}

module.exports = modelController();
