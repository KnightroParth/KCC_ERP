const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const supplierController = () => {
  return createCRUDController('Supplier');
};

module.exports = supplierController;
