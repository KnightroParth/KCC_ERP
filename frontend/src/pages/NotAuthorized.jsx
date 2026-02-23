import { Link } from 'react-router-dom';
import { Result, Button } from 'antd';

export default function NotAuthorized() {
  return (
    <Result
      status="403"
      title="Not Authorized"
      subTitle="You don't have permission to view this page."
      extra={
        <Link to="/">
          <Button type="primary">Go to Dashboard</Button>
        </Link>
      }
    />
  );
}
