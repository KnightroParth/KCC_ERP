const mongoose = require("mongoose");
const createCRUDController = require("@/controllers/middlewaresControllers/createCRUDController");

function workAssignController() {
    const Model = mongoose.model("WorkAssign");
    const Project = mongoose.model("Project");
    const Units = mongoose.model("Units");
    
    const methods = createCRUDController("WorkAssign");

    /**
     * Override list to handle filtering by projectId and workCode
     * This is called when frontend calls: /workassign/list?projectId=xxx&workCode=yyy
     */
    methods.list = async (req, res) => {
        try {
            const { projectId, workCode } = req.query;
            const page = req.query.page || 1;
            const limit = parseInt(req.query.items) || 10;
            const skip = page * limit - limit;

            // Build filter object
            let filterObj = { removed: false };
            if (projectId) {
                filterObj.projectId = projectId;
            }
            if (workCode) {
                filterObj.workCode = workCode;
            }

            // Query with filters
            const resultsPromise = Model.find(filterObj)
                .skip(skip)
                .limit(limit)
                .sort({ created: -1 })
                .exec();

            // Count total matching documents
            const countPromise = Model.countDocuments(filterObj);

            const [result, count] = await Promise.all([resultsPromise, countPromise]);

            // Calculate pagination
            const pages = Math.ceil(count / limit);
            const pagination = { page, pages, count };

            if (count > 0) {
                return res.status(200).json({
                    success: true,
                    result,
                    pagination,
                    message: 'Successfully found work assignments',
                });
            } else {
                return res.status(203).json({
                    success: true,
                    result: [],
                    pagination,
                    message: 'No work assignments found for the selected criteria',
                });
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                result: null,
                message: error.message,
            });
        }
    };

    /**
     * Override create to validate references and return populated result
     */
    const originalCreate = methods.create;
    methods.create = async (req, res) => {
        try {
            const { projectId, unitId, workCode, values } = req.body;

            // Validate that required fields exist
            if (!projectId || !unitId || !workCode || !values) {
                return res.status(400).json({
                    success: false,
                    result: null,
                    message: 'Missing required fields: projectId, unitId, workCode, values',
                });
            }

            // Create the document
            const document = await Model.create(req.body);

            // Return the created document
            return res.status(201).json({
                success: true,
                result: document,
                message: 'Work assignment created successfully',
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                result: null,
                message: error.message,
            });
        }
    };

    /**
     * Override update to handle updates and return full document
     */
    const originalUpdate = methods.update;
    methods.update = async (req, res) => {
        try {
            const { id } = req.params;
            const { values } = req.body;

            // Validate values exist
            if (!values) {
                return res.status(400).json({
                    success: false,
                    result: null,
                    message: 'Missing required field: values',
                });
            }

            // Update the document
            const updated = await Model.findByIdAndUpdate(
                id,
                { values, updated: new Date() },
                { new: true, runValidators: true }
            );

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    result: null,
                    message: 'Work assignment not found',
                });
            }

            return res.status(200).json({
                success: true,
                result: updated,
                message: 'Work assignment updated successfully',
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                result: null,
                message: error.message,
            });
        }
    };

    /**
     * Override delete to handle soft or hard delete
     */
    const originalDelete = methods.delete;
    methods.delete = async (req, res) => {
        try {
            const { id } = req.params;

            // Soft delete - mark as removed
            const deleted = await Model.findByIdAndUpdate(
                id,
                { removed: true, updated: new Date() },
                { new: true }
            );

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    result: null,
                    message: 'Work assignment not found',
                });
            }

            return res.status(200).json({
                success: true,
                result: deleted,
                message: 'Work assignment deleted successfully',
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

module.exports = workAssignController();
