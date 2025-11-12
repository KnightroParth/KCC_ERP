const create = async (Model, req, res) => {
  try {
    req.body.removed = false;

    // ✅ Automatically assign admin user if available
    if (req.admin && req.admin._id) {
      req.body.createdBy = req.admin._id;
      req.body.assigned = req.admin._id;
    }

    const result = await new Model({
      ...req.body,
    }).save();

    return res.status(200).json({
      success: true,
      result,
      message: `${Model.modelName} created successfully`,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
};

module.exports = create;
