const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('../../models/appModels/WorkRate');
const { importWorkRatesFromFile } = require('../../../scripts/importWorkRates');

const workRateController = {
    create: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const document = await Model.create(req.body);
            const result = await Model.findById(document._id);
            return res.status(201).json({ success: true, result, message: 'WorkRate created successfully' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    list: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const query = { removed: false, ...req.query };
            const docs = await Model.find(query).sort({ category: 1, subCategory: 1 });
            return res.status(200).json({ success: true, result: docs, message: 'Successfully found documents' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    listAll: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const { projectId, category } = req.query;
            const rawProjectId = typeof projectId === 'string' ? projectId.trim() : (projectId ?? '');
            let query = { removed: false };

            if (rawProjectId) {
                const Project = mongoose.model('Project');
                let project;
                if (mongoose.Types.ObjectId.isValid(rawProjectId) && String(rawProjectId).length === 24) {
                    project = await Project.findOne({ _id: rawProjectId, removed: { $ne: true } }).select('projectCode projectId _id').lean().exec();
                } else {
                    project = await Project.findOne({
                        $or: [{ projectCode: rawProjectId }, { projectId: rawProjectId }],
                        removed: { $ne: true }
                    }).select('projectCode projectId _id').lean().exec();
                }

                const codes = [];
                if (project) {
                    codes.push(project._id);
                    codes.push(project._id.toString()); // match string-stored projectId
                    if (project.projectCode) codes.push(project.projectCode);
                    if (project.projectId && project.projectId !== project.projectCode) codes.push(project.projectId);
                } else {
                    codes.push(rawProjectId);
                    if (mongoose.Types.ObjectId.isValid(rawProjectId)) codes.push(new mongoose.Types.ObjectId(rawProjectId));
                }
                query.projectId = { $in: [...new Set(codes)] };
            } else {
                return res.status(200).json({ success: true, result: [], message: 'projectId is required for workrate listAll' });
            }

            if (category) query.category = category;
            const docs = await Model.find(query).sort({ category: 1, subCategory: 1 }).lean().exec();
            return res.status(200).json({ success: true, result: docs, message: 'Successfully found all documents' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    read: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const { id } = req.params;
            const result = await Model.findOne({ _id: id, removed: false });
            if (!result) return res.status(404).json({ success: false, message: 'Not found' });
            return res.status(200).json({ success: true, result, message: 'Found' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const { id } = req.params;
            await Model.updateOne({ _id: id }, req.body, { runValidators: true });
            const result = await Model.findById(id);
            return res.status(200).json({ success: true, result, message: 'Updated' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    delete: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const { id } = req.params;
            const result = await Model.findByIdAndUpdate(id, { removed: true }, { new: true });
            if (!result) return res.status(404).json({ success: false, message: 'Not found' });
            return res.status(200).json({ success: true, result, message: 'Deleted' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * GET /workrate/rate-for-activity
     * Query: projectId, activityName, category?, unitType?, buildingPattern?, floor?
     * Returns rate for an activity with fallback for consolidated/bundled rates.
     * Used by Planning and Billing modules.
     */
    getRateForActivity: async (req, res) => {
        try {
            const Model = mongoose.model('WorkRate');
            const { projectId, activityName } = req.query;

            if (!projectId || !activityName) {
                return res.status(400).json({
                    success: false,
                    result: null,
                    message: 'projectId and activityName are required',
                });
            }

            const actName = String(activityName).trim();

            const baseQuery = {
                removed: false,
                projectId,
                rate: { $gt: 0 },
            };

            // 1. Exact match on subCategory
            let match = await Model.findOne({
                ...baseQuery,
                subCategory: actName,
            })
                .sort({ minFloor: 1 })
                .lean()
                .exec();

            // 2. Fallback: activity is part of a consolidated bundle
            if (!match) {
                match = await Model.findOne({
                    ...baseQuery,
                    isConsolidated: true,
                    componentActivities: actName,
                })
                    .sort({ minFloor: 1 })
                    .lean()
                    .exec();
                if (match) {
                    return res.status(200).json({
                        success: true,
                        result: {
                            rate: match.rate,
                            subCategory: match.subCategory,
                            isConsolidated: true,
                            note: match.activityNote || `Includes bundled activities: ${(match.componentActivities || []).filter((c) => c !== actName).join(', ')}`,
                        },
                        message: 'Rate found from consolidated bundle',
                    });
                }
            }

            // 3. Fuzzy: subCategory contains activity name (e.g. "Zari Cutting" in "Zari Cutting + Chipping")
            if (!match) {
                const fuzzy = await Model.find({
                    ...baseQuery,
                    $or: [
                        { subCategory: new RegExp(actName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
                        { componentActivities: actName },
                    ],
                })
                    .sort({ minFloor: 1 })
                    .limit(1)
                    .lean()
                    .exec();
                match = fuzzy[0];
                if (match && match.isConsolidated) {
                    return res.status(200).json({
                        success: true,
                        result: {
                            rate: match.rate,
                            subCategory: match.subCategory,
                            isConsolidated: true,
                            note: match.activityNote || `Part of bundled rate: ${match.subCategory}`,
                        },
                        message: 'Rate found from consolidated bundle',
                    });
                }
            }

            if (!match) {
                return res.status(200).json({
                    success: true,
                    result: { rate: 0, subCategory: null, isConsolidated: false, note: null },
                    message: 'No rate found for this activity',
                });
            }

            return res.status(200).json({
                success: true,
                result: {
                    rate: match.rate,
                    subCategory: match.subCategory,
                    isConsolidated: !!match.isConsolidated,
                    note: match.isConsolidated ? match.activityNote : null,
                },
                message: 'Rate found',
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * POST /workrate/import
     * Import work rates from Excel file (Set Rate template format).
     * Expects multipart/form-data with 'file' field.
     */
    importFromExcel: async (req, res) => {
        try {
            if (!req.file || !req.file.path) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded. Please select an Excel file.',
                });
            }
            const filePath = req.file.path;
            try {
                const result = await importWorkRatesFromFile(filePath, {
                    projectFilter: { name: { $in: [/Lotus Park/i, /Lotus Green/i] } },
                });
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                return res.status(200).json({
                    success: true,
                    result,
                    message: `Import complete. Imported ${result.totalImported} rates.`,
                });
            } catch (err) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                throw err;
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Import failed',
            });
        }
    },
};

module.exports = workRateController;
