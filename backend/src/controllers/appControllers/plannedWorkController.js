const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

function plannedWorkController() {
    const Model = mongoose.model('PlannedWork');
    const methods = createCRUDController('PlannedWork');

    const Checklist = mongoose.model('Checklist');
    const Activities = mongoose.model('Activities');

    /* ============================================
        UPDATE — with cascading logic
    ============================================= */
    methods.update = async (req, res) => {
        try {
            const { id } = req.params;
            const oldDoc = await Model.findOne({ _id: id, removed: false });

            if (!oldDoc) {
                return res.status(404).json({
                    success: false,
                    result: null,
                    message: 'No document found by this id: ' + id,
                });
            }

            await Model.findByIdAndUpdate(id, req.body, { runValidators: true });
            const newDoc = await Model.findById(id);

            // Cascade updates to contractorId, personnel, rate
            // We use old identifiers to find the linked records
            const filter = {
                projectId: oldDoc.projectId,
                unitNumber: oldDoc.unitNumber,
                startDate: oldDoc.startDate,
                endDate: oldDoc.endDate,
                removed: false
            };

            // Update Checklist
            await Checklist.updateMany(
                { ...filter, type: oldDoc.workType, 'personnel.contractor': oldDoc.contractorId },
                {
                    'personnel.contractor': newDoc.contractorId,
                    'personnel.siteEngineer': newDoc.siteEngineer,
                    'personnel.supervisor': newDoc.supervisor,
                    'personnel.incharge': newDoc.incharge,
                }
            );

            // Update Activities
            await Activities.updateMany(
                {
                    projectId: oldDoc.projectId,
                    activityName: oldDoc.workType,
                    contractorId: oldDoc.contractorId,
                    startDate: oldDoc.startDate,
                    endDate: oldDoc.endDate,
                    removed: false
                },
                {
                    contractorId: newDoc.contractorId,
                    defaultRate: newDoc.rate,
                    startDate: newDoc.startDate,
                    endDate: newDoc.endDate
                }
            );

            return res.status(200).json({
                success: true,
                result: newDoc,
                message: 'Successfully updated PlannedWork and synchronized with Checklist and WIP',
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                result: null,
                message: error.message,
            });
        }
    };

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

            // Soft delete the PlannedWork
            await Model.findByIdAndUpdate(id, { removed: true });

            // Cascade to Checklist
            await Checklist.updateMany(
                {
                    projectId: doc.projectId,
                    unitNumber: doc.unitNumber,
                    type: doc.workType,
                    'personnel.contractor': doc.contractorId,
                    startDate: doc.startDate,
                    endDate: doc.endDate,
                    removed: false
                },
                { removed: true }
            );

            // Cascade to Activities
            await Activities.updateMany(
                {
                    projectId: doc.projectId,
                    activityName: doc.workType,
                    contractorId: doc.contractorId,
                    startDate: doc.startDate,
                    endDate: doc.endDate,
                    removed: false
                },
                { removed: true }
            );

            return res.status(200).json({
                success: true,
                result: doc,
                message: 'Successfully deleted PlannedWork and synchronized with Checklist and WIP',
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                result: null,
                message: error.message,
            });
        }
    };


    /* ============================================
        CARRY FORWARD — automatic shifting of overdue tasks
    ============================================= */
    methods.carryForward = async (req, res) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Calculate CURRENT active planning cycle based on today
            let nextStart, nextEnd;
            if (today.getDate() <= 15) {
                // Cycle: 1st to 15th
                nextStart = new Date(today.getFullYear(), today.getMonth(), 1);
                nextEnd = new Date(today.getFullYear(), today.getMonth(), 15);
            } else {
                // Cycle: 16th to End of Month
                nextStart = new Date(today.getFullYear(), today.getMonth(), 16);
                nextEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            }

            // Find all Activities with endDate < today and progress not 99% or 100%
            const overdueActivities = await Activities.find({
                endDate: { $lt: today },
                progress: { $nin: ['99%', '100%'] },
                removed: false
            });

            let updatedCount = 0;

            for (const activity of overdueActivities) {
                // Update Activity
                const updatedData = { ...activity.data, carryForwarded: true, carryForwardMessage: "Carry Forwarded because not completed within time" };
                await Activities.findByIdAndUpdate(activity._id, {
                    startDate: nextStart,
                    endDate: nextEnd,
                    data: updatedData
                });

                // Get Unit number 
                const Units = mongoose.model('Units');
                const unit = await Units.findById(activity.unitId);

                if (unit) {
                    // Find and Update corresponding PlannedWork
                    await Model.updateMany(
                        {
                            projectId: activity.projectId,
                            unitNumber: unit.unitNumber,
                            workType: activity.activityName,
                            removed: false
                        },
                        {
                            startDate: nextStart,
                            endDate: nextEnd,
                            $set: { "description": "Carry Forwarded because not completed within time" }
                        }
                    );
                }
                updatedCount++;
            }

            return res.status(200).json({
                success: true,
                message: `Successfully carried forward ${updatedCount} overdue tasks`,
                updatedCount
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };

    return methods;
}

module.exports = plannedWorkController();
