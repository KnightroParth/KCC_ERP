const mongoose = require('mongoose');

const WorkAssignSchema = new mongoose.Schema(
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
            type: String,
            required: true,
        },
        unitId: {
            type: String,
            required: true,
        },
        workCode: {
            type: String,
            required: true,
        },
        // Changed from Object to Array to store list of selected work titles
        values: {
            type: [String],
            default: [],
            required: true,
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
        timestamps: true,
    }
);

// Create compound index for faster queries
WorkAssignSchema.index({ projectId: 1, workCode: 1, unitId: 1 });

module.exports = mongoose.model('WorkAssign', WorkAssignSchema);
