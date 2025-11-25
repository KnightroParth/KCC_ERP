// frontend/src/pages/Customer/config.js

export const fields = {
  name: {
    label: "Project Name",
    type: "text",
    required: true,
  },
  stakeholderName: {
    label: "Client / Stakeholder",
    type: "text",
    required: true,
  },
  projectManagerId: {
    label: "Project Manager (User ID)",
    type: "text",
    required: true,
  },
  plannedStartDate: {
    label: "Planned Start Date",
    type: "date",
    required: true,
  },
  targetEndDate: {
    label: "Target End Date",
    type: "date",
    required: true,
  },
  budget: {
    label: "Total Approved Budget",
    type: "number",
    required: true,
  },
  scopeDescription: {
    label: "Scope / Description",
    type: "textarea",
    required: true,
  },
};