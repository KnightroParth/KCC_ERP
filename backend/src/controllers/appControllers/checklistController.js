const mongoose = require('mongoose');
const createCRUDController = require('../middlewaresControllers/createCRUDController');

function checklistController() {
    const Model = mongoose.model('Checklist');
    const methods = createCRUDController('Checklist');

    /* ============================================
        DELETE — with cascading logic
    ============================================= */
    methods.delete = async (req, res) => {
        try {
            const { id } = req.params;

            const doc = await Model.findOne({ _id: id, removed: false });
            if (!doc) {
                return res.status(404).json({
                    success: false,
                    result: null,
                    message: 'No document found by this id: ' + id,
                });
            }

            // Soft delete current Checklist
            await Model.findByIdAndUpdate(id, { removed: true });

            // Cascade to PlannedWork and Activities
            const PlannedWork = mongoose.model('PlannedWork');
            const Activities = mongoose.model('Activities');

            // Find unitId if possible for Activities
            const Units = mongoose.model('Units');
            const unit = await Units.findOne({ unitNumber: doc.unitNumber, projectId: doc.projectId });

            const contractorId = doc.personnel?.contractor?._id || doc.personnel?.contractor;

            await PlannedWork.updateMany(
                {
                    projectId: doc.projectId,
                    unitNumber: doc.unitNumber,
                    workType: doc.type,
                    contractorId: contractorId,
                    startDate: doc.startDate,
                    endDate: doc.endDate
                },
                { removed: true }
            );

            if (unit) {
                await Activities.updateMany(
                    {
                        projectId: doc.projectId,
                        unitId: unit._id,
                        activityName: doc.type,
                        contractorId: contractorId,
                        startDate: doc.startDate,
                        endDate: doc.endDate
                    },
                    { removed: true }
                );
            }

            return res.status(200).json({
                success: true,
                result: doc,
                message: 'Successfully deleted Checklist and synchronized with Planning and WIP',
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                result: null,
                message: error.message,
            });
        }
    };

    return methods;
}

module.exports = checklistController();