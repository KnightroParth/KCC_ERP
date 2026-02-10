import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Card, Select } from 'antd';
import useFetch from '@/hooks/useFetch';
import { request } from '@/request';
import { erp } from '@/redux/erp/actions';

export default function SelectProject() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const fetchProjects = () =>
    request.list({ entity: 'project', options: { page: 1, items: 500 } });
  const { result: projectsRaw, isLoading, isSuccess } = useFetch(fetchProjects);

  const projects = useMemo(() => {
    const list = Array.isArray(projectsRaw) ? projectsRaw : projectsRaw?.result ?? [];
    return list;
  }, [projectsRaw]);

  const options = useMemo(
    () =>
      projects.map((p) => ({
        value: p._id,
        label: p.projectCode ? `${p.name} (${p.projectCode})` : p.name,
        project: p,
      })),
    [projects]
  );

  const handleSelect = (projectId) => {
    const project = projects.find((p) => p._id === projectId);
    if (project) {
      dispatch(erp.setCurrentProject(project));
      navigate('/', { replace: true });
    }
  };

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        title="Select Project"
        style={{ width: '100%', maxWidth: 480 }}
        bodyStyle={{ padding: 24 }}
      >
        <p style={{ marginBottom: 16, color: '#666' }}>
          Choose a project to continue. All data entry will be scoped to this project until you change it.
        </p>
        <Select
          style={{ width: '100%' }}
          placeholder="Select a project..."
          loading={isLoading}
          showSearch
          filterOption={(input, opt) =>
            (opt?.label ?? '').toLowerCase().includes((input || '').toLowerCase())
          }
          options={options}
          onChange={handleSelect}
          notFoundContent={isSuccess && projects.length === 0 ? 'No projects available' : 'Loading...'}
          size="large"
          getPopupContainer={(node) => node.parentElement || document.body}
        />
      </Card>
    </div>
  );
}
