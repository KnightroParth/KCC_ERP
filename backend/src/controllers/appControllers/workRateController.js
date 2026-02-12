const mongoose = require('mongoose');
require('../../models/appModels/WorkRate');

const workRateController = {
    create: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const document = await Model.create(req.body);
            const result = await Model.findById(document._id);
            return res.status(201).json({ success: true, result, message: 'WorkRate created successfully' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    list: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const query = { removed: false, ...req.query };
            const docs = await Model.find(query).sort({ category: 1, subCategory: 1 });
            return res.status(200).json({ success: true, result: docs, message: 'Successfully found documents' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    listAll: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const { projectId } = req.query;
            let query = { removed: false };
            if (projectId) query.projectId = projectId;
            const docs = await Model.find(query).sort({ category: 1, subCategory: 1 });
            return res.status(200).json({ success: true, result: docs, message: 'Successfully found all documents' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    read: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const { id } = req.params;
            const result = await Model.findOne({ _id: id, removed: false });
            if (!result) return res.status(404).json({ success: false, message: 'Not found' });
            return res.status(200).json({ success: true, result, message: 'Found' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const { id } = req.params;
            await Model.updateOne({ _id: id }, req.body, { runValidators: true });
            const result = await Model.findById(id);
            return res.status(200).json({ success: true, result, message: 'Updated' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    delete: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const { id } = req.params;
            const result = await Model.findByIdAndUpdate(id, { removed: true }, { new: true });
            if (!result) return res.status(404).json({ success: false, message: 'Not found' });
            return res.status(200).json({ success: true, result, message: 'Deleted' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },
};

module.exports = workRateController;
