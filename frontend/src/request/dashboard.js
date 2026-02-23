import request from './request';

/**
 * Fetch unified dashboard summary (financials, projects, inventory, work, activity feed, billing chart).
 * Used by the Master Dashboard for MD command center.
 */
export const fetchDashboardSummary = async () => {
  try {
    const res = await request.get({ entity: 'dashboard/summary' });
    if (res?.success && res?.result) return res.result;
    return null;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return null;
  }
};

export const fetchDashboardData = async () => {
  try {
    const [projects, units, activities] = await Promise.all([
      request.listAll({ entity: 'project' }),
      request.listAll({ entity: 'units' }),
      request.listAll({ entity: 'activities' }),
    ]);

    return {
      projects: projects.result || [],
      units: units.result || [],
      activities: activities.result || [],
      progress: [],
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return {
      projects: [],
      units: [],
      activities: [],
      progress: [],
    };
  }
};
