// frontend/src/pages/activities/config.js

export const fields = {
  // Project and Unit fields are handled by custom form in index.jsx
  projectCode: {
    disableForForm: true, // Handled by custom form
    disableForTable: true,
  },
  projectId: {
    disableForForm: true, // Handled by custom form
    disableForTable: true,
  },
  unitId: {
    disableForForm: true, // Handled by custom form
    disableForTable: true,
  },
  activityCode: {
    label: 'Activity Code',
    type: 'string',
    required: true,
    placeholder: 'e.g., ACT-001',
  },
  activityName: {
    label: 'Activity Name',
    type: 'string',
    required: true,
    placeholder: 'e.g., Excavation',
  },
  unit: {
    label: 'Unit of Measurement',
    type: 'string',
    required: true,
    placeholder: 'e.g., Cubic Meter, Square Meter, Hour',
  },
  defaultRate: {
    label: 'Default Rate',
    type: 'number',
    required: false,
    placeholder: 'e.g., 500.00',
  },
  category: {
    label: 'Category',
    type: 'string',
    required: false,
    placeholder: 'e.g., Earthwork, Concrete, Finishing',
  },
};
