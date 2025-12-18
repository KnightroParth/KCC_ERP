// backend/src/controllers/appControllers/attendanceController.js

const mongoose = require('mongoose');

// Ensure models are registered
require('../../models/appModels/AttendanceRecord');
require('../../models/appModels/LabourMaster');
require('../../models/appModels/Vendor');

const AttendanceRecord = mongoose.model('AttendanceRecord');
const LabourMaster = mongoose.model('LabourMaster');
const Vendor = mongoose.model('Vendor');

const attendanceController = {
  /**
   * GET /attendance/list
   * Filter by projectId, date, search
   */
  list: async (req, res) => {
    try {
      const { projectId, date, search, attendanceType, page = 1, items = 10 } = req.query;

      const query = { removed: false };

      if (projectId) {
        query.projectId = projectId;
      }

      if (attendanceType) {
        query.attendanceType = attendanceType;
      }

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }

      const skip = (parseInt(page) - 1) * parseInt(items);

      let attendanceRecords = await AttendanceRecord.find(query)
        .populate('projectId', 'name projectCode')
        .populate('labourId', 'name trade labourType')
        .populate('vendorId', 'name phone email')
        .populate('createdBy', 'name')
        .sort({ date: -1, created: -1 })
        .skip(skip)
        .limit(parseInt(items));

      // Apply search filter if provided
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        attendanceRecords = attendanceRecords.filter((record) => {
          if (record.attendanceType === 'Individual' && record.labourId) {
            const labour = record.labourId;
            return (
              searchRegex.test(labour.name) ||
              searchRegex.test(labour.trade) ||
              searchRegex.test(labour.labourType)
            );
          } else if (record.attendanceType === 'Group' && record.vendorId) {
            const vendor = record.vendorId;
            return (
              searchRegex.test(vendor.name) ||
              searchRegex.test(vendor.phone) ||
              searchRegex.test(vendor.email)
            );
          }
          return false;
        });
      }

      const count = await AttendanceRecord.countDocuments(query);

      const pagination = {
        page: parseInt(page),
        items: parseInt(items),
        pages: Math.ceil(count / parseInt(items)),
        count,
      };

      return res.status(200).json({
        success: true,
        result: attendanceRecords,
        pagination,
        message: 'Successfully found all attendance records',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  /**
   * POST /attendance/mark
   * Mark attendance with validations
   */
  mark: async (req, res) => {
    try {
      const { projectId, labourId, vendorId, date, fullDay, halfDay, status, labourCounts } = req.body;

      // Parse date
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      let result;
      let existingRecord;

      // Group Mode (Vendor Labour)
      if (vendorId) {
        // Validation: Check if vendor exists
        const vendor = await Vendor.findOne({ _id: vendorId, removed: false });
        if (!vendor) {
          return res.status(404).json({
            success: false,
            result: null,
            message: 'Vendor not found',
          });
        }

        // Validation: labourCounts is required
        if (!labourCounts || !Array.isArray(labourCounts) || labourCounts.length === 0) {
          return res.status(400).json({
            success: false,
            result: null,
            message: 'labourCounts is required for Group attendance',
          });
        }

        // Check if record already exists for this vendorId + projectId + date
        existingRecord = await AttendanceRecord.findOne({
          vendorId,
          projectId,
          date: {
            $gte: new Date(attendanceDate),
            $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000),
          },
          attendanceType: 'Group',
          removed: false,
        });

        if (existingRecord) {
          // Update existing record
          existingRecord.labourCounts = labourCounts;
          existingRecord.updated = new Date();
          result = await existingRecord.save();
        } else {
          // Create new record
          result = await AttendanceRecord.create({
            projectId,
            vendorId,
            date: attendanceDate,
            attendanceType: 'Group',
            labourCounts,
            createdBy: req.admin?._id || req.body.createdBy,
          });
        }
      }
      // Individual Mode (Company Staff)
      else if (labourId) {
        // Validation: Check if labour exists
        const labour = await LabourMaster.findOne({ _id: labourId, removed: false });
        if (!labour) {
          return res.status(404).json({
            success: false,
            result: null,
            message: 'Labour not found',
          });
        }

        // Validation: fullDay + halfDay must be > 0 (only if status is not Absent)
        if (status !== 'Absent' && fullDay + halfDay <= 0) {
          return res.status(400).json({
            success: false,
            result: null,
            message: 'fullDay + halfDay must be greater than 0',
          });
        }

        // Validation: halfDay cannot be more than 2 (only if status is not Absent)
        if (status !== 'Absent' && halfDay > 2) {
          return res.status(400).json({
            success: false,
            result: null,
            message: 'halfDay cannot be more than 2',
          });
        }

        // If status is Absent, set fullDay and halfDay to 0
        let finalFullDay = fullDay;
        let finalHalfDay = halfDay;
        if (status === 'Absent') {
          finalFullDay = 0;
          finalHalfDay = 0;
        }

        // Check if record already exists for this labourId + date
        existingRecord = await AttendanceRecord.findOne({
          labourId,
          date: {
            $gte: new Date(attendanceDate),
            $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000),
          },
          attendanceType: 'Individual',
          removed: false,
        });

        if (existingRecord) {
          // Update existing record
          existingRecord.fullDay = finalFullDay;
          existingRecord.halfDay = finalHalfDay;
          existingRecord.status = status || 'Present';
          existingRecord.updated = new Date();
          result = await existingRecord.save();
        } else {
          // Create new record
          result = await AttendanceRecord.create({
            projectId,
            labourId,
            date: attendanceDate,
            attendanceType: 'Individual',
            labourType: labour.labourType,
            fullDay: finalFullDay,
            halfDay: finalHalfDay,
            status: status || 'Present',
            createdBy: req.admin?._id || req.body.createdBy,
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Either labourId (Individual) or vendorId (Group) must be provided',
        });
      }

      // Populate and return
      const populatedResult = await AttendanceRecord.findById(result._id)
        .populate('projectId', 'name projectCode')
        .populate('labourId', 'name trade labourType')
        .populate('vendorId', 'name phone email')
        .populate('createdBy', 'name');

      return res.status(200).json({
        success: true,
        result: populatedResult,
        message: existingRecord ? 'Attendance updated successfully' : 'Attendance marked successfully',
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Attendance record already exists for this date',
        });
      }
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  /**
   * GET /attendance/history/:labourId
   * Get attendance history for a specific labour
   */
  history: async (req, res) => {
    try {
      const { labourId } = req.params;
      const { startDate, endDate, page = 1, items = 10 } = req.query;

      const query = {
        labourId,
        removed: false,
      };

      if (startDate || endDate) {
        query.date = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          query.date.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(items);

      const records = await AttendanceRecord.find(query)
        .populate('projectId', 'name projectCode')
        .populate('labourId', 'name trade labourType vendorType')
        .populate('createdBy', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(items));

      const count = await AttendanceRecord.countDocuments(query);

      const pagination = {
        page: parseInt(page),
        items: parseInt(items),
        pages: Math.ceil(count / parseInt(items)),
        count,
      };

      return res.status(200).json({
        success: true,
        result: records,
        pagination,
        message: 'Successfully found attendance history',
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

module.exports = attendanceController;
