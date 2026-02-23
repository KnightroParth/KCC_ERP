// frontend/src/pages/Customer/config.js

export const fields = {
  projectCode: {
    label: 'Project Code',
    type: 'string',
    disableForForm: true,
    disableForUpdate: true,
  },
  name: {
    label: 'Project Name',
    type: 'string',
    required: true,
  },
  stakeholderName: {
    label: 'Client / Stakeholder',
    type: 'string',
    required: true,
  },
  projectSanctionStatus: {
    label: 'Project Sanction Status',
    type: 'select',
    options: [
      { label: 'Pending', value: 'Pending', color: 'gold' },
      { label: 'Approved', value: 'Approved', color: 'green' },
      { label: 'N/A', value: 'N/A', color: 'blue' },
      { label: 'Other', value: 'Other', color: 'purple' },
    ],
    renderAsTag: true,
  },
  reraRegistration: {
    label: 'RERA Registration',
    type: 'string',
  },
  projectManagerId: {
    label: 'Project Manager (User ID)',
    type: 'string',
    required: true,
  },
  address: {
    label: 'Project Address',
    type: 'textarea',
  },
  plannedStartDate: {
    label: 'Planned Start Date',
    type: 'date',
    required: true,
  },
  targetEndDate: {
    label: 'Target End Date',
    type: 'date',
    required: true,
  },
  budget: {
    label: 'Total Approved Budget',
    type: 'number',
    required: true,
  },
  scopeDescription: {
    label: 'Scope / Description',
    type: 'textarea',
    required: true,
  },
};