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
        workCode: {
            type: String,
            required: true,
        },
        values: {
            type: Object,
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

module.exports = mongoose.model('WorkAssign', WorkAssignSchema);
