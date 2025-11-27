import CrudModule from "@/modules/CrudModule/CrudModule";
import DynamicForm from "@/forms/DynamicForm";
import { fields } from "./config";

export default function ProjectModule() {
  const entity = "project"; // ✅ backend model name must match

  const searchConfig = {
    displayLabels: ["name", "projectId"],
    searchFields: "name,projectId,stakeholderName",
  };

  const deleteModalLabels = ["name", "projectId"];

  // 🔥 REQUIRED for showing Edit + Delete buttons in list
  const tableActions = {
    showEdit: true,
    showDelete: true,
    position: 'right',
  };

  const config = {
    entity,
    PANEL_TITLE: "Projects",
    DATATABLE_TITLE: "Project List",
    ADD_NEW_ENTITY: "Add New Project",
    ENTITY_NAME: "Project",
    fields,
    searchConfig,
    deleteModalLabels,
    tableActions,   // 👈 enables Edit + Delete after refresh
  };

  return (
    <CrudModule
      config={config}
      createForm={<DynamicForm fields={fields} />}
      updateForm={<DynamicForm fields={fields} isUpdateForm={true} />}
    />
  );
}
