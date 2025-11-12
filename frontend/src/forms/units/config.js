// frontend/src/forms/units/config.js

import { request } from "@/request";

export const fields = {
  projectId: {
    type: "select",
    label: "Project",
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
    label: "Tower / Wing",
    required: false,
  },

  floor: {
    type: "number",
    label: "Floor No",
    required: false,
  },

  unitNumber: {
    type: "text",
    label: "Unit Number",
    required: true,
  },

  saleableArea: {
    type: "number",
    label: "Total Area (Sq Ft)",
    required: false,
  },

  ratePerSqft: {
    type: "number",
    label: "Rate per Sq Ft",
    required: true,
  },

  status: {
    type: "select",
    label: "Status",
    required: true,
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
    hideOnCreate: true, // Hide if Available
  },
};
