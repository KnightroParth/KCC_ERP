import { useState, useEffect } from 'react';
import { Select, Tag } from 'antd';
import axios from 'axios';
import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
import { generate as uniqueId } from 'shortid';
import useLanguage from '@/locale/useLanguage';

const SelectAsyncByProject = ({ projectCode, projectId, value, onChange, placeholder = 'Select Unit' }) => {
  const translate = useLanguage();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setCurrentValue(value);
    }
  }, [value]);

  useEffect(() => {
    const identifier = projectCode || projectId;

    if (!identifier) {
      setUnits([]);
      return;
    }

    const fetchUnits = async () => {
      setLoading(true);
      try {
        const token = storePersist.get('auth')?.current?.token;

        if (!token) {
          console.warn("Missing auth token");
          setUnits([]);
          return;
        }

        // Always send Bearer token — no withCredentials
        const headers = { Authorization: `Bearer ${token}` };

        const endpoint = projectCode
          ? `${API_BASE_URL}units/byProjectCode/${projectCode}`
          : `${API_BASE_URL}units/byProject/${projectId}`;

        const response = await axios.get(endpoint, { headers });

        const data =
          Array.isArray(response.data) ? response.data :
          Array.isArray(response.data?.result) ? response.data.result :
          [];

        setUnits(data);
      } catch (error) {
        console.error('Error fetching units:', error);
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [projectCode, projectId]);

  const handleChange = (newValue) => {
    setCurrentValue(newValue);
    if (onChange) onChange(newValue);
  };

  const hasProject = projectCode || projectId;

  return (
    <Select
      loading={loading}
      disabled={!hasProject || loading}
      value={currentValue}
      onChange={handleChange}
      placeholder={!hasProject ? 'Please select a project first' : translate(placeholder)}
      notFoundContent={
        loading
          ? 'Loading...'
          : !hasProject
          ? 'Please select a project first'
          : 'No units available for this project'
      }
      allowClear
      getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
      dropdownMatchSelectWidth={false}
    >
      {units.map((unit, index) => {
        const unitLabel = unit.unitNumber
          ? unit.towerOrWing
            ? `${unit.unitNumber} - ${unit.towerOrWing}`
            : unit.unitNumber
          : 'Unknown Unit';

        return (
          <Select.Option key={`${unit._id}-${index}-${uniqueId()}`} value={unit._id}>
            <Tag bordered={false}>{unitLabel}</Tag>
          </Select.Option>
        );
      })}
    </Select>
  );
};

export default SelectAsyncByProject;