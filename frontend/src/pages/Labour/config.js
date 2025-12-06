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
      label: 'Labour Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Skilled', value: 'Skilled' },
        { label: 'Semi-Skilled', value: 'Semi-Skilled' },
        { label: 'Unskilled', value: 'Unskilled' },
      ],
    },
    vendorType: {
      label: 'Vendor Type',
      type: 'select',
      required: true,
      options: [
        { label: 'My Labour', value: 'My Labour' },
        { label: 'Vendor Labour', value: 'Vendor Labour' },
      ],
    },
    helpersCount: {
      label: 'Helpers Count',
      type: 'number',
      required: false,
      defaultValue: 0,
      placeholder: 'Number of helpers',
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
  