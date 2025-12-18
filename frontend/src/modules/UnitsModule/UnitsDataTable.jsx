import React, { useEffect, useState } from "react";
import { request } from "@/request";

export default function UnitsDataTable() {
  const [units, setUnits] = useState([]);
  const [projectsMap, setProjectsMap] = useState({});

  useEffect(() => {
    // Fetch projects to map IDs to names
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

  useEffect(() => {
    request.list({ entity: "units" }).then((res) => {
      console.log("Units →", res);
      setUnits(res.result || []);
    });
  }, []);

  return (
    <div>
      <h2>Units List</h2>

      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Tower/Wing</th>
            <th>Units</th>
            <th>Type</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {units.length === 0 && (
            <tr><td colSpan="6">No Units Found</td></tr>
          )}

          {units.map((u) => (
            <tr key={u._id}>
              <td>{projectsMap[u.projectId] || u.projectId}</td>
              <td>{u.towerOrWing || '-'}</td>
              <td>{u.unitNumber}</td>
              <td>{u.unitType}</td>
              <td>{u.status}</td>
              <td>{u.totalAmount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
