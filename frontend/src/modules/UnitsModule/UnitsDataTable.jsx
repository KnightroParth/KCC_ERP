import React, { useEffect, useState } from "react";
import { request } from "@/request";

export default function UnitsDataTable() {
  const [units, setUnits] = useState([]);

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
            <th>Project</th>
            <th>Unit Number</th>
            <th>Type</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {units.length === 0 && (
            <tr><td colSpan="5">No Units Found</td></tr>
          )}

          {units.map((u) => (
            <tr key={u._id}>
              <td>{u.projectId?.name}</td>
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
