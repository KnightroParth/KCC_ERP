export const fields = {
  name: {
    label: 'Name',
    type: 'string',
    required: true,
    placeholder: 'Supplier name',
  },
  contactPerson: {
    label: 'Contact Person',
    type: 'string',
    required: false,
    placeholder: 'Contact person name',
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
    type: 'textarea',
    required: false,
    placeholder: 'Full address',
  },
  gstNumber: {
    label: 'GST Number',
    type: 'string',
    required: false,
    placeholder: 'GST number',
  },
  paymentTerms: {
    label: 'Payment Terms',
    type: 'select',
    required: false,
    options: [
      { label: 'Advance', value: 'Advance' },
      { label: 'Net 15', value: 'Net 15' },
      { label: 'Net 30', value: 'Net 30' },
      { label: 'On Delivery', value: 'On Delivery' },
    ],
  },
  taxId: {
    label: 'Tax ID',
    type: 'string',
    required: false,
    placeholder: 'Tax identification number',
  },
  website: {
    label: 'Website',
    type: 'string',
    required: false,
    placeholder: 'Website URL',
  },
  notes: {
    label: 'Notes',
    type: 'textarea',
    required: false,
    placeholder: 'Additional notes',
  },
};
