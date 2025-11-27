import { useState, useEffect, useCallback, useMemo } from 'react';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import { Select, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { generate as uniqueId } from 'shortid';
import color from '@/utils/color';
import useLanguage from '@/locale/useLanguage';

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
}) => {
  const translate = useLanguage();
  const [selectOptions, setOptions] = useState([]);
  const [currentValue, setCurrentValue] = useState(undefined);
  const [hasError, setHasError] = useState(false);

  const navigate = useNavigate();

  const asyncList = useCallback(() => {
    if (!entity) {
      console.error('SelectAsync: entity is required');
      return Promise.resolve({ result: [] });
    }
    return request.list({ entity });
  }, [entity]);
  
  const { result, isLoading: fetchIsLoading, isSuccess, error } = useFetch(asyncList);
  
  useEffect(() => {
    try {
      if (isSuccess && result && Array.isArray(result)) {
        setOptions(result);
        setHasError(false);
      } else if (error) {
        console.error('Error loading options for SelectAsync:', error);
        setOptions([]);
        setHasError(true);
      } else if (!fetchIsLoading && !isSuccess) {
        // If not loading and not successful, might be an issue
        setOptions([]);
      }
    } catch (err) {
      console.error('Error in SelectAsync useEffect:', err);
      setOptions([]);
      setHasError(true);
    }
  }, [isSuccess, result, error, fetchIsLoading]);

  const labels = (optionField) => {
    if (!optionField) return '';
    try {
      return displayLabels.map((x) => optionField[x] || '').filter(Boolean).join(' ') || 'Unknown';
    } catch (err) {
      console.warn('Error generating label:', err);
      return 'Unknown';
    }
  };
  
  useEffect(() => {
    try {
      if (value !== undefined && value !== null) {
        // Handle both object and primitive values
        let val;
        if (typeof value === 'object' && value !== null) {
          val = value[outputValue] ?? value;
        } else {
          val = value;
        }
        // Only update if value actually changed to prevent infinite loops
        setCurrentValue(prev => {
          if (prev !== val) {
            return val;
          }
          return prev;
        });
      } else {
        // Reset if value is cleared
        setCurrentValue(prev => {
          if (prev !== undefined) {
            return undefined;
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Error setting value in SelectAsync:', err);
    }
  }, [value, outputValue]); // Removed currentValue from dependencies to prevent loops

  const handleSelectChange = useCallback((newValue) => {
    try {
      if (newValue === 'redirectURL') {
        navigate(urlToRedirect);
        return;
      }
      
      // newValue is already the selected value (projectId string in this case)
      // Don't try to extract outputValue from it - it's already the value we want
      const val = newValue;
      
      // Update local state
      setCurrentValue(val);
      
      // Call onChange - Ant Design Form will handle the state update
      // Wrap in try-catch to prevent crashes
      if (onChange) {
        try {
          onChange(val);
        } catch (onChangeErr) {
          console.error('Error in onChange callback:', onChangeErr);
          // Don't rethrow - just log the error
        }
      }
    } catch (err) {
      console.error('Error in handleSelectChange:', err);
      // Don't let errors crash the component - reset to undefined
      setCurrentValue(prev => prev); // Keep current value on error
    }
  }, [navigate, urlToRedirect, onChange]);

  const optionsList = () => {
    const list = [];

    // if (selectOptions.length === 0 && withRedirect) {
    //   const value = 'redirectURL';
    //   const label = `+ ${translate(redirectLabel)}`;
    //   list.push({ value, label });
    // }
    
    if (Array.isArray(selectOptions)) {
      selectOptions.forEach((optionField) => {
        if (!optionField) return;
        try {
          const value = optionField[outputValue] ?? optionField;
          const label = labels(optionField);
          const currentColor = optionField[outputValue]?.color ?? optionField?.color;
          const labelColor = color.find((x) => x.color === currentColor);
          list.push({ value, label, color: labelColor?.color });
        } catch (err) {
          console.warn('Error processing option:', err, optionField);
        }
      });
    }

    return list;
  };

  // Memoize options to prevent unnecessary re-renders
  const options = useMemo(() => {
    try {
      return optionsList();
    } catch (err) {
      console.error('Error generating options list:', err);
      return [];
    }
  }, [selectOptions, outputValue, displayLabels]);
  
  try {
    return (
      <Select
        loading={fetchIsLoading}
        disabled={fetchIsLoading}
        value={currentValue}
        onChange={handleSelectChange}
        placeholder={translate(placeholder)}
        notFoundContent={fetchIsLoading ? 'Loading...' : hasError ? 'Error loading options' : 'No options available'}
        allowClear
        getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
        dropdownMatchSelectWidth={false}
      >
        {Array.isArray(options) && options.length > 0 && options.map((option, index) => {
          if (!option || option.value === undefined || option.value === null) return null;
          // Use index in key to ensure uniqueness even if values are duplicated
          const optionKey = `${option.value}-${index}-${uniqueId()}`;
          return (
            <Select.Option key={optionKey} value={option.value}>
              <Tag bordered={false} color={option.color}>
                {option.label || 'Unknown'}
              </Tag>
            </Select.Option>
          );
        })}
        {withRedirect && (
          <Select.Option value={'redirectURL'}>{`+ ` + translate(redirectLabel)}</Select.Option>
        )}
      </Select>
    );
  } catch (err) {
    console.error('Error rendering SelectAsync:', err);
    // Return a safe fallback that won't crash
    return (
      <Select
        placeholder={translate(placeholder)}
        disabled
        notFoundContent="Error loading options"
        value={undefined}
      />
    );
  }
};

export default SelectAsync;
