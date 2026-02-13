import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { FileTextOutlined, DollarOutlined, ShoppingOutlined, InboxOutlined, ProjectOutlined, ClockCircleOutlined } from '@ant-design/icons';
import './RecentActivity.css';

dayjs.extend(relativeTime);

const ICON_MAP = {
  new_project: ProjectOutlined,
  payment: DollarOutlined,
  po: ShoppingOutlined,
  bill: FileTextOutlined,
  grn: InboxOutlined,
};

/** Normalize labels so payments are always shown as "to contractor" (not "received") */
function getActivityLabel(event) {
  if (event.type === 'payment') {
    const isLarge = event.label && event.label.toLowerCase().includes('large');
    return isLarge ? 'Large Payment to Contractor' : 'Payment to Contractor';
  }
  return event.label || '';
}

/**
 * Timeline component for the last 5 major dashboard events.
 * Premium, minimal list with icon, label, meta, and relative time.
 */
export default function RecentActivity({ items = [], loading }) {
  if (loading) {
    return (
      <div className="recent-activity">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="recent-activity-item recent-activity-skeleton">
            <span className="recent-activity-icon-wrap recent-activity-icon-skeleton" />
            <div className="recent-activity-content">
              <div className="recent-activity-placeholder" style={{ width: '60%', height: 14 }} />
              <div className="recent-activity-placeholder" style={{ width: '40%', height: 12, marginTop: 4 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="recent-activity recent-activity-empty">
        <div className="recent-activity-empty-inner">
          <span className="recent-activity-empty-icon">
            <ClockCircleOutlined />
          </span>
          <div className="recent-activity-empty-title">No recent activity yet</div>
          <p className="recent-activity-empty-desc">
            The last 5 major events across the business will show here. As you use the system you’ll see:
          </p>
          <ul className="recent-activity-empty-list">
            <li><strong>Bills</strong> — When you create or raise an invoice</li>
            <li><strong>Payments</strong> — When you record a payment made to a contractor (against a bill)</li>
            <li><strong>POs</strong> — When a purchase order is issued</li>
            <li><strong>Projects</strong> — When a new project is added</li>
            <li><strong>Material</strong> — When goods are received (GRN)</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-activity">
      {items.map((event, idx) => {
        const Icon = ICON_MAP[event.type] || FileTextOutlined;
        return (
          <div key={idx} className="recent-activity-item">
            <span className="recent-activity-line" />
            <span className="recent-activity-icon-wrap">
              <Icon className="recent-activity-icon-svg" />
            </span>
            <div className="recent-activity-content">
              <div className="recent-activity-label">{getActivityLabel(event)}</div>
              <div className="recent-activity-meta">{event.meta}</div>
            </div>
            <span className="recent-activity-time">{dayjs(event.date).fromNow()}</span>
          </div>
        );
      })}
    </div>
  );
}
