const Joi = require('joi');
const schema = Joi.object({
  client: Joi.alternatives().try(Joi.string(), Joi.object()).required(),
  number: Joi.number().required(),
  year: Joi.number().required(),
  status: Joi.string().required(),
  notes: Joi.string().allow(''),
  expiredDate: Joi.date().required(),
  date: Joi.date().required(),
  items: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().allow('').optional(),
        itemName: Joi.string().required(),
        description: Joi.string().allow(''),
        quantity: Joi.number().required(),
        price: Joi.number().required(),
        total: Joi.number().required(),
      }).required()
    )
    .required(),
  taxRate: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  // Billing module: normal (from planning) vs direct
  billType: Joi.string().valid('normal', 'direct').optional(),
  billingStage: Joi.string().valid('draft', 'audit', 'checking', 'approval', 'payment', 'on_hold').optional(),
  billingWeekEnd: Joi.date().optional(),
  billingWeekStart: Joi.date().optional(),
  sourceProjectId: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
  sourceContractorId: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
  plannedWorkIds: Joi.array().items(Joi.string()).optional(),
  onHoldReasons: Joi.string().allow('').optional(),
  onHoldPhotos: Joi.array().items(Joi.string()).optional(),
});

module.exports = schema;
