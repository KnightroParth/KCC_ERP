import { useState, useEffect, useCallback, useMemo } from 'react';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import { Select, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { generate as uniqueId } from 'shortid';
import color from '@/utils/color';
import useLanguage from '@/locale/useLanguage';
import useDebounce from '@/hooks/useDebounce'; // Import debounce

const SelectAsync = ({
  entity,
  displayLabels = ['name'],
  outputValue = '_id',
  redirectLabel = '',
  withRedirect = false,
  urlToRedirect = '/',
  placeholder = 'select',
  value,
  onChange,
  searchFields,
  formatter,
}) => {
  const translate = useLanguage();
  const [selectOptions, setOptions] = useState([]);
  const [currentValue, setCurrentValue] = useState(undefined);
  const [hasError, setHasError] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState(''); // Store debounced value

  const navigate = useNavigate();

  // DEBOUNCE: Update debouncedSearchValue 500ms after searchValue changes
  useDebounce(
    () => {
      setDebouncedSearchValue(searchValue);
    },
    500,
    [searchValue]
  );

  // Fetch data function - depends on DEBOUNCED value now
  const fetchData = useCallback(() => {
    if (!entity) {
      return Promise.resolve({ result: [] });
    }
    
    const options = {};
    
    // Use debouncedSearchValue instead of raw searchValue
    if (searchFields && debouncedSearchValue && debouncedSearchValue.trim()) {
      options.fields = searchFields;
      options.q = debouncedSearchValue.trim();
      return request.search({ entity, options });
    }
    
    return request.list({ entity, options });
  }, [entity, searchFields, debouncedSearchValue]); // Depend on debounced value
  
  const { result, isLoading: fetchIsLoading, isSuccess, error } = useFetch(fetchData);
  
  useEffect(() => {
    if (isSuccess && result && Array.isArray(result)) {
      setOptions(result);
      setHasError(false);
    } else if (error) {
      setOptions([]);
      setHasError(true);
    } else if (!fetchIsLoading && !isSuccess) {
      setOptions([]);
    }
  }, [isSuccess, result, error, fetchIsLoading]);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      let val;
      if (typeof value === 'object' && value !== null) {
        val = value[outputValue] ?? value;
      } else {
        val = value;
      }
      setCurrentValue(prev => prev !== val ? val : prev);
    } else {
      setCurrentValue(prev => prev !== undefined ? undefined : prev);
    }
  }, [value, outputValue]);

  const handleSelectChange = useCallback((newValue) => {
    if (newValue === 'redirectURL') {
      navigate(urlToRedirect);
      return;
    }
    const val = newValue;
    setCurrentValue(val);
    if (onChange) onChange(val);
  }, [navigate, urlToRedirect, onChange]);

  const handleSearch = useCallback((searchText) => {
    setSearchValue(searchText || '');
  }, []);

  const options = useMemo(() => {
    if (!Array.isArray(selectOptions)) return [];
    
    const labels = (optionField) => {
      if (!optionField) return '';
      // If custom formatter is provided, use it
      if (formatter && typeof formatter === 'function') {
        return formatter(optionField) || 'Unknown';
      }
      // Otherwise use default displayLabels logic
      return displayLabels.map((x) => optionField[x] || '').filter(Boolean).join(' ') || 'Unknown';
    };
    
    return selectOptions.map((optionField) => {
      const value = optionField[outputValue] ?? optionField;
      const label = labels(optionField);
      const currentColor = optionField[outputValue]?.color ?? optionField?.color;
      const labelColor = color.find((x) => x.color === currentColor);
      return { value, label, color: labelColor?.color };
    });
  }, [selectOptions, outputValue, displayLabels, formatter]);
  
  return (
    <Select
      loading={fetchIsLoading}
      // disabled={fetchIsLoading} // Commented out to allow typing while loading
      value={currentValue}
      onChange={handleSelectChange}
      onSearch={searchFields ? handleSearch : undefined}
      showSearch={!!searchFields}
      filterOption={false}
      placeholder={translate(placeholder)}
      notFoundContent={fetchIsLoading ? 'Loading...' : 'No options available'}
      allowClear
      getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
    >
      {options.map((option, index) => {
        // ✅ FIX: Use a stable key based on the value, NOT uniqueId()
        // uniqueId() creates a new key every render, forcing React to destroy/recreate the option
        const optionKey = `${option.value}`; 
        return (
          <Select.Option key={optionKey} value={option.value}>
            <Tag bordered={false} color={option.color}>
              {option.label}
            </Tag>
          </Select.Option>
        );
      })}
      {withRedirect && (
        <Select.Option value={'redirectURL'}>{`+ ` + translate(redirectLabel)}</Select.Option>
      )}
    </Select>
  );
};

export default SelectAsync;