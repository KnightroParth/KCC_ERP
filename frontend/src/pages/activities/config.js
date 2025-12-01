// frontend/src/pages/activities/config.js

export const fields = {
  // These two are ONLY for the table view
  projectDisplay: {
    label: 'Project',
    type: 'string',
    disableForForm: true,
  },
  unitDisplay: {
    label: 'Unit',
    type: 'string',
    disableForForm: true,
  },

  // Real linkage fields – handled manually in index.jsx
  projectCode: {
    disableForForm: true,
    disableForTable: true,
  },
  projectId: {
    disableForForm: true,
    disableForTable: true,
  },
  unitId: {
    disableForForm: true,
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
    label: 'Unit Of Measurement',
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