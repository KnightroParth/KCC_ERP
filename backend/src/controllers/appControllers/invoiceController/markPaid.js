const mongoose = require('mongoose');
const Model = mongoose.model('Invoice');

/**
 * PATCH /invoice/mark-paid/:id
 * Sets paymentStatus to 'paid'. Used when user downloads the bill PDF (bill is final / handed over).
 */
const markPaid = async (req, res) => {
  const result = await Model.findOneAndUpdate(
    { _id: req.params.id, removed: false },
    { $set: { paymentStatus: 'paid', billingStage: 'payment' } },
    { new: true }
  )
    .populate('sourceContractorId', 'name')
    .populate('client', 'name')
    .exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Invoice not found',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Invoice marked as paid',
  });
};

module.exports = markPaid;
