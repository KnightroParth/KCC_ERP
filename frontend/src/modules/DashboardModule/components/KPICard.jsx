import React from 'react';
import { Card, Statistic, Progress, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  DollarOutlined,
  ProjectOutlined,
  InboxOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { useMoney } from '@/settings';
import { useSelector } from 'react-redux';
import { selectMoneyFormat } from '@/redux/settings/selectors';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import './KPICard.css';

const ICON_MAP = {
  revenue: DollarOutlined,
  operations: ProjectOutlined,
  inventory: InboxOutlined,
  health: WarningOutlined,
};

const THEMES = {
  navy: { accent: '#c9a227', bg: 'linear-gradient(135deg, rgba(0, 32, 96, 0.9) 0%, rgba(0, 42, 82, 0.92) 100%)', border: 'rgba(201, 162, 39, 0.25)' },
  white: { accent: '#002060', bg: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,1) 100%)', border: 'rgba(0, 32, 96, 0.12)' },
};

/**
 * Reusable KPI Card: title, value, icon, trend, color theme. Glassmorphism, optional progress/sparkline, drill-down.
 */
export default function KPICard({
  title,
  value,
  subtitle,
  icon = 'revenue',
  iconColor,
  theme = 'navy',
  progressPercent,
  progressLabel,
  trend,
  sparklineData = [],
  loading = false,
  to,
  valueFormatter,
  prefix,
}) {
  const navigate = useNavigate();
  const { moneyFormatter } = useMoney();
  const moneyFormat = useSelector(selectMoneyFormat);
  const IconComponent = typeof icon === 'string' ? ICON_MAP[icon] || DollarOutlined : icon;
  const t = THEMES[theme] || THEMES.navy;
  const accent = iconColor ?? t.accent;

  const handleClick = () => {
    if (to && typeof to === 'string') navigate(to);
  };

  const displayValue = valueFormatter
    ? valueFormatter(value)
    : typeof value === 'number' && (title?.toLowerCase().includes('revenue') || title?.toLowerCase().includes('value') || title?.toLowerCase().includes('billed') || title?.toLowerCase().includes('paid'))
    ? moneyFormatter({
        amount: value,
        currency_code: moneyFormat?.default_currency_code,
      })
    : value;

  const isClickable = Boolean(to);

  return (
    <Card
      className={`kpi-card kpi-card-${theme} ${isClickable ? 'kpi-card-clickable' : ''}`}
      bordered={false}
      loading={loading}
      onClick={isClickable ? handleClick : undefined}
      style={{ background: t.bg, borderColor: t.border }}
    >
      <Spin spinning={loading}>
        <div className="kpi-card-inner">
          <div className="kpi-card-header">
            <span className="kpi-card-title">{title}</span>
            <span className="kpi-card-icon" style={{ color: accent }}>
              <IconComponent />
            </span>
          </div>
          <div className="kpi-card-value">
            {prefix}
            {displayValue}
          </div>
          {subtitle != null && subtitle !== '' && (
            <div className="kpi-card-subtitle">{subtitle}</div>
          )}
          {progressPercent != null && (
            <div className="kpi-card-progress">
              <Progress
                percent={Math.min(100, Math.max(0, progressPercent))}
                showInfo={false}
                strokeColor={accent}
                trailColor={theme === 'white' ? 'rgba(0,32,96,0.08)' : 'rgba(255,255,255,0.2)'}
                size="small"
              />
              {progressLabel && (
                <span className="kpi-card-progress-label">{progressLabel}</span>
              )}
            </div>
          )}
          {(trend !== undefined || sparklineData?.length > 0) && (
            <div className="kpi-card-footer">
              {trend !== undefined && (
                <span className={`kpi-card-trend kpi-card-trend-${trend}`}>
                  {trend === 'up' ? <RiseOutlined /> : <FallOutlined />}
                </span>
              )}
              {sparklineData?.length > 0 && (
                <div className="kpi-card-sparkline">
                  <ResponsiveContainer width="100%" height={28}>
                    <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`kpiSparkline-${title?.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={accent} fill={`url(#kpiSparkline-${title?.replace(/\s/g, '')})`} strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </Spin>
    </Card>
  );
}
