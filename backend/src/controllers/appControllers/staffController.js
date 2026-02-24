const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Admin = require('@/models/coreModels/Admin');
const AdminPassword = require('@/models/coreModels/AdminPassword');

/** Designation (UI) -> backend role */
const DESIGNATION_TO_ROLE = {
  'Project Manager': 'pm',
  'Planner / Work Incharge': 'planner',
  'Site Engineer': 'site_engineer',
  'Store Incharge': 'store_incharge',
  'Accounts': 'accounts',
};

/** Roles that count as "company staff" (exclude master, admin). */
const STAFF_ROLES = ['pm', 'planner', 'site_engineer', 'store_incharge', 'accounts'];

function getRoleFromDesignation(designation) {
  if (!designation) return 'site_engineer';
  const role = DESIGNATION_TO_ROLE[designation];
  return role || 'site_engineer';
}

function generateRandomPassword(length = 10) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

const staffController = {
  /**
   * Create a staff member (Admin + AdminPassword). Creates login credentials.
   * Body: name, designation, assignedProjects (array of projectIds), mobile, email, password (optional), status (Active/Inactive).
   */
  create: async (req, res) => {
    try {
      const {
        name,
        designation,
        assignedProjects = [],
        mobile,
        email,
        password: rawPassword,
        status,
      } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Name and email are required.',
        });
      }

      const emailNorm = email.trim().toLowerCase();
      const existingByEmail = await Admin.findOne({ email: emailNorm, removed: false });
      if (existingByEmail) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'A user with this email already exists.',
        });
      }

      if (mobile) {
        const existingByMobile = await Admin.findOne({ mobile: mobile.trim(), removed: false });
        if (existingByMobile) {
          return res.status(400).json({
            success: false,
            result: null,
            message: 'A user with this mobile number already exists.',
          });
        }
      }

      const role = getRoleFromDesignation(designation);
      const password = rawPassword && String(rawPassword).trim()
        ? String(rawPassword).trim()
        : generateRandomPassword(10);

      const salt = await bcrypt.genSalt(10);
      const combined = salt + password;
      const passwordHash = await bcrypt.hash(combined, 10);

      const enabled = status === 'Active';

      const newAdmin = new Admin({
        email: emailNorm,
        name: (name || '').trim(),
        surname: '',
        mobile: mobile ? String(mobile).trim() : undefined,
        designation: designation ? String(designation).trim() : undefined,
        assignedProjects: Array.isArray(assignedProjects)
          ? assignedProjects.filter((id) => mongoose.Types.ObjectId.isValid(id))
          : [],
        role,
        enabled,
        removed: false,
      });
      const savedAdmin = await newAdmin.save();

      const newPassword = new AdminPassword({
        user: savedAdmin._id,
        salt,
        password: passwordHash,
        emailToken: '',
        resetToken: '',
        emailVerified: true,
        authType: 'email',
        loggedSessions: [],
      });
      await newPassword.save();

      const result = await Admin.findById(savedAdmin._id)
        .populate('assignedProjects', 'name projectCode');

      return res.status(201).json({
        success: true,
        result,
        message: 'Staff created successfully. Login credentials have been created.',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  list: async (req, res) => {
    try {
      const { page = 1, items = 10, sort = 'created', sortBy = 'desc', status, search, q } = req.query;
      const skip = (parseInt(page, 10) - 1) * parseInt(items, 10);
      const sortValue = sortBy === 'desc' ? -1 : 1;

      const query = { removed: false, role: { $in: STAFF_ROLES } };
      if (status && status !== 'All') {
        query.enabled = status === 'Active';
      }
      const searchTerm = (search || q || '').trim();
      if (searchTerm) {
        query.$or = [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { mobile: { $regex: searchTerm, $options: 'i' } },
          { designation: { $regex: searchTerm, $options: 'i' } },
        ];
      }

      const result = await Admin.find(query)
        .populate('assignedProjects', 'name projectCode')
        .sort({ [sort]: sortValue })
        .skip(skip)
        .limit(parseInt(items, 10));

      const count = await Admin.countDocuments(query);
      const pagination = {
        page: parseInt(page, 10),
        items: parseInt(items, 10),
        pages: Math.ceil(count / parseInt(items, 10)),
        count,
      };

      return res.status(200).json({
        success: true,
        result,
        pagination,
        message: 'Successfully found staff list',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  read: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await Admin.findOne({
        _id: id,
        removed: false,
        role: { $in: STAFF_ROLES },
      }).populate('assignedProjects', 'name projectCode');

      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Staff not found.',
        });
      }

      return res.status(200).json({
        success: true,
        result,
        message: 'Staff found.',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, designation, assignedProjects, mobile, email, status } = req.body;

      const existing = await Admin.findOne({
        _id: id,
        removed: false,
        role: { $in: STAFF_ROLES },
      });
      if (!existing) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Staff not found.',
        });
      }

      if (email && email.trim().toLowerCase() !== existing.email) {
        const duplicate = await Admin.findOne({
          email: email.trim().toLowerCase(),
          removed: false,
          _id: { $ne: id },
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            result: null,
            message: 'Another user with this email already exists.',
          });
        }
      }
      if (mobile && mobile.trim() !== (existing.mobile || '')) {
        const duplicate = await Admin.findOne({
          mobile: mobile.trim(),
          removed: false,
          _id: { $ne: id },
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            result: null,
            message: 'Another user with this mobile number already exists.',
          });
        }
      }

      const updatePayload = {};
      if (name !== undefined) updatePayload.name = String(name).trim();
      if (designation !== undefined) updatePayload.designation = String(designation).trim();
      if (assignedProjects !== undefined) {
        updatePayload.assignedProjects = Array.isArray(assignedProjects)
          ? assignedProjects.filter((pid) => mongoose.Types.ObjectId.isValid(pid))
          : [];
      }
      if (mobile !== undefined) updatePayload.mobile = String(mobile).trim() || undefined;
      if (email !== undefined) updatePayload.email = email.trim().toLowerCase();
      if (status !== undefined) updatePayload.enabled = status === 'Active';
      if (designation !== undefined) updatePayload.role = getRoleFromDesignation(designation);

      const result = await Admin.findByIdAndUpdate(
        id,
        updatePayload,
        { new: true, runValidators: true }
      ).populate('assignedProjects', 'name projectCode');

      return res.status(200).json({
        success: true,
        result,
        message: 'Staff updated successfully.',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await Admin.findOne({
        _id: id,
        removed: false,
        role: { $in: STAFF_ROLES },
      });
      if (!existing) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Staff not found.',
        });
      }

      await Admin.findByIdAndUpdate(id, { removed: true }, { new: true });

      return res.status(200).json({
        success: true,
        result: { _id: id },
        message: 'Staff removed successfully.',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  listAll: async (req, res) => {
    try {
      const { sort = 'name', sortBy = 'asc' } = req.query;
      const sortValue = sortBy === 'desc' ? -1 : 1;
      const result = await Admin.find({
        removed: false,
        enabled: true,
        role: { $in: STAFF_ROLES },
      })
        .sort({ [sort]: sortValue })
        .populate('assignedProjects', 'name projectCode');

      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully found all staff',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  search: async (req, res) => {
    try {
      const { q, fields, page = 1, items = 10 } = req.query;
      const skip = (parseInt(page, 10) - 1) * parseInt(items, 10);
      const query = { removed: false, role: { $in: STAFF_ROLES } };
      if (q && String(q).trim()) {
        const s = String(q).trim();
        query.$or = [
          { name: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
          { mobile: { $regex: s, $options: 'i' } },
          { designation: { $regex: s, $options: 'i' } },
        ];
      }
      const result = await Admin.find(query)
        .populate('assignedProjects', 'name projectCode')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(items, 10));
      const count = await Admin.countDocuments(query);
      return res.status(200).json({
        success: true,
        result,
        pagination: { page: parseInt(page, 10), items: parseInt(items, 10), count, pages: Math.ceil(count / parseInt(items, 10)) },
        message: 'Search completed',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  filter: async (req, res) => {
    try {
      const result = await Admin.find({ removed: false, role: { $in: STAFF_ROLES } })
        .populate('assignedProjects', 'name projectCode');
      return res.status(200).json({
        success: true,
        result,
        message: 'Filter completed',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  summary: async (req, res) => {
    try {
      const count = await Admin.countDocuments({ removed: false, role: { $in: STAFF_ROLES } });
      return res.status(200).json({
        success: true,
        result: [{ count }],
        message: 'Summary',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },
};

module.exports = staffController;
