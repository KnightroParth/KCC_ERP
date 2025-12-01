// frontend/src/pages/activities/config.js

export const fields = {
  projectId: {
    label: 'Project',
    type: 'async',
    entity: 'project',
    displayLabels: ['name', 'projectCode'],
    outputValue: '_id',
    required: true,
    placeholder: 'Select Project',
  },
  unitId: {
    label: 'Unit',
    type: 'asyncDependent', // Custom type for dependent select
    dependsOn: 'projectId',
    required: true,
    placeholder: 'Select Unit',
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
