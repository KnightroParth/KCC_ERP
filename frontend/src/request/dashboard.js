import request from './request';

export const fetchDashboardData = async () => {
    try {
        const [projects, units, activities] = await Promise.all([
            request.listAll({ entity: 'project' }),
            request.listAll({ entity: 'units' }),
            request.listAll({ entity: 'activities' }),
            // request.listAll({ entity: 'activityprogress' }), // Still commented out
        ]);

        return {
            projects: projects.result || [],
            units: units.result || [],
            activities: activities.result || [],
            progress: [], // Return empty array
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
