import React from 'react';
import { Card, Spin, Row, Col } from 'antd';
import { DollarOutlined, ProjectOutlined } from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useMoney } from '@/settings';
import { useSelector } from 'react-redux';
import { selectMoneyFormat } from '@/redux/settings/selectors';

const NAVY = '#002060';
const GOLD = '#c9a227';
const CHART_COLORS = [NAVY, '#2563eb', GOLD, '#0d9488', '#64748b'];

function ChartEmptyState({ icon: Icon, title, description, bullets }) {
  return (
    <div className="dashboard-empty-state">
      <div className="dashboard-empty-state-icon">
        <Icon style={{ fontSize: 24 }} />
      </div>
      <div className="dashboard-empty-state-title">{title}</div>
      <p className="dashboard-empty-state-desc">{description}</p>
      {bullets && (
        <ul className="dashboard-empty-state-list">
          {bullets.map((text, i) => (
            <li key={i}>{text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardCharts({ summary, loading }) {
  const { moneyFormatter } = useMoney();
  const moneyFormat = useSelector(selectMoneyFormat);
  const billingCollectionMonthly = summary?.billingCollectionMonthly ?? [];
  const projectDistribution = summary?.projectDistribution ?? [];

  const chartData = billingCollectionMonthly.map((m) => ({
    month: m.month,
    billing: m.billing,
    collection: m.collection,
  }));

  const pieData = projectDistribution;

  if (loading) {
    return (
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card className="dashboard-chart-card" title="Billing vs Collection">
            <div style={{ textAlign: 'center', padding: '48px 16px' }}><Spin size="large" /></div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="dashboard-chart-card" title="Projects by Status">
            <div style={{ textAlign: 'center', padding: '48px 16px' }}><Spin size="large" /></div>
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={14}>
        <Card
          className="dashboard-chart-card"
          title="Financial Trend: Billing vs Collection"
          style={{ border: '1px solid rgba(0, 32, 96, 0.1)', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,32,96,0.06)' }}
        >
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,32,96,0.08)" />
                <XAxis dataKey="month" tick={{ fill: '#595959', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#595959', fontSize: 12 }}
                  tickFormatter={(v) => moneyFormatter({ amount: v, currency_code: moneyFormat?.default_currency_code })}
                />
                <Tooltip
                  formatter={(value) => moneyFormatter({ amount: value, currency_code: moneyFormat?.default_currency_code })}
                  contentStyle={{ borderRadius: 8, border: `1px solid ${NAVY}` }}
                  labelStyle={{ color: NAVY }}
                />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                <Bar dataKey="billing" name="Billing" fill={NAVY} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="collection" name="Paid to Contractors" stroke={GOLD} strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmptyState
              icon={DollarOutlined}
              title="No billing data for the last 6 months"
              description="This chart shows how much you billed (invoices raised) vs how much you paid out to contractors each month."
              bullets={[
                'Create and date invoices to see Billing per month',
                'Record payments (to contractors) against invoices to see Payments Made',
                'Data appears automatically as you use Invoice and Record Payment',
              ]}
            />
          )}
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card
          className="dashboard-chart-card"
          title="Project Distribution"
          style={{ border: '1px solid rgba(0, 32, 96, 0.1)', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,32,96,0.06)' }}
        >
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Projects']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmptyState
              icon={ProjectOutlined}
              title="No project data yet"
              description="Projects are grouped by status: Planning, Execution, or Complete. The donut shows how many fall in each bucket."
              bullets={[
                'Add projects and set their status (Planning / Execution / Complete)',
                'The chart updates as you create and update projects',
              ]}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}
