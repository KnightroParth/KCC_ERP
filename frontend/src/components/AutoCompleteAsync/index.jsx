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
  size,
  style,
  dropdownMinWidth = 320,
  dropdownMatchSelectWidth = false,
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

  // --- FIX: Correctly handle Object vs ID values ---
  useEffect(() => {
    if (value) {
      const isObject = typeof value === 'object';
      const actualValue = (isObject && value[outputValue]) ? value[outputValue] : value;
      
      setCurrentValue(actualValue);

      // If it's an object, we have the label data. Add it to options immediately.
      if (isObject) {
        setOptions((prevOptions) => {
          const exists = prevOptions.some(opt => (opt[outputValue] || opt) === actualValue);
          if (!exists) return [value, ...prevOptions];
          return prevOptions;
        });
      }
    } else {
      setCurrentValue(undefined);
    }
  }, [value, outputValue]);

  // --- FIX: Auto-Fetch Data if only ID is provided ---
  useEffect(() => {
    let isActive = true;
    // Only fetch if value is a string/number (ID) AND we don't have it in our options list
    if (value && typeof value !== 'object' && !selectOptions.some(opt => opt[outputValue] === value)) {
      setSearching(true);
      request.read({ entity, id: value }).then(response => {
        if (isActive && response.success && response.result) {
          setOptions(prev => {
             // Add the fetched item to options so the Label appears
             if(!prev.find(opt => opt[outputValue] === response.result[outputValue])) {
               return [response.result, ...prev];
             }
             return prev;
          });
        }
        if(isActive) setSearching(false);
      });
    }
    return () => { isActive = false; };
  }, [value, entity, outputValue]);

  return (
    <Select
      size={size}
      style={{ minWidth: '100%', ...style }}
      dropdownStyle={{ minWidth: dropdownMinWidth }}
      dropdownMatchSelectWidth={dropdownMatchSelectWidth}
      loading={isLoading || searching}
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
      optionLabelProp="label"
    >
      {selectOptions.map((optionField) => {
        const label = labels(optionField);
        return (
          <Select.Option
            key={optionField[outputValue] || optionField}
            value={optionField[outputValue] || optionField}
            label={label}
          >
            <span style={{ whiteSpace: 'nowrap' }} title={label}>
              {label}
            </span>
          </Select.Option>
        );
      })}
      {withRedirect && <Select.Option value={addNewValue.value}>{addNewValue.label}</Select.Option>}
    </Select>
  );
}