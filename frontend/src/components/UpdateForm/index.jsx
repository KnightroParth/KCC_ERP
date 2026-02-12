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

    // Staff: single project field -> assignedProjects array for API
    if (entity === 'staff') {
      fieldsValue.assignedProjects = fieldsValue.assignedProjectId
        ? [fieldsValue.assignedProjectId]
        : [];
      delete fieldsValue.assignedProjectId;
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
      // Site transfer: From/To site are populated objects -> use _id for form dropdowns
      if (newValues.fromProjectId && typeof newValues.fromProjectId === 'object') {
        newValues.fromProjectId = newValues.fromProjectId._id;
      }
      if (newValues.toProjectId && typeof newValues.toProjectId === 'object') {
        newValues.toProjectId = newValues.toProjectId._id;
      }

      // Ensure material rate (price) is a number when opening edit
      if (entity === 'inventory/material') {
        newValues.price = newValues.price != null ? Number(newValues.price) : 0;
      }

      // Inventory transaction (Consumption): items[].material may be populated object -> use _id for form
      if (entity === 'inventory/transaction' && Array.isArray(newValues.items) && newValues.items.length > 0) {
        newValues.items = newValues.items.map((row) => ({
          ...row,
          material: row.material?._id || row.material,
          quantity: row.quantity ?? 1,
          unit: row.unit || 'nos',
        }));
      }

      // Site transfer: items[].material may be populated object -> use _id for form
      if (entity === 'inventory/site-transfer' && Array.isArray(newValues.items) && newValues.items.length > 0) {
        newValues.items = newValues.items.map((row) => ({
          ...row,
          material: row.material?._id || row.material,
          quantity: row.quantity ?? 1,
          unit: row.unit || 'nos',
        }));
      }

      // Staff (Manage Company Staff): enabled -> status, assignedProjects -> single assignedProjectId for form
      if (entity === 'staff') {
        newValues.status = newValues.enabled ? 'Active' : 'Inactive';
        const firstProject = newValues.assignedProjects?.[0];
        newValues.assignedProjectId = typeof firstProject === 'object' && firstProject?._id ? firstProject._id : firstProject;
      }

      form.resetFields();
      // Defer setFieldsValue for site-transfer so form children don't overwrite items on first paint
      if (entity === 'inventory/site-transfer') {
        const timer = setTimeout(() => {
          form.setFieldsValue(newValues);
        }, 0);
        return () => clearTimeout(timer);
      }
      form.setFieldsValue(newValues);
    }
  }, [currentItem]); // Dependency is now currentItem

  const { result: listResult } = useSelector(selectListItems);

  useEffect(() => {
    if (isSuccess) {
      readBox.open();
      collapsedBox.open();
      panel.open();
      form.resetFields();
      dispatch(crud.resetAction({ actionType: 'update' }));
      const { pagination } = listResult;
      const options = { page: pagination.current || 1, items: pagination.pageSize || 10 };
      dispatch(crud.list({ entity, options }));
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