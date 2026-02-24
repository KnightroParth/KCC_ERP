const Joi = require('joi');

const mongoose = require('mongoose');

const authUser = require('./authUser');

const ROLES = ['master', 'admin', 'pm', 'planner', 'site_engineer', 'store_incharge', 'accounts'];

const login = async (req, res, { userModel }) => {
  const UserPasswordModel = mongoose.model(userModel + 'Password');
  const UserModel = mongoose.model(userModel);
  const { email, password, requestedRole } = req.body;

  // validate
  const objectSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    password: Joi.string().required(),
    requestedRole: Joi.string().valid(...ROLES).optional(),
  });

  const { error, value } = objectSchema.validate({ email, password, requestedRole });
  if (error) {
    return res.status(409).json({
      success: false,
      result: null,
      error: error,
      message: 'Invalid/Missing credentials.',
      errorMessage: error.message,
    });
  }

  const user = await UserModel.findOne({ email: email, removed: false });

  // console.log(user);
  if (!user)
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No account with this email has been registered.',
    });

  const databasePassword = await UserPasswordModel.findOne({ user: user._id, removed: false });

  if (!user.enabled)
    return res.status(409).json({
      success: false,
      result: null,
      message: 'Your account is disabled, contact your account adminstrator',
    });

  // When signing in "with my account" for a specific profile, ensure this user has that role
  if (requestedRole && requestedRole.trim()) {
    const userRole = (user.role || '').toLowerCase().trim();
    const requested = requestedRole.toLowerCase().trim();
    if (userRole !== requested) {
      const roleLabels = {
        site_engineer: 'Site Engineer',
        accounts: 'Accounts',
        store_incharge: 'Store Incharge',
        planner: 'Planner / Work Incharge',
        pm: 'Project Manager',
        admin: 'Admin',
        master: 'Master',
      };
      const label = roleLabels[requested] || requested;
      return res.status(403).json({
        success: false,
        result: null,
        message: `This account is not registered as ${label}. Please sign in with the correct profile or use the default account.`,
      });
    }
  }

  //  authUser if your has correct password
  authUser(req, res, {
    user,
    databasePassword,
    password,
    UserPasswordModel,
  });
};

module.exports = login;
