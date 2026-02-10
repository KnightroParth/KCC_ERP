import React from 'react';
import { Input } from 'antd';
import { useSelector } from 'react-redux';
import { selectCurrentProject } from '@/redux/erp/selectors';

/**
 * Read-only display of current project name. Used as Form.Item child when
 * project is locked to session context (selected at login). Receives value (id)
 * from Form but displays project name from Redux; form keeps the id for submit.
 */
export default function LockedProjectInput({ value, ...rest }) {
  const currentProject = useSelector(selectCurrentProject);
  const display =
    currentProject && (currentProject.name || currentProject.projectCode)
      ? (currentProject.projectCode
          ? `${currentProject.name || ''} (${currentProject.projectCode})`
          : currentProject.name)
      : value;
  return (
    <Input
      {...rest}
      value={display}
      readOnly
      disabled
      style={{ color: 'rgba(0,0,0,0.88)', cursor: 'not-allowed' }}
    />
  );
}
