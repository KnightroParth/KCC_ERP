import CrudModule from "@/modules/CrudModule/CrudModule";
import DynamicForm from "@/forms/DynamicForm";
import { fields } from "./config";

export default function ProjectModule() {
  const entity = "project"; // ✅ backend model name must match

  const searchConfig = {
    displayLabels: ["name"],
    searchFields: "name",
    outputValue: "name",
  };

  const deleteModalLabels = ["name"];

  const config = {
    entity,
    PANEL_TITLE: "Projects",
    DATATABLE_TITLE: "Project List",
    ADD_NEW_ENTITY: "Add New Project",
    ENTITY_NAME: "Project",
    fields,
    searchConfig,
    deleteModalLabels,
  };

  return (
    <CrudModule
      config={config}
      createForm={<DynamicForm fields={fields} />}
      updateForm={<DynamicForm fields={fields} />}
    />
  );
}
