const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const { calculate } = require('@/helpers');
const { increaseBySettingKey } = require('@/middlewares/settings');
const schema = require('./schemaValidate');

const create = async (req, res) => {
  let body = req.body;

  const { error, value } = schema.validate(body);
  if (error) {
    const { details } = error;
    return res.status(400).json({
      success: false,
      result: null,
      message: details[0]?.message,
    });
  }

  const { items = [], taxRate = 0, discount = 0 } = value;

  // default
  let subTotal = 0;
  let taxTotal = 0;
  let total = 0;

  //Calculate the items array with subTotal, total, taxTotal
  items.map((item) => {
    let total = calculate.multiply(item['quantity'], item['price']);
    //sub total
    subTotal = calculate.add(subTotal, total);
    //item total
    item['total'] = total;
  });
  taxTotal = calculate.multiply(subTotal, taxRate / 100);
  total = calculate.add(subTotal, taxTotal);

  body['subTotal'] = subTotal;
  body['taxTotal'] = taxTotal;
  body['total'] = total;
  body['items'] = items;

  let paymentStatus = calculate.sub(total, discount) === 0 ? 'paid' : 'unpaid';

  body['paymentStatus'] = paymentStatus;
  body['createdBy'] = req.admin._id;

  // Billing: use only contractor (sourceContractorId); do not require client
  if (value.sourceContractorId != null) {
    body.sourceContractorId = value.sourceContractorId;
    if (body.client === undefined || body.client === null || body.client === '') {
      delete body.client;
    }
  }
  if (value.client != null && value.client !== '') body.client = value.client;

  // Billing module: persist optional fields
  if (value.billType) body.billType = value.billType;
  if (value.billingStage) body.billingStage = value.billingStage;
  if (value.billingPeriod) body.billingPeriod = value.billingPeriod;
  if (value.billingWeekEnd) body.billingWeekEnd = value.billingWeekEnd;
  if (value.billingWeekStart) body.billingWeekStart = value.billingWeekStart;
  if (value.sourceProjectId) body.sourceProjectId = value.sourceProjectId;
  if (value.sourceContractorId) body.sourceContractorId = value.sourceContractorId;
  if (value.plannedWorkIds && value.plannedWorkIds.length) body.plannedWorkIds = value.plannedWorkIds;
  if (value.auditChecklist && value.auditChecklist.length) body.auditChecklist = value.auditChecklist;
  if (value.finalChecklist && value.finalChecklist.length) body.finalChecklist = value.finalChecklist;
  if (value.adjustments) body.adjustments = value.adjustments;

  // Creating a new document in the collection
  let result;
  try {
    result = await new Model(body).save();
  } catch (err) {
    return res.status(400).json({
      success: false,
      result: null,
      message: err.message || 'Failed to create invoice',
    });
  }
  const fileId = 'invoice-' + result._id + '.pdf';
  const updateResult = await Model.findOneAndUpdate(
    { _id: result._id },
    { pdf: fileId },
    { new: true }
  )
    .populate('sourceContractorId', 'name')
    .populate('client', 'name')
    .populate('sourceProjectId', 'name')
    .exec();
  // Returning successfull response

  increaseBySettingKey({
    settingKey: 'last_invoice_number',
  });

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Invoice created successfully',
  });
};

module.exports = create;
