import React, { useState, useEffect } from 'react';
import { Layout, Button, Table, Card, Typography, Space } from 'antd';
import { FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import ReportFilters from './ReportFilters';
import request from '@/request/request';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function PlanningReport() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({});

    const fetchData = async (currentFilters) => {
        setLoading(true);
        try {
            const { projectId, buildingName, dateRange } = currentFilters;
            const query = {};
            if (projectId) query.projectId = projectId;
            if (buildingName) query.buildingName = buildingName;
            if (dateRange && dateRange[0] && dateRange[1]) {
                query.startDate = dateRange[0].toISOString();
                query.endDate = dateRange[1].toISOString();
            }

            const res = await request.get({ entity: 'report/planning', query });
            if (res.success) {
                setData(res.result || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        fetchData(newFilters);
    };

    const columns = [
        { title: 'Work Type', dataIndex: 'category', key: 'category' },
        { title: 'Task', dataIndex: 'workType', key: 'workType' },
        {
            title: 'Contractor',
            dataIndex: 'contractorId',
            key: 'contractor',
            render: (c) => c?.companyName || c?.name || '-'
        },
        { title: 'Building', dataIndex: 'buildingName', key: 'buildingName' },
        { title: 'Unit/Flat No.', dataIndex: 'unitNumber', key: 'unitNumber' },
        {
            title: 'Rate',
            dataIndex: 'rate',
            key: 'rate',
            render: (val) => val?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'
        },
    ];

    // Logic to insert subtotal and grand total rows
    const getProcessedData = () => {
        if (!data.length) return [];

        const processed = [];
        const categories = [...new Set(data.map(item => item.category))];

        let grandTotal = 0;

        categories.forEach(cat => {
            const catItems = data.filter(item => item.category === cat);
            const subTotal = catItems.reduce((sum, item) => sum + (item.rate || 0), 0);
            grandTotal += subTotal;

            processed.push(...catItems.map((item, index) => ({
                ...item,
                key: item._id,
                // Only show category label on first row of group for cleaner look if desired, 
                // but for standard table dataIndex is fine.
            })));

            processed.push({
                key: `subtotal-${cat}`,
                category: `SUB TOTAL (${cat})`,
                isSubTotal: true,
                rate: subTotal
            });
        });

        processed.push({
            key: 'grand-total',
            category: 'GRAND TOTAL',
            isGrandTotal: true,
            rate: grandTotal
        });

        return processed;
    };

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const processedData = getProcessedData();
        const excelData = processedData.map(row => ({
            'Work Type': row.category,
            'Task': row.workType || '',
            'Contractor': row.contractorId?.companyName || row.contractorId?.name || '',
            'Building': row.buildingName || '',
            'Unit/Flat No.': row.unitNumber || '',
            'Rate': row.rate
        }));
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "Planning Report");
        XLSX.writeFile(wb, `Planning_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const processedData = getProcessedData();

        doc.setFontSize(16);
        doc.text("Planning Report", 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 22);

        const tableRows = processedData.map(row => [
            row.category,
            row.workType || '',
            row.contractorId?.companyName || row.contractorId?.name || '',
            row.buildingName || '',
            row.unitNumber || '',
            row.rate?.toFixed(2)
        ]);

        autoTable(doc, {
            startY: 30,
            head: [['Work Type', 'Task', 'Contractor', 'Building', 'Unit/Flat No.', 'Rate']],
            body: tableRows,
            theme: 'grid',
            didParseCell: (data) => {
                const row = processedData[data.row.index];
                if (row?.isSubTotal || row?.isGrandTotal) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            }
        });

        doc.save(`Planning_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
            <Content style={{ padding: '32px 24px' }}>
                <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={2}>Planning Report</Title>
                        <Text type="secondary">View and export work planning details</Text>
                    </div>
                    <Space>
                        <Button icon={<FileExcelOutlined />} onClick={exportToExcel} disabled={!data.length}>Export Excel</Button>
                        <Button type="primary" icon={<FilePdfOutlined />} onClick={exportToPDF} danger disabled={!data.length}>Export PDF</Button>
                    </Space>
                </div>

                <ReportFilters onFilterChange={handleFilterChange} />

                <Card bordered={false}>
                    <Table
                        columns={columns}
                        dataSource={getProcessedData()}
                        loading={loading}
                        pagination={false}
                        rowClassName={(record) => {
                            if (record.isGrandTotal) return 'grand-total-row';
                            if (record.isSubTotal) return 'sub-total-row';
                            return '';
                        }}
                        summary={() => null} // We are adding totals as rows for simplicity and export ease
                    />
                </Card>
            </Content>
            <style>{`
        .sub-total-row { background-color: #fafafa; font-weight: bold; }
        .grand-total-row { background-color: #f0f5ff; font-weight: bold; color: #1677ff; }
      `}</style>
        </Layout>
    );
}
