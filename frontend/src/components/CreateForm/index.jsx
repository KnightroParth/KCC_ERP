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
  const onSubmit = (fieldsValue) => {
    // Manually trim values before submission

    if (fieldsValue.file && withUpload) {
      fieldsValue.file = fieldsValue.file[0].originFileObj;
    }

    // Filter out items with zero or negative quantity for inventory transactions
    if (entity === 'inventory/transaction' && fieldsValue.items && Array.isArray(fieldsValue.items)) {
      fieldsValue.items = fieldsValue.items.filter(
        item => item && item.quantity && parseFloat(item.quantity) > 0
      );
      
      // Validate that we have at least one item
      if (fieldsValue.items.length === 0) {
        message.error('At least one item with quantity greater than 0 is required');
        return;
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
