import React, { useEffect, useState } from "react";
import CrudModule from "@/modules/CrudModule/CrudModule";
import DynamicForm from "@/forms/DynamicForm";
import { fields } from "@/forms/units/config";
import { request } from "@/request";

export default function Units() {
  const entity = "units";
  const [projectsMap, setProjectsMap] = useState({});

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await request.list({ entity: "client" }); // Client = Project
      const map = {};
      if (data) {
        data.forEach((p) => {
          map[p._id] = p.name;
        });
      }
      setProjectsMap(map);
    };
    fetchProjects();
  }, []);

  // Create fields with custom render for projectId
  const unitFields = { ...fields };
  unitFields.projectId = {
    ...unitFields.projectId,
    render: (value) => projectsMap[value] || value,
  };

  const config = {
    entity,
    PANEL_TITLE: "Units",
    DATATABLE_TITLE: "Units List",
    ADD_NEW_ENTITY: "Add New Unit",
    ENTITY_NAME: "Unit",
    fields: unitFields,
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
      updateForm={<DynamicForm fields={fields} isUpdateForm={true} />}
    />
  );
}
