// frontend/src/pages/Vendor/config.js

export const fields = {
  name: {
    label: 'Name',
    type: 'string',
    required: true,
    placeholder: 'Vendor name',
  },
  phone: {
    label: 'Phone',
    type: 'string',
    required: true,
    placeholder: 'Phone number',
  },
  email: {
    label: 'Email',
    type: 'string',
    required: false,
    placeholder: 'Email address',
  },
  address: {
    label: 'Address',
    type: 'string',
    required: false,
    placeholder: 'Address',
  },
};
