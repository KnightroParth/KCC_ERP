import { useEffect } from 'react';
import dayjs from 'dayjs';

import { useDispatch, useSelector } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { useCrudContext } from '@/context/crud';
// FIX: Import selectCurrentItem to get the data loaded by DataTable
import { selectUpdatedItem, selectCurrentItem } from '@/redux/crud/selectors'; 

import useLanguage from '@/locale/useLanguage';

import { Button, Form } from 'antd';
import Loading from '@/components/Loading';

export default function UpdateForm({ config, formElements, withUpload = false }) {
  let { entity } = config;
  const translate = useLanguage();
  const dispatch = useDispatch();
  
  // FIX: Get the item loaded by DataTable (result) AND the update status (current/isLoading)
  const { result: currentItem } = useSelector(selectCurrentItem);
  const { isLoading, isSuccess } = useSelector(selectUpdatedItem);

  const { state, crudContextAction } = useCrudContext();

  const { panel, collapsedBox, readBox } = crudContextAction;

  const showCurrentRecord = () => {
    readBox.open();
  };

  const [form] = Form.useForm();

  const onSubmit = (fieldsValue) => {
    // FIX: Use currentItem._id because that's where the ID lives
    const id = currentItem._id;

    if (fieldsValue.file && withUpload) {
      fieldsValue.file = fieldsValue.file[0].originFileObj;
    }

    // Ensure material price (rate) is sent as number for inventory/material
    if (entity === 'inventory/material' && fieldsValue.price !== undefined) {
      fieldsValue.price = Number(fieldsValue.price) || 0;
    }
    
    dispatch(crud.update({ entity, id, jsonData: fieldsValue, withUpload }));
  };

  useEffect(() => {
    // FIX: Listen to 'currentItem' (from DataTable), not 'current' (from Update response)
    if (currentItem) {
      let newValues = { ...currentItem };

      // Normalize dates
      const dateFields = [
        'birthday',
        'date',
        'expiredDate',
        'created',
        'updated',
        'plannedStartDate',
        'targetEndDate',
        'requiredDate', // Added requiredDate for IndentRequest
      ];

      dateFields.forEach((key) => {
        if (newValues[key]) {
          newValues[key] = dayjs(newValues[key]);
        }
      });
      
      // Special handling for Project if it's an object
      if (newValues.projectId && typeof newValues.projectId === 'object') {
          newValues.projectId = newValues.projectId._id;
      }

      // Ensure material rate (price) is a number when opening edit
      if (entity === 'inventory/material') {
        newValues.price = newValues.price != null ? Number(newValues.price) : 0;
      }

      form.resetFields();
      form.setFieldsValue(newValues);
    }
  }, [currentItem]); // Dependency is now currentItem

  useEffect(() => {
    if (isSuccess) {
      readBox.open();
      collapsedBox.open();
      panel.open();
      form.resetFields();
      dispatch(crud.resetAction({ actionType: 'update' }));
      dispatch(crud.list({ entity }));
    }
  }, [isSuccess]);

  const { isEditBoxOpen } = state;

  const show = isEditBoxOpen ? { display: 'block', opacity: 1 } : { display: 'none', opacity: 0 };
  
  return (
    <div style={show}>
      <Loading isLoading={isLoading}>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          {formElements}
          <Form.Item
            style={{
              display: 'inline-block',
              paddingRight: '5px',
            }}
          >
            <Button type="primary" htmlType="submit" shape="round">
              {translate('Save')}
            </Button>
          </Form.Item>
          <Form.Item
            style={{
              display: 'inline-block',
              paddingLeft: '5px',
            }}
          >
            <Button shape="round" onClick={showCurrentRecord}>
              {translate('Cancel')}
            </Button>
          </Form.Item>
        </Form>
      </Loading>
    </div>
  );
}