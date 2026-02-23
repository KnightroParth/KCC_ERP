const mongoose = require('mongoose');

const BillingMethodSchema = new mongoose.Schema(
    {
        removed: {
            type: Boolean,
            default: false,
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
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

BillingMethodSchema.pre('save', async function (next) {
    this.updated = new Date();
    next();
});

module.exports = mongoose.model('BillingMethod', BillingMethodSchema);
