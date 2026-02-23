const listAll = async (Model, req, res) => {
  const sort = req.query.sort || 'desc';
  const enabled = req.query.enabled || undefined;

  // Flatten nested objects for mongoose queries (e.g. personnel: { contractor: id } -> 'personnel.contractor': id)
  const flatten = (obj, prefix = '', res = {}) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        flatten(obj[key], prefix + key + '.', res);
      } else {
        res[prefix + key] = obj[key];
      }
    }
    return res;
  };

  const filters = flatten(req.query);
  const query = { removed: false };

  if (enabled !== undefined) {
    query.enabled = enabled === 'true';
  }

  // Add other query params to filter
  for (const key in filters) {
    if (key !== 'sort' && key !== 'enabled') {
      query[key] = filters[key];
    }
  }

  const result = await Model.find(query)
    .sort({ created: sort })
    .populate()
    .exec();

  if (result.length > 0) {
    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully found all documents',
    });
  } else {
    // Return empty array with success true for listAll (it's not an error to find nothing)
    return res.status(200).json({
      success: true,
      result: [],
      message: 'Collection is Empty',
    });
  }
};

module.exports = listAll;
