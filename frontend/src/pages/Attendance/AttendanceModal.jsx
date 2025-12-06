// frontend/src/pages/Attendance/AttendanceModal.jsx

import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Select, message } from 'antd';
import useLanguage from '@/locale/useLanguage';
import request from '@/request/request';

export default function AttendanceModal({
  open,
  onCancel,
  onSuccess,
  labour,
  projectId,
  date,
  existingRecord,
}) {
  const translate = useLanguage();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && existingRecord) {
      form.setFieldsValue({
        fullDay: existingRecord.fullDay || 0,
        halfDay: existingRecord.halfDay || 0,
        status: existingRecord.status || 'Present',
      });
    } else if (open) {
      form.resetFields();
      form.setFieldsValue({
        fullDay: 0,
        halfDay: 0,
        status: 'Present',
      });
    }
  }, [open, existingRecord, form]);

  const handleSubmit = async (values) => {
    const { fullDay, halfDay, status } = values;

    // Validation: fullDay must be 0 or 1
    if (fullDay !== 0 && fullDay !== 1) {
      message.error('Full Day must be 0 or 1');
      return;
    }

    // Validation: halfDay must be 0, 0.5, or 1
    if (![0, 0.5, 1].includes(halfDay)) {
      message.error('Half Day must be 0, 0.5, or 1');
      return;
    }

    // Validation: fullDay + halfDay must be > 0
    if (fullDay + halfDay <= 0) {
      message.error('Full Day + Half Day must be greater than 0');
      return;
    }

    // Validation: halfDay cannot be more than 2 (total across all half days)
    if (halfDay > 2) {
      message.error('Half Day cannot be more than 2');
      return;
    }

    // If status is Absent, set fullDay and halfDay to 0
    let finalFullDay = fullDay;
    let finalHalfDay = halfDay;
    if (status === 'Absent') {
      finalFullDay = 0;
      finalHalfDay = 0;
    }

    try {
      const payload = {
        projectId,
        labourId: labour._id,
        date: date.format('YYYY-MM-DD'),
        fullDay: finalFullDay,
        halfDay: finalHalfDay,
        status,
      };

      const response = await request.post({
        entity: 'attendance/mark',
        jsonData: payload,
      });

      if (response.success) {
        message.success(existingRecord ? 'Attendance updated successfully' : 'Attendance marked successfully');
        form.resetFields();
        onSuccess();
      } else {
        message.error(response.message || 'Failed to mark attendance');
      }
    } catch (error) {
      message.error(error.message || 'Failed to mark attendance');
    }
  };

  return (
    <Modal
      title={existingRecord ? 'Edit Attendance' : 'Mark Attendance'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={translate('Submit')}
      cancelText={translate('Cancel')}
      width={500}
    >
      {labour && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <p style={{ margin: '4px 0' }}>
            <strong>Labour:</strong> {labour.name}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Trade:</strong> {labour.trade} (Readonly)
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Labour Type:</strong> {labour.labourType} (Readonly)
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Vendor Type:</strong> {labour.vendorType}
          </p>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          fullDay: 0,
          halfDay: 0,
          status: 'Present',
        }}
      >
        <Form.Item
          label="Status"
          name="status"
          rules={[{ required: true, message: 'Please select status' }]}
        >
          <Select>
            <Select.Option value="Present">Present</Select.Option>
            <Select.Option value="Absent">Absent</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
        >
          {({ getFieldValue }) => {
            const status = getFieldValue('status');
            const isAbsent = status === 'Absent';

            return (
              <>
                <Form.Item
                  label="Full Day"
                  name="fullDay"
                  rules={[
                    {
                      required: !isAbsent,
                      type: 'number',
                      min: 0,
                      max: 1,
                      message: 'Full Day must be 0 or 1',
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={1}
                    step={1}
                    style={{ width: '100%' }}
                    placeholder="0 or 1"
                    disabled={isAbsent}
                  />
                </Form.Item>

                <Form.Item
                  label="Half Day"
                  name="halfDay"
                  rules={[
                    {
                      required: !isAbsent,
                      type: 'number',
                      min: 0,
                      max: 2,
                      message: 'Half Day must be 0, 0.5, or 1 (max total: 2)',
                    },
                  ]}
                >
                  <Select
                    disabled={isAbsent}
                    placeholder="Select half day value"
                  >
                    <Select.Option value={0}>0</Select.Option>
                    <Select.Option value={0.5}>0.5</Select.Option>
                    <Select.Option value={1}>1</Select.Option>
                  </Select>
                </Form.Item>
              </>
            );
          }}
        </Form.Item>

        <Form.Item
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.fullDay !== currentValues.fullDay ||
            prevValues.halfDay !== currentValues.halfDay ||
            prevValues.status !== currentValues.status
          }
        >
          {({ getFieldValue }) => {
            const fullDay = getFieldValue('fullDay') || 0;
            const halfDay = getFieldValue('halfDay') || 0;
            const status = getFieldValue('status');
            const total = fullDay + halfDay;

            return (
              <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
                <p style={{ margin: 0 }}>
                  <strong>Total Days:</strong> {status === 'Absent' ? 0 : total}
                </p>
                {status !== 'Absent' && total <= 0 && (
                  <p style={{ color: 'red', margin: '8px 0 0 0' }}>
                    Full Day + Half Day must be greater than 0
                  </p>
                )}
                {status !== 'Absent' && halfDay > 2 && (
                  <p style={{ color: 'red', margin: '8px 0 0 0' }}>
                    Half Day cannot be more than 2
                  </p>
                )}
              </div>
            );
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
}
