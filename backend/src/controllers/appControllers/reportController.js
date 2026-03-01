const mongoose = require('mongoose');

const reportController = () => {
    const PlannedWork = mongoose.model('PlannedWork');
    const Activities = mongoose.model('Activities');

    const methods = {};

    methods.planningReport = async (req, res) => {
        try {
            const { projectId, buildingName, startDate, endDate } = req.query;

            const filter = { removed: false };
            if (projectId) filter.projectId = projectId;
            if (buildingName) filter.buildingName = buildingName;
            if (startDate || endDate) {
                filter.startDate = {};
                if (startDate) filter.startDate.$gte = new Date(startDate);
                if (endDate) filter.startDate.$lte = new Date(endDate);
            }

            const results = await PlannedWork.find(filter)
                .populate('projectId', 'name projectCode')
                .populate('contractorId', 'name companyName')
                .sort({ category: 1, created: -1 });

            return res.status(200).json({
                success: true,
                result: results,
                message: 'Successfully fetched planning report data',
            });
        } catch (error) {
            return res.status(500).json({ success: false, result: null, message: error.message });
        }
    };

    methods.completedReport = async (req, res) => {
        try {
            const { projectId, buildingName, startDate, endDate } = req.query;

            const filter = {
                removed: false,
                status: 'Completed'
            };

            if (projectId) filter.projectId = projectId;
            if (startDate || endDate) {
                filter.updated = {}; // For completed, we care about when it was completed
                if (startDate) filter.updated.$gte = new Date(startDate);
                if (endDate) filter.updated.$lte = new Date(endDate);
            }

            let results = await Activities.find(filter)
                .populate('projectId', 'name projectCode')
                .populate('contractorId', 'name companyName')
                .populate('unitId', 'unitNumber buildingName towerOrWing')
                .sort({ category: 1, updated: -1 });

            // Filter by buildingName after population if it's stored in Unit
            if (buildingName) {
                results = results.filter(item => {
                    const bName = item.unitId?.buildingName || item.unitId?.towerOrWing;
                    return bName === buildingName;
                });
            }

            return res.status(200).json({
                success: true,
                result: results,
                message: 'Successfully fetched completed report data',
            });
        } catch (error) {
            return res.status(500).json({ success: false, result: null, message: error.message });
        }
    };

    methods.pendingReport = async (req, res) => {
        try {
            const { projectId, buildingName, startDate, endDate } = req.query;

            const filter = {
                removed: false,
                status: { $ne: 'Completed' }
            };

            if (projectId) filter.projectId = projectId;
            if (startDate || endDate) {
                filter.startDate = {};
                if (startDate) filter.startDate.$gte = new Date(startDate);
                if (endDate) filter.startDate.$lte = new Date(endDate);
            }

            let results = await Activities.find(filter)
                .populate('projectId', 'name projectCode')
                .populate('contractorId', 'name companyName')
                .populate('unitId', 'unitNumber buildingName towerOrWing')
                .sort({ category: 1, created: -1 });

            if (buildingName) {
                results = results.filter(item => {
                    const bName = item.unitId?.buildingName || item.unitId?.towerOrWing;
                    return bName === buildingName;
                });
            }

            return res.status(200).json({
                success: true,
                result: results,
                message: 'Successfully fetched pending report data',
            });
        } catch (error) {
            return res.status(500).json({ success: false, result: null, message: error.message });
        }
    };

    methods.create = async (req, res) => res.status(405).json({ success: false, message: 'Not allowed' });
    methods.read = async (req, res) => res.status(405).json({ success: false, message: 'Not allowed' });
    methods.update = async (req, res) => res.status(405).json({ success: false, message: 'Not allowed' });
    methods.delete = async (req, res) => res.status(405).json({ success: false, message: 'Not allowed' });
    methods.list = async (req, res) => res.status(405).json({ success: false, message: 'Not allowed' });
    methods.listAll = async (req, res) => res.status(405).json({ success: false, message: 'Not allowed' });
    methods.search = async (req, res) => res.status(405).json({ success: false, message: 'Not allowed' });
    methods.filter = async (req, res) => res.status(405).json({ success: false, message: 'Not allowed' });
    methods.summary = async (req, res) => res.status(405).json({ success: false, message: 'Not allowed' });

    return methods;
};

module.exports = reportController();
