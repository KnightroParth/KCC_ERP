import React from 'react';
import { Calendar, Badge, Card, Row, Col } from 'antd';

const getListData = (value) => {
    let listData;
    switch (value.date()) {
        case 8:
            listData = [
                { type: 'warning', content: 'Material Delivery' },
                { type: 'success', content: 'Client Meeting' },
            ];
            break;
        case 10:
            listData = [
                { type: 'warning', content: 'Site Inspection' },
                { type: 'success', content: 'Foundation Work' },
            ];
            break;
        case 15:
            listData = [
                { type: 'error', content: 'Safety Audit' },
                { type: 'processing', content: 'Team Meeting' },
            ];
            break;
        default:
    }
    return listData || [];
};

const dateCellRender = (value) => {
    const listData = getListData(value);
    return (
        <ul className="events" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {listData.map((item) => (
                <li key={item.content}>
                    <Badge status={item.type} text={item.content} />
                </li>
            ))}
        </ul>
    );
};

export default function DashboardCalendar() {
    return (
        <Row gutter={[32, 32]} style={{ marginTop: '32px' }}>
            <Col span={24}>
                <Card title="Scheduled Activities & Deadlines" className="shadow-sm">
                    <Calendar dateCellRender={dateCellRender} />
                </Card>
            </Col>
        </Row>
    );
}
