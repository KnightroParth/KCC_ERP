// frontend/src/forms/units/config.js

import { request } from "@/request";

export const fields = {
  projectId: {
    type: "select",
    label: "Project Name",
    required: true,
    // populating options dynamically via API
    options: async () => {
      const { data } = await request.list({ entity: "client" }); // Client = Project
      return data.map((project) => ({
        label: project.name,
        value: project._id,
      }));
    },
  },

  towerOrWing: {
    type: "text",
    label: "Building Name",
    required: false,
  },

  floor: {
    type: "number",
    label: "Floor No",
    required: false,
    disableForTable: true,
  },

  unitNumber: {
    type: "number",
    label: "Units",
    required: true,
    placeholder: "Enter count of units/flats",
  },

  unitType: {
    type: "select",
    label: "Unit Type",
    required: true,
    options: [
      { label: "1BHK", value: "1BHK" },
      { label: "2BHK", value: "2BHK" },
      { label: "3BHK", value: "3BHK" },
      { label: "Duplex", value: "Duplex" },
      { label: "Warehouse", value: "Warehouse" },
      { label: "Penthouse", value: "Penthouse" },
      { label: "Other", value: "Other" },
    ],
  },

  saleableArea: {
    type: "number",
    label: "Area (Sq Mtr)",
    required: false,
  },

  ratePerSqft: {
    type: "number",
    label: "Base Price",
    required: true,
    disableForTable: true,
  },

  status: {
    type: "select",
    label: "Status",
    required: true,
    initialValue: "Available",
    options: [
      { label: "Available", value: "Available" },
      { label: "Sold", value: "Sold" },
      { label: "Blocked", value: "Blocked" },
    ],
  },

  ownerName: {
    type: "text",
    label: "Owner Name",
    required: false,
    hideOnCreate: true,
    disableForTable: true,
  },

  totalAmount: {
    type: "currency",
    label: "Total Price",
    disableForForm: true,
  },
};
