import { useState, useEffect } from 'react';
import { Select, Tag } from 'antd';
import axios from 'axios';
import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
import { generate as uniqueId } from 'shortid';
import useLanguage from '@/locale/useLanguage';

const SelectAsyncByProject = ({ projectId, value, onChange, placeholder = 'Select Unit' }) => {
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
    if (!projectId) {
      setUnits([]);
      return;
    }

    const fetchUnits = async () => {
      setLoading(true);
      try {
        const auth = storePersist.get('auth');
        const headers = auth?.current?.token
          ? { Authorization: `Bearer ${auth.current.token}` }
          : {};

        const response = await axios.get(
          `${API_BASE_URL}units/byProject/${projectId}`,
          { 
            headers,
            withCredentials: true 
          }
        );

        if (response.data?.success && Array.isArray(response.data.result)) {
          setUnits(response.data.result);
        } else {
          setUnits([]);
        }
      } catch (error) {
        console.error('Error fetching units:', error);
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [projectId]);

  const handleChange = (newValue) => {
    setCurrentValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <Select
      loading={loading}
      disabled={!projectId || loading}
      value={currentValue}
      onChange={handleChange}
      placeholder={!projectId ? 'Please select a project first' : translate(placeholder)}
      notFoundContent={
        loading
          ? 'Loading...'
          : !projectId
          ? 'Please select a project first'
          : 'No units available for this project'
      }
      allowClear
      getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
      dropdownMatchSelectWidth={false}
    >
      {units.map((unit, index) => {
        const unitLabel = unit.unitNumber 
          ? (unit.towerOrWing ? `${unit.unitNumber} - ${unit.towerOrWing}` : unit.unitNumber)
          : 'Unknown Unit';
        const optionKey = `${unit._id}-${index}-${uniqueId()}`;
        
        return (
          <Select.Option key={optionKey} value={unit._id}>
            <Tag bordered={false}>{unitLabel}</Tag>
          </Select.Option>
        );
      })}
    </Select>
  );
};

export default SelectAsyncByProject;
