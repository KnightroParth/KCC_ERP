const mongoose = require('mongoose');

const WorkRateSchema = new mongoose.Schema(
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
            type: mongoose.Schema.Types.Mixed, // Can be ID or Code
            required: true,
            index: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        subCategory: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        unitType: {
            type: String,
            required: true,
            trim: true,
        },
        buildingPattern: {
            type: String,
            trim: true,
        },
        buildingName: {
            type: String,
            trim: true,
            index: true,
        },
        unitNumber: {
            type: String,
            trim: true,
            index: true,
        },
        minFloor: {
            type: Number,
            default: 0,
        },
        maxFloor: {
            type: Number,
            default: 100,
        },
        rate: {
            type: Number,
            default: 0,
        },
        /** When true, this rate covers multiple activities as a bundle (e.g. "Zari Cutting + Chipping") */
        isConsolidated: {
            type: Boolean,
            default: false,
        },
        /** Component activity names when isConsolidated is true (e.g. ["Zari Cutting", "Chipping"]) */
        componentActivities: [{
            type: String,
            trim: true,
        }],
        /** Human-readable note when rate is from a bundle, e.g. "Includes Chipping" */
        activityNote: {
            type: String,
            trim: true,
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

WorkRateSchema.pre('save', async function (next) {
    this.updated = new Date();
    next();
});

WorkRateSchema.index({ projectId: 1, category: 1, subCategory: 1, unitType: 1 });

module.exports = mongoose.model('WorkRate', WorkRateSchema);
