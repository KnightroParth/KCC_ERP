import React from 'react';
import { Form, Input, Select } from 'antd';
import SelectAsync from '@/components/SelectAsync';
import { DESIGNATION_OPTIONS, STATUS_OPTIONS } from './config';

function ProjectAllocationSelect({ value, onChange, ...props }) {
  return (
    <SelectAsync
      entity="project"
      displayLabels={['name', 'projectCode']}
      outputValue="_id"
      placeholder="Select Project"
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

export default function StaffForm({ isUpdateForm = false }) {
  return (
    <>
      <Form.Item
        label="Full Name"
        name="name"
        rules={[{ required: true, message: 'Please enter full name' }]}
      >
        <Input placeholder="Full Name" />
      </Form.Item>

      <Form.Item
        label="Designation (Role)"
        name="designation"
        rules={[{ required: true, message: 'Please select designation' }]}
      >
        <Select
          placeholder="Select Designation"
          options={DESIGNATION_OPTIONS}
          allowClear={false}
        />
      </Form.Item>

      <Form.Item
        label="Project Allocation"
        name="assignedProjectId"
      >
        <ProjectAllocationSelect />
      </Form.Item>

      <Form.Item
        label="Mobile Number"
        name="mobile"
        rules={[{ required: true, message: 'Please enter mobile number' }]}
      >
        <Input placeholder="Mobile Number" />
      </Form.Item>

      <Form.Item
        label="Email ID"
        name="email"
        rules={[
          { required: true, message: 'Please enter email' },
          { type: 'email', message: 'Please enter a valid email' },
        ]}
      >
        <Input placeholder="Email ID" disabled={isUpdateForm} />
      </Form.Item>

      {!isUpdateForm && (
        <Form.Item
          label="Password"
          name="password"
          extra="Leave blank to auto-generate a password"
        >
          <Input.Password placeholder="Optional - auto-generated if blank" />
        </Form.Item>
      )}

      <Form.Item
        label="Status"
        name="status"
        rules={[{ required: true, message: 'Please select status' }]}
        initialValue="Active"
      >
        <Select placeholder="Status" options={STATUS_OPTIONS} />
      </Form.Item>
    </>
  );
}
