import React from 'react';
import { Card, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

/**
 * Catches render errors in billing step content (e.g. Ledger step) so we show a message instead of white screen.
 */
export default class BillingStepErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Billing step error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card size="small" style={{ marginTop: 24, borderColor: '#ff4d4f' }}>
          <p style={{ marginBottom: 8, color: '#cf1322' }}>
            <strong>Something went wrong loading this step.</strong>
          </p>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
            {this.state.error?.message || String(this.state.error)}
          </p>
          {this.props.onGoBack && (
            <Button icon={<ArrowLeftOutlined />} onClick={this.props.onGoBack}>
              Go back
            </Button>
          )}
        </Card>
      );
    }
    return this.props.children;
  }
}
