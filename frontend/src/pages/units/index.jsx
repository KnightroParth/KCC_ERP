import CrudModule from "@/modules/CrudModule/CrudModule";
import DynamicForm from "@/forms/DynamicForm";
import { fields } from "./config";

export default function Units() {
  const entity = "units"; // ✅ this must match backend route name

  const searchConfig = {
    displayLabels: ["unitNumber", "tower", "project"],
    searchFields: "unitNumber,tower,project",
    outputValue: "unitNumber",
  };

  const deleteModalLabels = ["unitNumber"];

  const config = {
    entity,                  // ✅ required
    PANEL_TITLE: "Units",
    DATATABLE_TITLE: "Units List",
    ADD_NEW_ENTITY: "Add Unit",
    ENTITY_NAME: "Unit",
    fields,                  // ✅ from config.js
    searchConfig,            // ✅ FIX
    deleteModalLabels,       // ✅ FIX
  };

  return (
    <CrudModule
      config={config}
      createForm={<DynamicForm fields={fields} />}
      updateForm={<DynamicForm fields={fields} />}
    />
  );
}
