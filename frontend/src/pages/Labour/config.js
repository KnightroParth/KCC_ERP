// frontend/src/pages/Labour/config.js

export const fields = {
  name: {
    label: 'Labour Name',
    type: 'string',
    required: true,
    placeholder: 'e.g., Chetan Chincholkar',
  },
  type: {
    label: 'Type',
    type: 'select',
    required: true,
    defaultValue: 'Unskilled',
    options: [
      { label: 'Skilled', value: 'Skilled' },
      { label: 'Unskilled', value: 'Unskilled' },
    ],
  },
  gender: {
    label: 'Gender',
    type: 'select',
    required: true,
    defaultValue: 'Male',
    options: [
      { label: 'Male', value: 'Male' },
      { label: 'Female', value: 'Female' },
    ],
  },
  wages: {
    label: 'Wages',
    type: 'number',
    required: true,
    placeholder: 'e.g., 500',
  },
  phone: {
    label: 'Mobile Number',
    type: 'string',
    required: false,
    placeholder: 'e.g., 9876543210',
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
