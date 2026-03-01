import React, { useState } from 'react';
import { Layout, Button, Table, Card, Typography, Space, Tag } from 'antd';
import { FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import ReportFilters from './ReportFilters';
import request from '@/request/request';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function Reports() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({});

    // -------------------------
    // Data fetching
    // -------------------------
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

            const planRes = await request.get({ entity: 'report/planning', query });
            const planningRows = planRes.success ? (planRes.result || []) : [];

            const actRes = await request.get({ entity: 'report/completed', query });
            const completedActivities = actRes.success ? (actRes.result || []) : [];

            // Build completed key set: "unitNumber|workType|category"
            const completedKeys = new Set();
            completedActivities.forEach(act => {
                const unit = act.unitId?.unitNumber ?? act.unitNumber;
                const wt = act.activityName || act.workType;
                const cat = act.category;
                if (unit != null && wt && cat) {
                    completedKeys.add(`${String(unit)}|${wt}|${cat}`);
                }
            });

            const enriched = planningRows.map(row => ({
                ...row,
                status: completedKeys.has(`${String(row.unitNumber)}|${row.workType}|${row.category}`)
                    ? 'Completed'
                    : 'Pending',
            }));

            setData(enriched);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        fetchData(newFilters);
    };

    // -------------------------
    // Helpers
    // -------------------------
    const noProjectFilter = !filters.projectId;

    // Number of data columns (changes when Project column is added)
    // Columns: [Project?] Task | Contractor | Building | Unit/Flat No. | Rate | Status
    // taskColSpan is the span used by sub-total / total label cells (all cols except Rate + Status)
    const dataColCount = noProjectFilter ? 7 : 6;   // total columns
    const labelColSpan = dataColCount - 2;           // everything except Rate and Status

    // -------------------------
    // Processed data
    // -------------------------
    const getProcessedData = () => {
        if (!data.length) return [];

        // Sort by project name then building when no project is selected
        const sorted = [...data].sort((a, b) => {
            if (noProjectFilter) {
                const pA = a.projectId?.name || '';
                const pB = b.projectId?.name || '';
                if (pA !== pB) return pA.localeCompare(pB);
            }
            return (a.buildingName || '').localeCompare(b.buildingName || '');
        });

        const processed = [];

        // Group by category (preserving sorted order)
        const seen = new Set();
        const categories = [];
        sorted.forEach(item => {
            if (!seen.has(item.category)) {
                seen.add(item.category);
                categories.push(item.category);
            }
        });

        let grandTotal = 0;
        let totalCompleted = 0;
        let totalPending = 0;

        categories.forEach(cat => {
            const catItems = sorted.filter(item => item.category === cat);
            const subTotal = catItems.reduce((s, i) => s + (i.rate || 0), 0);
            grandTotal += subTotal;
            totalCompleted += catItems.filter(i => i.status === 'Completed').reduce((s, i) => s + (i.rate || 0), 0);
            totalPending += catItems.filter(i => i.status === 'Pending').reduce((s, i) => s + (i.rate || 0), 0);

            // Section header
            processed.push({ key: `section-${cat}`, isSectionHeader: true, sectionLabel: cat });

            // Data rows
            processed.push(...catItems.map(item => ({ ...item, key: item._id || `${item.unitNumber}-${item.workType}-${item.category}` })));

            // Subtotal
            processed.push({ key: `subtotal-${cat}`, task: `SUB TOTAL (${cat})`, isSubTotal: true, rate: subTotal });
        });

        processed.push({ key: 'total-completed', task: 'Total Completed Work', isTotalCompleted: true, rate: totalCompleted });
        processed.push({ key: 'total-pending', task: 'Total Pending Work', isTotalPending: true, rate: totalPending });
        processed.push({ key: 'grand-total', task: 'GRAND TOTAL', isGrandTotal: true, rate: grandTotal });

        return processed;
    };

    // -------------------------
    // Column definitions
    // -------------------------
    const isSummaryRow = r => r.isSubTotal || r.isGrandTotal || r.isTotalCompleted || r.isTotalPending;

    // Project column (shown only when no project filter)
    const projectCol = {
        title: 'Project',
        key: 'project',
        render: (_, record) => {
            if (record.isSectionHeader || isSummaryRow(record)) return null;
            return record.projectId?.name || '-';
        },
        onCell: (record) => {
            if (record.isSectionHeader) return { colSpan: 0 };
            if (isSummaryRow(record)) return { colSpan: 0 };
            return {};
        },
    };

    const baseColumns = [
        // ── Task / label column ──
        {
            title: 'Task',
            key: 'task',
            render: (_, record) => {
                if (record.isSectionHeader) return record.sectionLabel;
                if (record.isGrandTotal) return <strong style={{ color: '#000' }}>GRAND TOTAL</strong>;
                if (record.isTotalCompleted) return <strong style={{ color: '#389e0d' }}>{record.task}</strong>;
                if (record.isTotalPending) return <strong style={{ color: '#d46b08' }}>{record.task}</strong>;
                if (record.isSubTotal) return <strong>{record.task}</strong>;
                return record.workType || '-';
            },
            onCell: (record) => {
                if (record.isSectionHeader) {
                    return {
                        colSpan: dataColCount,
                        style: {
                            background: '#bae0ff',
                            color: '#003eb3',
                            fontWeight: 700,
                            fontSize: 14,
                            textAlign: 'center',
                            borderTop: '3px solid #1677ff',
                            borderBottom: '1px solid #91caff',
                        },
                    };
                }
                if (isSummaryRow(record)) {
                    return { colSpan: labelColSpan, style: { fontWeight: 'bold', textAlign: 'left' } };
                }
                return {};
            },
        },
        // ── Contractor ──
        {
            title: 'Contractor',
            key: 'contractor',
            render: (_, record) => {
                if (record.isSectionHeader || isSummaryRow(record)) return null;
                return record.contractorId?.companyName || record.contractorId?.name || '-';
            },
            onCell: (record) => {
                if (record.isSectionHeader) return { colSpan: 0 };
                if (isSummaryRow(record)) return { colSpan: 0 };
                return {};
            },
        },
        // ── Building ──
        {
            title: 'Building',
            dataIndex: 'buildingName',
            key: 'buildingName',
            render: (val, record) => {
                if (record.isSectionHeader || isSummaryRow(record)) return null;
                return val || '-';
            },
            onCell: (record) => {
                if (record.isSectionHeader) return { colSpan: 0 };
                if (isSummaryRow(record)) return { colSpan: 0 };
                return {};
            },
        },
        // ── Unit ──
        {
            title: 'Unit/Flat No.',
            dataIndex: 'unitNumber',
            key: 'unitNumber',
            render: (val, record) => {
                if (record.isSectionHeader || isSummaryRow(record)) return null;
                return val || '-';
            },
            onCell: (record) => {
                if (record.isSectionHeader) return { colSpan: 0 };
                if (isSummaryRow(record)) return { colSpan: 0 };
                return {};
            },
        },
        // ── Rate ──
        {
            title: 'Rate',
            key: 'rate',
            align: 'right',
            render: (_, record) => {
                if (record.isSectionHeader) return null;
                const val = record.rate;
                const formatted = val != null ? val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';

                if (record.isGrandTotal) return <strong style={{ color: '#000' }}>{formatted}</strong>;
                if (record.isTotalCompleted) return <strong style={{ color: '#389e0d' }}>{formatted}</strong>;
                if (record.isTotalPending) return <strong style={{ color: '#d46b08' }}>{formatted}</strong>;
                if (record.isSubTotal) return <strong>{formatted}</strong>;

                return formatted;
            },
            onCell: (record) => {
                if (record.isSectionHeader) return { colSpan: 0 };
                return { style: { textAlign: 'right' } };
            },
        },
        // ── Status ──
        {
            title: 'Status',
            key: 'status',
            align: 'center',
            render: (_, record) => {
                if (record.isSectionHeader || record.isSubTotal || record.isGrandTotal) return null;
                if (record.isTotalCompleted) return <Tag color="success">Completed</Tag>;
                if (record.isTotalPending) return <Tag color="warning">Pending</Tag>;
                return record.status === 'Completed'
                    ? <Tag color="success">Completed</Tag>
                    : <Tag color="warning">Pending</Tag>;
            },
            onCell: (record) => {
                if (record.isSectionHeader) return { colSpan: 0 };
                return {};
            },
        },
    ];

    // Insert Project column at index 0 when no project filter
    const columns = noProjectFilter ? [projectCol, ...baseColumns] : baseColumns;

    // -------------------------
    // Row class names
    // -------------------------
    const rowClassName = (record) => {
        if (record.isSectionHeader) return 'work-type-section-header';
        if (record.isGrandTotal) return 'grand-total-row';
        if (record.isSubTotal) return 'sub-total-row';
        if (record.isTotalCompleted) return 'total-completed-row';
        if (record.isTotalPending) return 'total-pending-row';
        return '';
    };

    // -------------------------
    // Excel Export
    // -------------------------
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const processedData = getProcessedData();
        const excelData = processedData
            .filter(row => !row.isSectionHeader)
            .map(row => {
                const base = {
                    'Task': isSummaryRow(row) ? row.task : (row.workType || '-'),
                    'Contractor': row.contractorId?.companyName || row.contractorId?.name || '',
                    'Building': row.buildingName || '',
                    'Unit/Flat No.': row.unitNumber || '',
                    'Rate': row.rate ?? '',
                    'Status': (row.isSubTotal || row.isGrandTotal) ? '' : (row.status || ''),
                };
                if (noProjectFilter) return { 'Project': row.projectId?.name || '', ...base };
                return base;
            });
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, 'Reports');
        XLSX.writeFile(wb, `Reports_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    };

    // -------------------------
    // PDF Export
    // -------------------------
    const exportToPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('KCC CONSTRUCTION', 14, 15);
        doc.setLineWidth(0.5);
        doc.line(14, 18, 196, 18);

        doc.setFontSize(16);
        doc.text('Reports', 14, 28);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${dayjs().format('DD MMM YYYY')}`, 196, 28, { align: 'right' });
        doc.line(14, 32, 196, 32);

        const processedData = getProcessedData();
        const pdfColCount = noProjectFilter ? 7 : 6;
        const pdfLabelSpan = pdfColCount - 2;

        const head = noProjectFilter
            ? [['Project', 'Task', 'Contractor', 'Building', 'Unit/Flat No.', 'Rate', 'Status']]
            : [['Task', 'Contractor', 'Building', 'Unit/Flat No.', 'Rate', 'Status']];

        const tableBody = [];
        processedData.forEach(row => {
            if (row.isSectionHeader) {
                tableBody.push([{
                    content: row.sectionLabel,
                    colSpan: pdfColCount,
                    styles: { fontStyle: 'bold', fillColor: [186, 224, 255], textColor: [0, 62, 179], halign: 'center' },
                }]);
            } else if (row.isSubTotal) {
                tableBody.push([
                    { content: row.task, colSpan: pdfLabelSpan, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'left' } },
                    { content: (row.rate || 0).toFixed(2), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } },
                    { content: '', styles: { fillColor: [240, 240, 240] } },
                ]);
            } else if (row.isTotalCompleted) {
                tableBody.push([
                    { content: 'Total Completed Work', colSpan: pdfLabelSpan, styles: { fontStyle: 'bold', fillColor: [246, 255, 237], halign: 'left', textColor: [82, 196, 26] } },
                    { content: (row.rate || 0).toFixed(2), styles: { fontStyle: 'bold', fillColor: [246, 255, 237], halign: 'right', textColor: [82, 196, 26] } },
                    { content: 'Completed', styles: { fontStyle: 'bold', fillColor: [246, 255, 237], textColor: [82, 196, 26], halign: 'center' } },
                ]);
            } else if (row.isTotalPending) {
                tableBody.push([
                    { content: 'Total Pending Work', colSpan: pdfLabelSpan, styles: { fontStyle: 'bold', fillColor: [255, 251, 230], halign: 'left', textColor: [250, 140, 0] } },
                    { content: (row.rate || 0).toFixed(2), styles: { fontStyle: 'bold', fillColor: [255, 251, 230], halign: 'right', textColor: [250, 140, 0] } },
                    { content: 'Pending', styles: { fontStyle: 'bold', fillColor: [255, 251, 230], textColor: [250, 140, 0], halign: 'center' } },
                ]);
            } else if (row.isGrandTotal) {
                tableBody.push([
                    { content: 'GRAND TOTAL', colSpan: pdfLabelSpan, styles: { fontStyle: 'bold', fillColor: [217, 217, 217], textColor: [0, 0, 0], halign: 'left' } },
                    { content: (row.rate || 0).toFixed(2), styles: { fontStyle: 'bold', fillColor: [217, 217, 217], textColor: [0, 0, 0], halign: 'right' } },
                    { content: '', styles: { fillColor: [217, 217, 217] } },
                ]);
            } else {
                const baseRow = [
                    row.workType || '-',
                    row.contractorId?.companyName || row.contractorId?.name || '-',
                    row.buildingName || '-',
                    row.unitNumber != null ? String(row.unitNumber) : '-',
                    (row.rate || 0).toFixed(2),
                    row.status || '',
                ];
                if (noProjectFilter) baseRow.unshift(row.projectId?.name || '-');
                tableBody.push(baseRow);
            }
        });

        autoTable(doc, {
            startY: 36,
            head,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [22, 119, 255] },
            columnStyles: {
                [pdfColCount - 2]: { halign: 'right' },
                [pdfColCount - 1]: { halign: 'center' },
            },
        });

        doc.save(`Reports_${dayjs().format('YYYY-MM-DD')}.pdf`);
    };

    // -------------------------
    // Render
    // -------------------------
    return (
        <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
            <Content style={{ padding: '32px 24px' }}>
                <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={2}>Reports</Title>
                        <Text type="secondary">View and export planning work with completion status</Text>
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
                        rowClassName={rowClassName}
                        rowKey="key"
                    />
                </Card>
            </Content>
            <style>{`
        .work-type-section-header td {
            background-color: #bae0ff !important;
            color: #003eb3 !important;
            font-weight: 700 !important;
            font-size: 14px !important;
            text-align: center !important;
            border-top: 3px solid #1677ff !important;
            border-bottom: 1px solid #91caff !important;
        }
        .sub-total-row td { background-color: #f0f0f0 !important; font-weight: bold !important; color: #000 !important; }
        .grand-total-row td { background-color: #d9d9d9 !important; color: #000 !important; font-weight: bold !important; }
        .total-completed-row td { background-color: #f6ffed !important; color: #389e0d !important; font-weight: bold !important; }
        .total-pending-row td { background-color: #fff7e6 !important; color: #d46b08 !important; font-weight: bold !important; }
      `}</style>
        </Layout>
    );
}
