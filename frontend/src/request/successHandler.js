import React from 'react';
import { notification } from 'antd';
import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import codeMessage from './codeMessage';

const successHandler = (response, options = { notifyOnSuccess: false, notifyOnFailed: true }) => {
  const { data } = response;
  if (data && data.success === true) {
    const message = response.data && data.message;
    const successText = message || codeMessage[response.status];

    if (options.notifyOnSuccess) {
      notification.config({
        duration: 2,
        maxCount: 1,
      });
      notification.success({
        key: 'global-update',
        className: 'custom-success-notification',
        message: `Request success`,
        description: successText,
        icon: React.createElement(CheckCircleOutlined, { style: { color: '#52c41a' } }),
      });
    }
  } else {
    const message = response.data && data.message;
    const errorText = message || codeMessage[response.status];
    const { status } = response;
    if (options.notifyOnFailed) {
      notification.config({
        duration: 4,
        maxCount: 1,
      });
      notification.error({
        key: 'global-error',
        className: 'custom-error-notification',
        message: `Request error ${status}`,
        description: errorText,
        icon: React.createElement(WarningOutlined, { style: { color: '#ff4d4f' } }),
      });
    }
  }
};

export default successHandler;
