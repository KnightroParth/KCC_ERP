const mongoose = require('mongoose');

const ChecklistSchema = new mongoose.Schema(
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
        type: {
            type: String,
            required: true,
        },
        unitNumber: {
            type: String,
            required: true, // Stores "Building No" or "Flat No"
        },
        startDate: {
            type: Date,
        },
        endDate: {
            type: Date,
        },
        personnel: {
            siteEngineer: { type: mongoose.Schema.Types.ObjectId, ref: 'LabourMaster' },
            supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'LabourMaster' },
            incharge: { type: mongoose.Schema.Types.ObjectId, ref: 'LabourMaster' },
            contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {}, // Flexible storage for the complex table rows
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

ChecklistSchema.pre('save', async function (next) {
    this.updated = new Date();
    next();
});

module.exports = mongoose.model('Checklist', ChecklistSchema);
