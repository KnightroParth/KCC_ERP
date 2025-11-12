import CrudModule from "@/modules/CrudModule/CrudModule";
import DynamicForm from "@/forms/DynamicForm";

// ✅ Use config we created
import { fields } from "@/forms/units/config";

export default function Units() {
  const entity = "units";

  const config = {
    entity,
    PANEL_TITLE: "Units",
    DATATABLE_TITLE: "Units List",
    ADD_NEW_ENTITY: "Add Unit",
    ENTITY_NAME: "Unit",
    fields,
    searchConfig: {
      displayLabels: ["unitNumber", "towerOrWing"],
      searchFields: "unitNumber,towerOrWing",
      outputValue: "unitNumber",
    },
    deleteModalLabels: ["unitNumber"],
  };

  return (
    <CrudModule
      config={config}
      createForm={<DynamicForm fields={fields} />}
      updateForm={<DynamicForm fields={fields} />}
    />
  );
}
