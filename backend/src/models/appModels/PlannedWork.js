const mongoose = require('mongoose');

const PlannedWorkSchema = new mongoose.Schema(
    {
        removed: {
            type: Boolean,
            default: false,
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
        },
        buildingName: {
            type: String,
            required: true,
        },
        category: {
            type: String, // Work Type / Category Label
            required: true,
        },
        workType: {
            type: String, // Specific task name if applicable
        },
        unitNumber: {
            type: String,
            required: true,
        },
        startDate: {
            type: Date,
        },
        endDate: {
            type: Date,
        },
        contractorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
        },
        siteEngineer: { type: mongoose.Schema.Types.ObjectId, ref: 'LabourMaster' },
        supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'LabourMaster' },
        incharge: { type: mongoose.Schema.Types.ObjectId, ref: 'LabourMaster' },
        rate: {
            type: Number,
            default: 0
        },
        created: {
            type: Date,
            default: Date.now,
        },
        updated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false,
    }
);

PlannedWorkSchema.pre('save', function (next) {
    this.updated = new Date();
    next();
});

module.exports = mongoose.model('PlannedWork', PlannedWorkSchema);
