const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const { routesList } = require('@/models/utils');

const { globSync } = require('glob');
const path = require('path');

// ✅ Load controllers inside folders like clientController/, invoiceController/
const folderPattern = './src/controllers/appControllers/*/';
const folderControllers = globSync(folderPattern).map((filePath) => {
  return path.basename(filePath);
});

// ✅ Load single JS controller files (like projectController.js, unitsController.js)
const filePattern = './src/controllers/appControllers/*.js';
const fileControllers = globSync(filePattern).map((filePath) => {
  return path.basename(filePath).replace('.js', '');
});

const appControllers = () => {
  const controllers = {};
  const hasCustomControllers = [];

  // ✅ Load folder-style controllers
  folderControllers.forEach((controllerName) => {
    try {
      const customController = require(`@/controllers/appControllers/${controllerName}`);
      controllers[controllerName] = customController;
      hasCustomControllers.push(controllerName);
    } catch (err) {
      console.error(`Error loading controller in folder: ${controllerName}`, err.message);
    }
  });

  // ✅ Load single JS controllers
  fileControllers.forEach((controllerName) => {
    try {
      const customController = require(`@/controllers/appControllers/${controllerName}`);
      controllers[controllerName] = customController;
      hasCustomControllers.push(controllerName);
    } catch (err) {
      console.error(`Error loading controller file: ${controllerName}`, err.message);
    }
  });

  // ✅ If controller doesn’t exist, auto-generate CRUD controller
  routesList.forEach(({ modelName, controllerName }) => {
    if (!hasCustomControllers.includes(controllerName)) {
      controllers[controllerName] = createCRUDController(modelName);
    }
  });

  return controllers;
};

module.exports = appControllers();
