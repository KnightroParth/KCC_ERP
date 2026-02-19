const { escapeRegex, sanitizeFieldName } = require('@/utils/safeRegex');

const search = async (Model, req, res) => {
  const q = req.query.q;
  if (q == null || String(q).trim() === '') {
    return res.status(202).json({
      success: false,
      result: [],
      message: 'No document found by this request',
    });
  }

  const rawFields = req.query.fields ? req.query.fields.split(',') : ['name'];
  const fieldsArray = rawFields.map((f) => sanitizeFieldName(f)).filter(Boolean);
  if (fieldsArray.length === 0) fieldsArray.push('name');

  const safePattern = escapeRegex(String(q).trim());
  const fields = { $or: [] };
  for (const field of fieldsArray) {
    fields.$or.push({ [field]: { $regex: new RegExp(safePattern, 'i') } });
  }

  let results = await Model.find({
    ...fields,
  })

    .where('removed', false)
    .limit(20)
    .exec();

  if (results.length >= 1) {
    return res.status(200).json({
      success: true,
      result: results,
      message: 'Successfully found all documents',
    });
  } else {
    return res
      .status(202)
      .json({
        success: false,
        result: [],
        message: 'No document found by this request',
      })
      .end();
  }
};

module.exports = search;
