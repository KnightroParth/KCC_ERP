const mongoose = require('mongoose');
require('../../models/appModels/AttendanceRecord');
require('../../models/appModels/LabourMaster');
require('../../models/appModels/Vendor');

const AttendanceRecord = mongoose.model('AttendanceRecord');

const attendanceController = {
  // LIST
  list: async (req, res) => {
    try {
      const { projectId, date } = req.query;
      const query = { removed: false };

      if (projectId) query.projectId = projectId;
      
      if (date) {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        query.date = { $gte: d, $lt: next };
      }

      const result = await AttendanceRecord.find(query)
        .populate('labourId', 'name trade labourType')
        .populate('vendorId', 'name')
        .sort({ updated: -1 });

      return res.status(200).json({ success: true, result });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // MARK (The Fixed Logic)
  mark: async (req, res) => {
    try {
      const { projectId, date, labourId, vendorId, status, fullDay, halfDay, labourCounts } = req.body;

      if (!projectId || !date) 
        return res.status(400).json({ success: false, message: 'Project and Date are required' });

      // 1. Prepare Exact Date (Midnight)
      const exactDate = new Date(date);
      exactDate.setHours(0, 0, 0, 0);

      // 2. Prepare Search Range (Anytime that day)
      const nextDay = new Date(exactDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const dateRange = { $gte: exactDate, $lt: nextDay };

      // ===========================================
      // VENDOR ATTENDANCE (Group)
      // ===========================================
      if (vendorId) {
        // Step A: Find existing record for THIS Vendor on THIS Day
        let record = await AttendanceRecord.findOne({
          vendorId,
          projectId,
          date: dateRange,
          attendanceType: 'Group',
          removed: false
        });

        if (record) {
          // Update
          record.labourCounts = labourCounts;
          record.updated = new Date();
          record.createdBy = req.admin?._id;
          await record.save();
        } else {
          // Create New
          record = await AttendanceRecord.create({
            vendorId,
            projectId,
            date: exactDate, // SAVE EXACT DATE
            attendanceType: 'Group',
            labourCounts,
            createdBy: req.admin?._id
          });
        }
        return res.status(200).json({ success: true, result: record, message: 'Vendor Saved' });
      }

      // ===========================================
      // STAFF ATTENDANCE (Individual)
      // ===========================================
      if (labourId) {
        let record = await AttendanceRecord.findOne({
          labourId,
          date: dateRange,
          attendanceType: 'Individual',
          removed: false
        });

        const updateData = {
          projectId, // Update project if they moved
          status: status || 'Present',
          fullDay: status === 'Absent' ? 0 : (fullDay || 0),
          halfDay: status === 'Absent' ? 0 : (halfDay || 0),
          updated: new Date(),
          createdBy: req.admin?._id
        };

        if (record) {
          Object.assign(record, updateData);
          await record.save();
        } else {
          record = await AttendanceRecord.create({
            labourId,
            date: exactDate, // SAVE EXACT DATE
            attendanceType: 'Individual',
            ...updateData
          });
        }
        return res.status(200).json({ success: true, result: record, message: 'Staff Saved' });
      }

      return res.status(400).json({ success: false, message: 'Missing ID' });

    } catch (error) {
      if (error.code === 11000) {
        // This should NOT happen after running the fix_db.js script
        return res.status(400).json({ success: false, message: 'Duplicate Error: Please run the database fix script.' });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      await AttendanceRecord.findByIdAndUpdate(req.params.id, { removed: true });
      return res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = attendanceController;