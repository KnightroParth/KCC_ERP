import { useEffect } from 'react';
import dayjs from 'dayjs';

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
  const onSubmit = (fieldsValue) => {
    try {
      // Format date fields for backend (convert dayjs to ISO string)
      const dateFields = ['date', 'requiredDate', 'requestDate', 'expiredDate'];
      dateFields.forEach(field => {
        if (fieldsValue[field] && dayjs.isDayjs(fieldsValue[field])) {
          fieldsValue[field] = fieldsValue[field].toISOString();
        }
      });

      if (fieldsValue.file && withUpload) {
        fieldsValue.file = fieldsValue.file[0].originFileObj;
      }

      // Filter out items with zero or negative quantity for inventory transactions
      if (entity === 'inventory/transaction' && fieldsValue.items && Array.isArray(fieldsValue.items)) {
        // Filter out zero/negative quantities
        const validItems = fieldsValue.items.filter(
          item => item && item.quantity && parseFloat(item.quantity) > 0
        );
        
        // Validate that we have at least one item
        if (validItems.length === 0) {
          message.error('At least one item with quantity greater than 0 is required');
          return;
        }
        
        fieldsValue.items = validItems;
      }

      dispatch(crud.create({ entity, jsonData: fieldsValue, withUpload }));
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      message.error('Error submitting form: ' + errorMessage);
    }
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
          <Button type="primary" htmlType="submit" loading={isLoading} disabled={isLoading}>
            {translate('Submit')}
          </Button>
        </Form.Item>
      </Form>
    </Loading>
  );
}
