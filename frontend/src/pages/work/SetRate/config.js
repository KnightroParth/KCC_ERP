// frontend/src/pages/work/SetRate/config.js

export const fields = {
    projectId: {
        label: 'Project',
        type: 'select',
        required: true,
    },
    category: {
        label: 'Category',
        type: 'select',
        required: true,
    },
    subCategory: {
        label: 'Sub Category / Task',
        type: 'select',
        required: true,
    },
    unitType: {
        label: 'Unit Type',
        type: 'string',
        required: true,
        placeholder: 'e.g., 2BHK, 3BHK',
    },
    buildingPattern: {
        label: 'Building Pattern',
        type: 'string',
        required: true,
        placeholder: 'e.g., AllBuildings or B1,B2',
    },
    minFloor: {
        label: 'Min Floor',
        type: 'number',
        required: true,
        defaultValue: 0,
    },
    maxFloor: {
        label: 'Max Floor',
        type: 'number',
        required: true,
        defaultValue: 100,
    },
    rate: {
        label: 'Rate',
        type: 'number',
        required: true,
        placeholder: 'e.g., 50.50',
    },
};
