const mongoose = require('mongoose');

const BillingChecklistSchema = new mongoose.Schema(
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
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        items: {
            type: mongoose.Schema.Types.Mixed,
            default: [],
        },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed'],
            default: 'pending',
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

BillingChecklistSchema.pre('save', async function (next) {
    this.updated = new Date();
    next();
});

module.exports = mongoose.model('BillingChecklist', BillingChecklistSchema);
