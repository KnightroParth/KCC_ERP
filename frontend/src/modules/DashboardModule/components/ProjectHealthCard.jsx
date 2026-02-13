import React from 'react';
import { Card, Progress, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useMoney } from '@/settings';
import { useSelector } from 'react-redux';
import { selectMoneyFormat } from '@/redux/settings/selectors';
import './ProjectHealthCard.css';

const statusColors = {
  Planning: 'blue',
  Execution: 'processing',
  Complete: 'success',
};

/**
 * Project card with circular progress for completion %, status, and budget vs actual.
 */
export default function ProjectHealthCard({ project, loading = false }) {
  const navigate = useNavigate();
  const { moneyFormatter } = useMoney();
  const moneyFormat = useSelector(selectMoneyFormat);

  if (!project) return null;

  const { name, projectCode, status, completionPercent = 0, budget, actualTotalCost } = project;
  const percent = Math.min(100, Math.max(0, Number(completionPercent)));

  const handleClick = () => navigate('/projects');

  return (
    <Card
      className="project-health-card"
      bordered={false}
      loading={loading}
      onClick={handleClick}
    >
      <div className="project-health-card-inner">
        <div className="project-health-card-header">
          <span className="project-health-card-name" title={name}>
            {name}
          </span>
          <Tag color={statusColors[status] || 'default'} className="project-health-card-tag">
            {status}
          </Tag>
        </div>
        {projectCode && (
          <div className="project-health-card-code">{projectCode}</div>
        )}
        <div className="project-health-card-progress-wrap">
          <Progress
            type="circle"
            percent={percent}
            size={72}
            strokeColor="#c9a227"
            trailColor="rgba(0,32,96,0.2)"
            format={() => (
              <span className="project-health-card-percent">{Math.round(percent)}%</span>
            )}
          />
        </div>
        {(budget != null || actualTotalCost != null) && (
          <div className="project-health-card-footer">
            <span className="project-health-card-budget">
              Budget: {moneyFormatter({ amount: budget ?? 0, currency_code: moneyFormat?.default_currency_code })}
            </span>
            <span className="project-health-card-actual">
              Actual: {moneyFormatter({ amount: actualTotalCost ?? 0, currency_code: moneyFormat?.default_currency_code })}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
