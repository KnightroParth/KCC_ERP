import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { useCrudContext } from '@/context/crud';
import { selectCreatedItem } from '@/redux/crud/selectors';

import useLanguage from '@/locale/useLanguage';

import { Button, Form, message } from 'antd';
import Loading from '@/components/Loading';

export default function CreateForm({ config, formElements, withUpload = false }) {
  let { entity } = config;
  const dispatch = useDispatch();
  const { isLoading, isSuccess } = useSelector(selectCreatedItem);
  const { crudContextAction } = useCrudContext();
  const { panel, collapsedBox, readBox } = crudContextAction;
  const [form] = Form.useForm();
  const translate = useLanguage();
  const onSubmit = async (fieldsValue) => {
    // Manually trim values before submission

    if (fieldsValue.file && withUpload) {
      fieldsValue.file = fieldsValue.file[0].originFileObj;
    }

    // Ensure material price (rate) is sent as number for inventory/material
    if (entity === 'inventory/material' && fieldsValue.price !== undefined) {
      fieldsValue.price = Number(fieldsValue.price) || 0;
    }

    // Filter out items with zero or invalid quantities for inventory transactions
    if (entity === 'inventory/transaction') {
      // Check if items field exists and is an array
      if (!fieldsValue.items) {
        message.error('Please select a Purchase Order to load items.');
        return Promise.reject(new Error('No items field in form'));
      }

      if (!Array.isArray(fieldsValue.items)) {
        message.error('Items data is invalid. Please reload the Purchase Order.');
        return Promise.reject(new Error('Items is not an array'));
      }

      if (fieldsValue.items.length === 0) {
        message.error('No items available to receive. Please select a Purchase Order with pending items.');
        return Promise.reject(new Error('No items to receive'));
      }

      // Filter valid items
      const validItems = fieldsValue.items.filter(item => {
        if (!item) return false;
        if (!item.material) return false;
        const qty = parseFloat(item.quantity);
        // Only include items with valid quantity >= 0.01
        return qty !== null && qty !== undefined && !isNaN(qty) && qty >= 0.01;
      });
      
      // If no valid items remain, show error and prevent submission
      if (validItems.length === 0) {
        message.error('Please enter quantity (>= 0.01) for at least one item to receive.');
        return Promise.reject(new Error('No valid items with quantity >= 0.01'));
      }

      // Update fieldsValue with filtered items
      fieldsValue.items = validItems;
    }

    // Staff (Manage Company Staff): single project -> assignedProjects array; drop empty password
    if (entity === 'staff') {
      fieldsValue.assignedProjects = fieldsValue.assignedProjectId
        ? [fieldsValue.assignedProjectId]
        : [];
      delete fieldsValue.assignedProjectId;
      if (fieldsValue.password === undefined || fieldsValue.password === null || !String(fieldsValue.password).trim()) {
        delete fieldsValue.password;
      }
    }

    // const trimmedValues = Object.keys(fieldsValue).reduce((acc, key) => {
    //   acc[key] = typeof fieldsValue[key] === 'string' ? fieldsValue[key].trim() : fieldsValue[key];
    //   return acc;
    // }, {});

    dispatch(crud.create({ entity, jsonData: fieldsValue, withUpload }));
  };

  useEffect(() => {
    if (isSuccess) {
      readBox.open();
      collapsedBox.open();
      panel.open();
      form.resetFields();
      dispatch(crud.resetAction({ actionType: 'create' }));
      dispatch(crud.list({ entity }));
    }
  }, [isSuccess]);

  return (
    <Loading isLoading={isLoading}>
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        {formElements}
        <Form.Item>
          <Button type="primary" htmlType="submit">
            {translate('Submit')}
          </Button>
        </Form.Item>
      </Form>
    </Loading>
  );
}
