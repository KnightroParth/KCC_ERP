// frontend/src/pages/Unit/config.js

export const fields = {
  projectId: {
    label: 'Project',
    type: 'async',
    entity: 'project',
    displayLabels: ['name', 'projectId'],
    searchFields: 'name,projectId',
    outputValue: 'projectId',
    required: true,
  },
  unitNumber: {
    label: 'Unit Number',
    type: 'string',
    required: true,
    placeholder: 'e.g., A-502',
  },
  buildingName: {
    label: 'Building Name',
    type: 'string',
    required: true,
    placeholder: 'e.g., Tower B',
  },
  floorNumber: {
    label: 'Floor Number',
    type: 'string',
    required: true,
    placeholder: 'e.g., 5',
  },
  unitType: {
    label: 'Unit Type',
    type: 'string',
    required: true,
    placeholder: 'e.g., 2BHK / Office / Shop',
  },
  areaSqft: {
    label: 'Area (Sq Ft)',
    type: 'number',
    required: true,
    placeholder: 'e.g., 1220',
  },
  basePrice: {
    label: 'Base Price',
    type: 'number',
    required: true,
    placeholder: 'Base price',
  },
  status: {
    label: 'Status',
    type: 'select',
    required: true,
    defaultValue: 'Available',
    options: [
      { label: 'Available', value: 'Available' },
      { label: 'Booked', value: 'Booked' },
      { label: 'Sold', value: 'Sold' },
    ],
  },
  buyerName: {
    label: 'Buyer Name',
    type: 'string',
    required: false,
    placeholder: 'Buyer name',
    disableForTable: true, // Hide from table, only show in form
    showWhen: {
      field: 'status',
      value: ['Booked', 'Sold'],
    },
  },
};

