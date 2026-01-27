const createCRUDController = require('../middlewaresControllers/createCRUDController');
const Checklist = require('../../models/appModels/Checklist');

const methods = createCRUDController('Checklist');
module.exports = methods;