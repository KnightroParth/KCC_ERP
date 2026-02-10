import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Input, Checkbox, Avatar, Select } from 'antd';
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
  ApartmentOutlined,
} from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { login } from '@/redux/auth/actions';
import { request } from '@/request';
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

  const [step, setStep] = useState('project'); // 'project' | 'profile' | 'password'
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await request.listPublicProjects({ page: 1, items: 500 });
        const list = res?.result ?? [];
        setProjects(Array.isArray(list) ? list : []);
      } catch (e) {
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    })();
  }, []);

  // currentProject is set inside login() thunk so it's in store before we switch to app
  useEffect(() => {
    if (isSuccess) navigate('/', { replace: true });
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
        selectedProject: selectedProject || undefined,
      })
    );
  };

  const projectOptions = useMemo(
    () =>
      projects.map((p) => ({
        value: p._id,
        label: p.projectCode ? `${p.name} (${p.projectCode})` : p.name,
        project: p,
      })),
    [projects]
  );

  const handleProjectChange = (projectId) => {
    const p = projects.find((x) => x._id === projectId);
    setSelectedProject(p || null);
  };

  // Step 1: Select project (before profile/password)
  const projectStep = (
    <div className="login-profiles-step">
      <h2 className="login-profiles-title">Select Project</h2>
      <p className="login-profiles-subtitle">Choose a project first, then sign in</p>
      <Select
        size="large"
        placeholder="Select project..."
        style={{ width: '100%', marginBottom: 24 }}
        loading={projectsLoading}
        showSearch
        filterOption={(input, opt) =>
          (opt?.label ?? '').toLowerCase().includes((input || '').toLowerCase())
        }
        options={projectOptions}
        value={selectedProject?._id}
        onChange={handleProjectChange}
        notFoundContent={projectsLoading ? 'Loading...' : 'No projects'}
      />
      <Button
        type="primary"
        size="large"
        block
        onClick={() => setStep('profile')}
        disabled={!selectedProject}
        icon={<ArrowLeftOutlined style={{ transform: 'rotate(180deg)' }} />}
      >
        {translate('Continue')}
      </Button>
    </div>
  );

  // Step 2: Who's working?
  const profileStep = (
    <div className="login-profiles-step">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => setStep('project')}
        className="login-back-profiles"
      >
        {translate('Back')}
      </Button>
      <h2 className="login-profiles-title">Who&apos;s working?</h2>
      <p className="login-profiles-subtitle">Select a profile to continue</p>
      {selectedProject && (
        <p style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
          <ApartmentOutlined /> {selectedProject.name}
          {selectedProject.projectCode ? ` (${selectedProject.projectCode})` : ''}
        </p>
      )}
      <div className="login-profiles-grid">
        {LOGIN_PROFILES.map((profile) => (
          <button
            key={profile.role}
            type="button"
            className="login-profile-item"
            onClick={() => {
              setSelectedProfile(profile);
              setStep('password');
            }}
          >
            <Avatar size={72} icon={PROFILE_ICONS[profile.role] || <UserOutlined />} className="login-profile-avatar" />
            <span className="login-profile-label">{profile.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Step 3: Password
  const passwordStep = (
    <Loading isLoading={isLoading}>
      <div className="login-password-step">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setStep('profile')}
          className="login-back-profiles"
        >
          {translate('Back')}
        </Button>
        <div className="login-selected-profile">
          <Avatar size={80} icon={PROFILE_ICONS[selectedProfile?.role] || <UserOutlined />} className="login-avatar" />
          <span className="login-selected-label">{selectedProfile?.label}</span>
        </div>
        {selectedProject && (
          <p style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
            <ApartmentOutlined /> {selectedProject.name}
          </p>
        )}
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
  );

  const content =
    step === 'project'
      ? projectStep
      : step === 'profile'
        ? profileStep
        : passwordStep;

  const title =
    step === 'project'
      ? ''
      : step === 'profile'
        ? ''
        : translate('Enter password');

  return <AuthModule authContent={content} AUTH_TITLE={title} />;
};

export default LoginPage;
