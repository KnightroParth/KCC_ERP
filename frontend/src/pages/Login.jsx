import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Input, Checkbox, Avatar } from 'antd';
import {
  UserOutlined,
  CrownOutlined,
  TeamOutlined,
  CalendarOutlined,
  ToolOutlined,
  ShopOutlined,
  DollarOutlined,
  ArrowLeftOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useEffect } from 'react';
import useLanguage from '@/locale/useLanguage';
import { login } from '@/redux/auth/actions';
import Loading from '@/components/Loading';
import AuthModule from '@/modules/AuthModule';
import { LOGIN_PROFILES } from '@/config/roles';

const PROFILE_ICONS = {
  admin: <UserOutlined />,
  master: <CrownOutlined />,
  pm: <TeamOutlined />,
  planner: <CalendarOutlined />,
  site_engineer: <ToolOutlined />,
  store_incharge: <ShopOutlined />,
  accounts: <DollarOutlined />,
};

const LoginPage = () => {
  const translate = useLanguage();
  const { isLoading, isSuccess } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    if (isSuccess) navigate('/');
  }, [isSuccess, navigate]);

  const onPasswordSubmit = (values) => {
    if (!selectedProfile) return;
    dispatch(
      login({
        loginData: {
          email: selectedProfile.email,
          password: values.password,
          remember: values.remember,
        },
      })
    );
  };

  const content = selectedProfile ? (
    <Loading isLoading={isLoading}>
      <div className="login-password-step">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setSelectedProfile(null)}
          className="login-back-profiles"
        >
          {translate('Back')}
        </Button>
        <div className="login-selected-profile">
          <Avatar size={80} icon={PROFILE_ICONS[selectedProfile.role] || <UserOutlined />} className="login-avatar" />
          <span className="login-selected-label">{selectedProfile.label}</span>
        </div>
        <Form
          layout="vertical"
          name="password_login"
          onFinish={onPasswordSubmit}
          initialValues={{ remember: true }}
        >
          <Form.Item
            name="password"
            rules={[{ required: true, message: translate('Please enter password') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={translate('Password')}
              size="large"
              autoFocus
            />
          </Form.Item>
          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>{translate('Remember me')}</Checkbox>
            </Form.Item>
            <a className="login-form-forgot" href="/forgetpassword">
              {translate('Forgot password')}
            </a>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="login-form-button" loading={isLoading} size="large" block>
              {translate('Log in')}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Loading>
  ) : (
    <div className="login-profiles-step">
      <h2 className="login-profiles-title">Who&apos;s working?</h2>
      <p className="login-profiles-subtitle">Select a profile to continue</p>
      <div className="login-profiles-grid">
        {LOGIN_PROFILES.map((profile) => (
          <button
            key={profile.role}
            type="button"
            className="login-profile-item"
            onClick={() => setSelectedProfile(profile)}
          >
            <Avatar size={72} icon={PROFILE_ICONS[profile.role] || <UserOutlined />} className="login-profile-avatar" />
            <span className="login-profile-label">{profile.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return <AuthModule authContent={content} AUTH_TITLE={selectedProfile ? translate('Enter password') : ''} />;
};

export default LoginPage;
