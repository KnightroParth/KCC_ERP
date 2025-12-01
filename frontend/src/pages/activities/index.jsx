// frontend/src/pages/activities/index.jsx
import React from "react";
import { Form } from "antd";
import CrudModule from "@/modules/CrudModule/CrudModule";
import DynamicForm from "@/forms/DynamicForm";
import SelectAsync from "@/components/SelectAsync";
import SelectAsyncByProject from "@/components/SelectAsyncByProject";
import useLanguage from "@/locale/useLanguage";
import { fields } from "./config";

function ProjectSelect({ value, onChange, form, ...props }) {
  const [projects, setProjects] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const { request } = await import("@/request");
      const res = await request.list({ entity: "project" });
      if (res?.result) setProjects(res.result);
    })();
  }, []);

  const handleChange = (projectCode) => {
    const selected = projects.find((p) => p.projectCode === projectCode);
    if (selected) form.setFieldValue("projectId", selected._id);
    onChange?.(projectCode);
  };

  return (
    <SelectAsync
      entity="project"
      displayLabels={["name", "projectCode"]}
      outputValue="projectCode"
      placeholder="Select Project"
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
}

function ActivitiesForm({ fields: fieldConfig, isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();

  return (
    <>
      <Form.Item name="projectId" hidden>
        <input type="hidden" />
      </Form.Item>

      <Form.Item
        label={translate("Project")}
        name="projectCode"
        rules={[{ required: true, message: "Please select a project" }]}
      >
        <ProjectSelect form={form} />
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(p, c) => p.projectCode !== c.projectCode}>
        {({ getFieldValue }) => (
          <Form.Item
            label={translate("Unit")}
            name="unitId"
            rules={[{ required: true, message: "Please select a unit" }]}
          >
            <SelectAsyncByProject projectCode={getFieldValue("projectCode")} />
          </Form.Item>
        )}
      </Form.Item>

      <DynamicForm fields={fieldConfig} isUpdateForm={isUpdateForm} />
    </>
  );
}

export default function Activities() {
  const entity = "activities";

  const Labels = {
    PANEL_TITLE: "Activities",
    DATATABLE_TITLE: "Activities List",
    ADD_NEW_ENTITY: "Add New Activity",
    ENTITY_NAME: "Activity",
  };

  const searchConfig = {
    displayLabels: ["activityCode", "activityName"],
    searchFields: "activityCode,activityName,category",
  };

  const deleteModalLabels = ["activityCode", "activityName"];

  const tableActions = {
    showEdit: true,
    showDelete: true,
    position: "right",
  };

  const dataTableColumns = [
    {
      title: "Project",
      key: "project",
      render: (_, record) => {
        const p = record?.projectId;
        if (!p) return "-";
        return p.name && p.projectCode ? `${p.name} (${p.projectCode})` : p.name || p.projectCode || "-";
      },
    },
    {
      title: "Unit",
      key: "unit",
      render: (_, record) => {
        const u = record?.unitId;
        if (!u) return "-";
        return u.towerOrWing ? `${u.unitNumber} - ${u.towerOrWing}` : u.unitNumber;
      },
    },
    { title: "Activity Code", dataIndex: "activityCode" },
    { title: "Activity Name", dataIndex: "activityName" },
    { title: "Unit Of Measurement", dataIndex: "unit" },
    {
      title: "Default Rate",
      dataIndex: "defaultRate",
      render: (v) => (v ? `₹${v}` : "-"),
    },
    { title: "Category", dataIndex: "category" },
  ];

  const { projectCode: _1, unitId: _2, ...remainingFields } = fields;

  const config = {
    entity,
    ...Labels,
    fields: remainingFields,
    searchConfig,
    deleteModalLabels,
    tableActions,
    dataTableColumns,
  };

  return (
    <CrudModule
      createForm={<ActivitiesForm fields={remainingFields} />}
      updateForm={<ActivitiesForm fields={remainingFields} isUpdateForm />}
      config={config}
    />
  );
}