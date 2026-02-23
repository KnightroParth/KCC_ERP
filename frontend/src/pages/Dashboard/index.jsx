import React, { useState, useEffect } from 'react';
import { Layout, Row, Col, Card, Skeleton } from 'antd';
import { ProjectOutlined, BarChartOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import KPICard from '@/modules/DashboardModule/components/KPICard';
import ProjectHealthCard from '@/modules/DashboardModule/components/ProjectHealthCard';
import DashboardCharts from '@/modules/Dashboard/DashboardCharts';
import RecentActivity from '@/modules/DashboardModule/components/RecentActivity';
import { fetchDashboardSummary } from '@/request/dashboard';
import { useMoney } from '@/settings';
import { useSelector } from 'react-redux';
import { selectMoneyFormat } from '@/redux/settings/selectors';
import './dashboard.css';

const { Content } = Layout;

function DashboardSkeleton() {
  return (
    <>
      <Row gutter={[20, 20]} className="dashboard-hero-row">
        {[1, 2, 3, 4, 5].map((i) => (
          <Col xs={24} sm={12} md={8} lg={6} key={i}>
            <div className="dashboard-skeleton-card dashboard-card-fade-in">
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          </Col>
        ))}
      </Row>
      <Row gutter={[24, 24]} style={{ marginTop: 32 }}>
        <Col xs={24} lg={14}>
          <Card style={{ borderRadius: 12 }}><Skeleton active paragraph={{ rows: 5 }} /></Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card style={{ borderRadius: 12 }}><Skeleton active paragraph={{ rows: 6 }} /></Card>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 12 }}><Skeleton active paragraph={{ rows: 4 }} /></Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 12 }}><Skeleton active paragraph={{ rows: 5 }} /></Card>
        </Col>
      </Row>
    </>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { moneyFormatter } = useMoney();
  const moneyFormat = useSelector(selectMoneyFormat);

  const loadSummary = async () => {
    try {
      const data = await fetchDashboardSummary();
      setSummary(data);
    } catch (e) {
      console.error('Failed to load dashboard summary', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    const intervalId = setInterval(loadSummary, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const financials = summary?.financials ?? {};
  const projects = summary?.projects ?? {};
  const inventory = summary?.inventory ?? {};
  const work = summary?.work ?? {};
  const activeProjectsList = summary?.activeProjectsList ?? [];
  const recentActivity = summary?.recentActivity ?? [];
  const billingCollectionMonthly = summary?.billingCollectionMonthly ?? [];
  const alerts = summary?.alerts ?? {};
  const staffCount = summary?.staffCount ?? 0;

  const revenueProgress =
    financials.totalBilled > 0
      ? Math.round((financials.totalPaid / financials.totalBilled) * 100)
      : 0;

  const criticalAlertsCount =
    (alerts.pendingIndents ?? 0) +
    (inventory.criticalLowStockCount ?? 0) +
    (alerts.overdueBills ?? 0);

  const sparklineData = billingCollectionMonthly.map((m) => ({ value: m.collection }));

  const hasAnyData =
    (financials.totalBilled || financials.totalPaid) ||
    (projects.activeCount > 0 || projects.completedCount > 0) ||
    (inventory.totalStockValue > 0) ||
    (activeProjectsList.length > 0) ||
    (recentActivity.length > 0);

  if (loading && !summary) {
    return (
      <Layout className="dashboard-page">
        <Content style={{ background: 'transparent', minHeight: '100vh' }}>
          <div className="page-content-inner">
            <header className="dashboard-header">
              <h1 className="dashboard-hero-title">Command Center</h1>
              <p className="dashboard-hero-subtitle">High-level insights at a glance</p>
            </header>
            <DashboardSkeleton />
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="dashboard-page">
      <Content style={{ background: 'transparent', minHeight: '100vh' }}>
        <div className="page-content-inner">
          <header className="dashboard-header">
            <h1 className="dashboard-hero-title">Command Center</h1>
            <p className="dashboard-hero-subtitle">High-level insights at a glance</p>
            {!hasAnyData && (
              <p className="dashboard-hero-hint">
                Revenue, projects, inventory and activity will fill in as you create invoices, add projects, and use billing and inventory.
              </p>
            )}
          </header>

          {/* Hero: 5 KPI Cards */}
          <Row gutter={[20, 20]} className="dashboard-hero-row">
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="dashboard-card-fade-in">
                <KPICard
                  title="Total Revenue"
                  value={financials.totalPaid}
                  subtitle={`Billed: ${moneyFormatter({ amount: financials.totalBilled ?? 0, currency_code: moneyFormat?.default_currency_code })}`}
                  icon="revenue"
                  progressPercent={revenueProgress}
                  progressLabel="Collected vs Billed"
                  loading={loading}
                  to="/invoice"
                  valueFormatter={(v) => moneyFormatter({ amount: v ?? 0, currency_code: moneyFormat?.default_currency_code })}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="dashboard-card-fade-in">
                <KPICard
                  title="Project Health"
                  value={`${projects.activeCount ?? 0} active`}
                  subtitle={`${work.overallCompletionPercent ?? 0}% avg completion · ${staffCount} staff`}
                  icon="operations"
                  loading={loading}
                  to="/projects"
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="dashboard-card-fade-in">
                <KPICard
                  title="Inventory Value"
                  value={inventory.totalStockValue}
                  subtitle={`${inventory.criticalLowStockCount ?? 0} low stock items`}
                  icon="inventory"
                  trend={inventory.criticalLowStockCount > 0 ? 'down' : undefined}
                  sparklineData={sparklineData.length > 0 ? sparklineData : undefined}
                  loading={loading}
                  to="/inventory"
                  valueFormatter={(v) => moneyFormatter({ amount: v ?? 0, currency_code: moneyFormat?.default_currency_code })}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="dashboard-card-fade-in">
                <KPICard
                  title="Critical Alerts"
                  value={criticalAlertsCount}
                  subtitle="Pending indents · Low stock · Overdue bills"
                  icon="health"
                  theme="white"
                  loading={loading}
                  valueFormatter={(v) => `${v} alert${v !== 1 ? 's' : ''}`}
                />
              </div>
            </Col>
          </Row>

          {/* Charts: Financial Trend + Project Distribution */}
          <section className="dashboard-section dashboard-card-fade-in" style={{ marginTop: 32 }}>
            <h2 className="dashboard-section-title">
              <BarChartOutlined /> Financial & Project Overview
            </h2>
            <p className="dashboard-section-desc">
              Billing vs collection trend (last 6 months) and how projects are split by status — Planning, Execution, or Complete.
            </p>
            <DashboardCharts summary={summary} loading={loading} />
          </section>

          {/* Active Projects + Recent Activity */}
          <Row gutter={[24, 24]} style={{ marginTop: 32 }}>
            <Col xs={24} lg={16}>
              <h2 className="dashboard-section-title">
                <ProjectOutlined /> Active Projects
              </h2>
              <p className="dashboard-section-desc">
                Projects in Planning or Execution with completion % and budget vs actual. Click a card to open Projects.
              </p>
              <div className="dashboard-card-fade-in">
                <Card
                  className="dashboard-content-card"
                  bodyStyle={{ padding: 20 }}
                >
                  {activeProjectsList.length > 0 ? (
                    <Row gutter={[16, 16]}>
                      {activeProjectsList.map((proj) => (
                        <Col xs={24} sm={12} md={8} key={proj._id}>
                          <ProjectHealthCard project={proj} loading={loading} />
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <div className="dashboard-empty-state">
                      <div className="dashboard-empty-state-icon">
                        <ProjectOutlined />
                      </div>
                      <div className="dashboard-empty-state-title">No active projects yet</div>
                      <p className="dashboard-empty-state-desc">
                        Projects with status <strong>Planning</strong> or <strong>Execution</strong> appear here with completion % and budget vs actual spend.
                      </p>
                      <ul className="dashboard-empty-state-list">
                        <li>Add projects and set status to Planning or Execution</li>
                        <li>Track work progress in Activities to see completion %</li>
                        <li>Update actual cost on the project to compare with budget</li>
                      </ul>
                      <button
                        type="button"
                        className="dashboard-empty-cta"
                        onClick={() => navigate('/projects')}
                      >
                        Open Projects
                      </button>
                    </div>
                  )}
                </Card>
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <h2 className="dashboard-section-title">
                <ClockCircleOutlined /> Recent Activity
              </h2>
              <p className="dashboard-section-desc">
                Last 5 events: new projects, bills, payments to contractors, POs issued, and material received.
              </p>
              <div className="dashboard-card-fade-in">
                <Card className="dashboard-content-card" bodyStyle={{ padding: '16px 20px' }}>
                  <RecentActivity items={recentActivity} loading={loading} />
                </Card>
              </div>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
}
