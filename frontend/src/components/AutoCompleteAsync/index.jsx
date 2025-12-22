import { useState, useEffect, useRef } from 'react';
import { request } from '@/request';
import useOnFetch from '@/hooks/useOnFetch';
import useDebounce from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { Select, Empty } from 'antd';
import useLanguage from '@/locale/useLanguage';

export default function AutoCompleteAsync({
  entity,
  displayLabels,
  searchFields,
  outputValue = '_id',
  redirectLabel = 'Add New',
  withRedirect = false,
  urlToRedirect = '/',
  value, 
  onChange, 
}) {
  const translate = useLanguage();

  const addNewValue = { value: 'redirectURL', label: `+ ${translate(redirectLabel)}` };

  const [selectOptions, setOptions] = useState([]);
  const [currentValue, setCurrentValue] = useState(undefined);

  const isSearching = useRef(false);
  const [searching, setSearching] = useState(false);
  const [valToSearch, setValToSearch] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  const navigate = useNavigate();

  const labels = (optionField) => {
    return displayLabels.map((x) => optionField[x]).join(' ');
  };

  const handleSelectChange = (val) => {
    const selectedOption = selectOptions.find(opt => (opt[outputValue] || opt) === val);
    
    if (onChange) {
      // Pass the ID and the Full Object back to the form
      onChange(val, selectedOption);
    }
    if (val === 'redirectURL' && withRedirect) {
      navigate(urlToRedirect);
    }
  };

  const [, cancel] = useDebounce(
    () => {
      setDebouncedValue(valToSearch);
    },
    500,
    [valToSearch]
  );

  const asyncSearch = async (options) => {
    return await request.search({ entity, options });
  };

  let { onFetch, result, isSuccess, isLoading } = useOnFetch();

  useEffect(() => {
    const options = {
      q: debouncedValue,
      fields: searchFields,
    };
    if (debouncedValue) {
        const callback = asyncSearch(options);
        onFetch(callback);
    }

    return () => {
      cancel();
    };
  }, [debouncedValue]);

  const onSearch = (searchText) => {
    isSearching.current = true;
    setSearching(true);
    setValToSearch(searchText);
  };

  useEffect(() => {
    if (isSuccess) {
      setOptions(result);
    } else {
      setSearching(false);
    }
  }, [isSuccess, result]);

  // --- CRITICAL FIX: Handle Value Updates Properly ---
  useEffect(() => {
    if (value) {
      // 1. Extract the actual ID string for the Select component
      const val = (typeof value === 'object' && value[outputValue]) ? value[outputValue] : value;
      setCurrentValue(val);

      // 2. If 'value' is an object (contains name, etc.), ensure it's in the options list
      // This fixes the "Blank" display issue when loading data.
      if (typeof value === 'object') {
        setOptions((prevOptions) => {
          // Prevent duplicates
          const exists = prevOptions.some(opt => 
             (opt[outputValue] || opt) === (value[outputValue] || value)
          );
          if (!exists) {
            return [value, ...prevOptions];
          }
          return prevOptions;
        });
      }
    } else {
      setCurrentValue(undefined);
    }
  }, [value, outputValue]);

  return (
    <Select
      loading={isLoading}
      showSearch
      allowClear
      placeholder={translate('Search')}
      defaultActiveFirstOption={false}
      filterOption={false}
      notFoundContent={searching ? '... Searching' : <Empty />}
      value={currentValue}
      onSearch={onSearch}
      onClear={() => {
        setSearching(false);
        setValToSearch(''); 
      }}
      onChange={handleSelectChange}
      style={{ minWidth: '180px', width: '100%' }}
    >
      {selectOptions.map((optionField) => (
        <Select.Option
          key={optionField[outputValue] || optionField}
          value={optionField[outputValue] || optionField}
        >
          {labels(optionField)}
        </Select.Option>
      ))}
      {withRedirect && <Select.Option value={addNewValue.value}>{addNewValue.label}</Select.Option>}
    </Select>
  );
}