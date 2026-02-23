const mongoose = require('mongoose');
const { escapeRegex, sanitizeFieldName } = require('@/utils/safeRegex');

const Model = mongoose.model('Quote');

const paginatedList = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.items, 10) || 10));
  const skip = (page - 1) * limit;

  const { sortBy = 'enabled', sortValue = -1, filter, equal } = req.query;

  const rawFields = req.query.fields ? req.query.fields.split(',') : [];
  const fieldsArray = rawFields.map((f) => sanitizeFieldName(f)).filter(Boolean);

  let fields = {};
  if (fieldsArray.length > 0 && req.query.q != null && String(req.query.q).trim() !== '') {
    const safePattern = escapeRegex(String(req.query.q).trim());
    fields = { $or: fieldsArray.map((field) => ({ [field]: { $regex: new RegExp(safePattern, 'i') } })) };
  }

  const findQuery = {
    removed: false,
    ...(filter && equal != null ? { [sanitizeFieldName(filter)]: equal } : {}),
    ...fields,
  };

  const resultsPromise = Model.find(findQuery)
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortValue })
    .populate('createdBy', 'name')
    .exec();

  const countPromise = Model.countDocuments(findQuery);

  // Resolving both promises
  const [result, count] = await Promise.all([resultsPromise, countPromise]);
  // Calculating total pages
  const pages = Math.ceil(count / limit);

  // Getting Pagination Object
  const pagination = { page, pages, count };
  if (count > 0) {
    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: true,
      result: [],
      pagination,
      message: 'Collection is Empty',
    });
  }
};

module.exports = paginatedList;
