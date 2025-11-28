// frontend/src/pages/activities/config.js

export const fields = {
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
    label: 'Unit',
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
