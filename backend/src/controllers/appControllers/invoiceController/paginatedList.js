const mongoose = require('mongoose');
const { escapeRegex, sanitizeFieldName } = require('@/utils/safeRegex');

const Model = mongoose.model('Invoice');
const Vendor = mongoose.model('Vendor');
const Client = mongoose.model('Client');

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
    .lean()
    .exec();

  const countPromise = Model.countDocuments(findQuery);

  const [rawResult, count] = await Promise.all([resultsPromise, countPromise]);

  // Explicit lookup: get names from Vendor and Client (ids may be in sourceContractorId or client)
  const allIds = new Set();
  const toId = (v) => (v && (v._id || v));
  (rawResult || []).forEach((doc) => {
    const sid = toId(doc.sourceContractorId);
    const cid = toId(doc.client);
    if (sid) allIds.add(sid.toString());
    if (cid) allIds.add(cid.toString());
  });
  const idList = [...allIds].filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));

  let nameById = {};
  if (idList.length > 0) {
    const [vendors, clients] = await Promise.all([
      Vendor.find({ _id: { $in: idList } }).select('name').lean().exec(),
      Client.find({ _id: { $in: idList } }).select('name').lean().exec(),
    ]);
    (vendors || []).forEach((v) => { if (v && v._id) nameById[v._id.toString()] = v.name; });
    (clients || []).forEach((c) => { if (c && c._id) nameById[c._id.toString()] = c.name; });
  }

  const result = Array.isArray(rawResult)
    ? rawResult.map((doc) => {
        const sid = toId(doc.sourceContractorId);
        const cid = toId(doc.client);
        const contractorDisplayName =
          (sid && nameById[sid.toString()]) ||
          (cid && nameById[cid.toString()]) ||
          null;
        return { ...doc, contractorDisplayName };
      })
    : rawResult;

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
