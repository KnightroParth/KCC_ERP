import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Layout, Tag, Typography } from 'antd';
import { LogoutOutlined, UserOutlined, ProjectOutlined } from '@ant-design/icons';

import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { selectCurrentProject } from '@/redux/erp/selectors';
import { FILE_BASE_URL } from '@/config/serverApiConfig';
import useLanguage from '@/locale/useLanguage';

const { Text } = Typography;

export default function HeaderContent() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const currentProject = useSelector(selectCurrentProject);
  const { Header } = Layout;
  const translate = useLanguage();

  const displayName = [currentAdmin?.name, currentAdmin?.surname].filter(Boolean).join(' ') || 'User';
  const projectLabel = currentProject
    ? (currentProject.projectCode ? `${currentProject.name} (${currentProject.projectCode})` : currentProject.name)
    : null;

  const ProfileDropdown = () => {
    const navigate = useNavigate();
    return (
      <div className="profileDropdown" onClick={() => navigate('/profile')}>
        <Avatar
          size="large"
          className="last"
          src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
          style={{
            color: '#f56a00',
            backgroundColor: currentAdmin?.photo ? 'none' : '#fde3cf',
            boxShadow: 'rgba(150, 190, 238, 0.35) 0px 0px 6px 1px',
          }}
        >
          {currentAdmin?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
        <div className="profileDropdownInfo">
          <p>
            {currentAdmin?.name} {currentAdmin?.surname}
          </p>
          <p>{currentAdmin?.email}</p>
        </div>
      </div>
    );
  };

  const DropdownMenu = ({ text }) => {
    return <span>{text}</span>;
  };

  const items = [
    {
      label: <ProfileDropdown className="headerDropDownMenu" />,
      key: 'ProfileDropdown',
    },
    { type: 'divider' },
    {
      icon: <UserOutlined />,
      key: 'settingProfile',
      label: (
        <Link to="/profile">
          <DropdownMenu text={translate('profile_settings')} />
        </Link>
      ),
    },
    { type: 'divider' },
    {
      icon: <LogoutOutlined />,
      key: 'logout',
      label: <Link to="/logout">{translate('logout')}</Link>,
    },
  ];

  return (
    <Header className="erp-header-bar">
      <div className="erp-header-context">
        <div className="erp-header-user">
          <UserOutlined className="erp-header-user-icon" />
          <Text strong className="erp-header-user-name">
            {displayName}
          </Text>
          {currentAdmin?.role && (
            <Tag color="blue" className="erp-header-role-tag">
              {String(currentAdmin.role).toUpperCase()}
            </Tag>
          )}
        </div>
        {projectLabel && (
          <div className="erp-header-project">
            <ProjectOutlined className="erp-header-project-icon" />
            <Text type="secondary" className="erp-header-project-label">
              Project:
            </Text>
            <Text className="erp-header-project-name">{projectLabel}</Text>
          </div>
        )}
      </div>
      <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
        <Avatar
          className="last erp-header-avatar"
          src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
          style={{
            color: '#f56a00',
            backgroundColor: currentAdmin?.photo ? 'none' : '#fde3cf',
            boxShadow: 'rgba(150, 190, 238, 0.35) 0px 0px 10px 2px',
            cursor: 'pointer',
          }}
          size="large"
        >
          {currentAdmin?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
      </Dropdown>
    </Header>
  );
}