// frontend/src/pages/Labour/config.js

export const fields = {
    name: {
      label: 'Name',
      type: 'string',
      required: true,
      placeholder: 'e.g., Chetan Chincholkar',
    },
    trade: {
      label: 'Trade',
      type: 'string',
      required: true,
      placeholder: 'e.g., Electrician, Mason, Helper',
    },
    labourType: {
      label: 'Designation / Labour Type',
      type: 'string',
      required: true,
      placeholder: 'e.g., Senior Engineer, Site Supervisor, Electrician',
    },
    type: {
      label: 'Type',
      type: 'select',
      required: true,
      defaultValue: 'Labours',
      options: [
        { label: 'Contractors', value: 'Contractors' },
        { label: 'Labours', value: 'Labours' },
        { label: 'Supervisors', value: 'Supervisors' },
        { label: 'Site Incharge', value: 'Site Incharge' },
      ],
    },
    status: {
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'Active',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
    },
  };
  