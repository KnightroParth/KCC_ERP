export const fields = {
  projectCode: {
    label: 'Project Code',
    type: 'string',
    width: 220,
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
    type: 'tag',
    renderAsTag: true,
    color: 'blue',
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
