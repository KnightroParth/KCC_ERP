// backend/src/controllers/appControllers/attendanceController.js

const mongoose = require('mongoose');

const AttendanceRecord = mongoose.model('AttendanceRecord');
const LabourMaster = mongoose.model('LabourMaster');

const attendanceController = {
  /**
   * GET /attendance/list
   * Filter by projectId, date, search
   */
  list: async (req, res) => {
    try {
      const { projectId, date, search, page = 1, items = 10 } = req.query;

      const query = { removed: false };

      if (projectId) {
        query.projectId = projectId;
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
        .populate('labourId', 'name trade labourType vendorType')
        .populate('createdBy', 'name')
        .sort({ date: -1, created: -1 })
        .skip(skip)
        .limit(parseInt(items));

      // Apply search filter if provided
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        attendanceRecords = attendanceRecords.filter((record) => {
          const labour = record.labourId;
          if (!labour) return false;
          return (
            searchRegex.test(labour.name) ||
            searchRegex.test(labour.trade) ||
            searchRegex.test(labour.labourType) ||
            searchRegex.test(labour.vendorType)
          );
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
      const { projectId, labourId, date, fullDay, halfDay, status } = req.body;

      // Validation: Check if labour exists
      const labour = await LabourMaster.findOne({ _id: labourId, removed: false });
      if (!labour) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Labour not found',
        });
      }

      // Validation: fullDay + halfDay must be > 0
      if (fullDay + halfDay <= 0) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'fullDay + halfDay must be greater than 0',
        });
      }

      // Validation: halfDay cannot be more than 2
      if (halfDay > 2) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'halfDay cannot be more than 2',
        });
      }

      // Parse date
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      // Check if record already exists for this labourId + date
      const existingRecord = await AttendanceRecord.findOne({
        labourId,
        date: {
          $gte: new Date(attendanceDate),
          $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000),
        },
        removed: false,
      });

      // If status is Absent, set fullDay and halfDay to 0
      let finalFullDay = fullDay;
      let finalHalfDay = halfDay;
      if (status === 'Absent') {
        finalFullDay = 0;
        finalHalfDay = 0;
      }

      let result;
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
          labourType: labour.labourType,
          fullDay: finalFullDay,
          halfDay: finalHalfDay,
          status: status || 'Present',
          createdBy: req.admin?._id || req.body.createdBy,
        });
      }

      // Populate and return
      const populatedResult = await AttendanceRecord.findById(result._id)
        .populate('projectId', 'name projectCode')
        .populate('labourId', 'name trade labourType vendorType')
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
          message: 'Attendance record already exists for this labour and date',
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
