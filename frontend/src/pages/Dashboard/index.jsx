import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import DashboardMetrics from '@/modules/Dashboard/DashboardMetrics';
import DashboardCharts from '@/modules/Dashboard/DashboardCharts';
import DashboardCalendar from '@/modules/Dashboard/DashboardCalendar';
import DashboardRecent from '@/modules/Dashboard/DashboardRecent';
import { fetchDashboardData } from '@/request/dashboard';

const { Content } = Layout;

export default function Dashboard() {
    const [data, setData] = useState({
        projects: [],
        units: [],
        activities: [],
        progress: [],
    });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            // Don't set loading to true on refresh to avoid flickering
            // Only set it on initial load if needed, but here we handle it via initial state
            const dashboardData = await fetchDashboardData();
            setData(dashboardData);
        } catch (error) {
            console.error('Failed to load dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const intervalId = setInterval(() => {
            loadData();
        }, 15000); // 15 seconds auto-refresh

        return () => clearInterval(intervalId);
    }, []);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Content style={{ background: '#fafafa', minHeight: '100vh' }}>
                <div className="page-content-inner" style={{ paddingTop: 32 }}>
                    <div style={{ marginBottom: 32 }}>
                        <h1 className="page-title">Dashboard</h1>
                        <p style={{ color: '#8c8c8c', marginBottom: 0 }}>Overview of your project metrics and activities</p>
                    </div>

                    <DashboardMetrics data={data} loading={loading} />

                    <div style={{ marginTop: 32 }}>
                        <DashboardCharts data={data} loading={loading} />
                    </div>

                    <DashboardCalendar />

                    <DashboardRecent data={data} loading={loading} />
                </div>
            </Content>
        </Layout>
    );
}
