import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { useNavigate, useDispatch } from 'react-router-dom';
import {
  Layout,
  Card,
  Row,
  Col,
  Input,
  Button,
  Table,
  Tag,
  Dropdown,
  Segmented,
  Space,
  Statistic,
  message,
  Modal,
} from 'antd';
import {
  FileTextOutlined,
  PlusOutlined,
  CreditCardOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  EllipsisOutlined,
  UserOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { ErpLayout } from '@/layout';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import request from '@/request/request';
import { useMoney, useDate } from '@/settings';
import { getStageLabel, isInProgress } from '@/pages/Billing/utils/billingStage';
import { downloadBillPDF } from '@/pages/Billing/utils/pdfGenerator';
import logoUrl from '@/style/images/logo-text.png';
import { erp } from '@/redux/erp/actions';

const { Content } = Layout;
const PAGE_SIZE = 20;

export default function Invoice() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();

  const [searchQ, setSearchQ] = useState('');
  const [contractorId, setContractorId] = useState(undefined);
  const [contractorName, setContractorName] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'contractor'
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchBills = useCallback(
    (page = 1) => {
      setLoading(true);
      const options = {
        page,
        items: PAGE_SIZE,
        sortBy: 'date',
        sortValue: -1,
      };
      if (contractorId) {
        options.filter = 'sourceContractorId';
        options.equal = contractorId;
      }
      if (searchQ && String(searchQ).trim()) {
        options.q = String(searchQ).trim();
        options.fields = 'number';
      }
      request
        .list({ entity: 'invoice', options })
        .then((data) => {
          const list = data?.result ?? [];
          const pag = data?.pagination ?? {};
          setItems(list);
          setPagination({
            current: parseInt(pag.page, 10) || 1,
            pageSize: PAGE_SIZE,
            total: parseInt(pag.count, 10) || 0,
          });
        })
        .catch(() => {
          setItems([]);
          setPagination((p) => ({ ...p, total: 0 }));
        })
        .finally(() => setLoading(false));
    },
    [contractorId, searchQ]
  );

  useEffect(() => {
    fetchBills(1);
  }, [fetchBills]);

  const handleSearch = (value) => {
    setSearchQ(value != null ? String(value).trim() : '');
  };

  const handleContractorChange = (id, option) => {
    setContractorId(id ?? undefined);
    setContractorName(option?.name ?? '');
    setPagination((p) => ({ ...p, current: 1 }));
  };

  const clearFilters = () => {
    setSearchQ('');
    setContractorId(undefined);
    setContractorName('');
    setPagination((p) => ({ ...p, current: 1 }));
  };

  const handleTableChange = (pag) => {
    fetchBills(pag.current);
  };

  const handleRead = (record) => {
    dispatch(erp.currentItem({ data: record }));
    navigate(`/invoice/read/${record._id}`);
  };

  const handleEdit = (record) => {
    dispatch(erp.currentAction({ actionType: 'update', data: record }));
    navigate(`/invoice/update/${record._id}`);
  };

  const handleDownload = async (record) => {
    setDownloadingId(record._id);
    try {
      const res = await request.read({ entity: 'invoice', id: record._id });
      const inv = res?.result;
      if (!inv) {
        message.error('Could not load invoice');
        return;
      }
      const projectName = inv.sourceProjectId?.name ?? 'Project';
      const contractorNameVal = inv.sourceContractorId?.name ?? inv.client?.name ?? '';
      let logoBase64 = '';
      let logoSize = null;
      try {
        const r = await fetch(logoUrl);
        const blob = await r.blob();
        logoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        logoSize = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve(null);
          img.src = logoBase64;
        });
      } catch (_) {}
      downloadBillPDF(
        inv,
        projectName,
        `KCC-Bill-${inv.number ?? 'draft'}.pdf`,
        contractorNameVal,
        logoBase64,
        logoSize
      );
    } catch (e) {
      message.error(e?.message || 'Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: 'Delete bill?',
      content: `Bill #${record.number ?? ''}/${record.year ?? ''} (${record.contractorDisplayName || 'Contractor'}) will be removed.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () =>
        request.delete({ entity: 'invoice', id: record._id }).then((res) => {
          if (res?.success) {
            message.success('Bill deleted');
            fetchBills(pagination.current);
          } else {
            message.error(res?.message || 'Delete failed');
          }
        }),
    });
  };

  const handleRecordPayment = (record) => {
    dispatch(erp.currentItem({ data: record }));
    navigate(`/invoice/pay/${record._id}`);
  };

  const handleResumeBill = (record) => {
    navigate(`/billing/planning?resume=${record._id}`);
  };

  const totalAmount = items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const hasFilters = searchQ || contractorId;

  const baseColumns = [
    { title: 'Number', dataIndex: 'number', width: 90, render: (n, r) => `${n ?? '-'}/${r.year ?? ''}` },
    {
      title: 'Contractor',
      key: 'contractor',
      dataIndex: 'contractorDisplayName',
      width: 160,
      ellipsis: true,
      render: (_, record) => record?.contractorDisplayName || record?.sourceContractorId?.name || '—',
    },
    {
      title: 'Type',
      dataIndex: 'billType',
      width: 100,
      render: (v) => (v === 'normal' ? 'From Planning' : v === 'direct' ? 'Direct' : '—'),
    },
    {
      title: 'Status',
      dataIndex: 'billingStage',
      width: 120,
      render: (v, record) => {
        const { label, color } = getStageLabel(v, record?.status);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'date',
      width: 100,
      render: (d) => (d ? dayjs(d).format(dateFormat) : '—'),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 100,
      align: 'right',
      render: (t, r) => moneyFormatter({ amount: t, currency_code: r.currency }),
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      width: 90,
      render: (v) => (v ? String(v).replace(/\b\w/g, (c) => c.toUpperCase()) : '—'),
    },
  ];

  const getActionItems = (record) => {
    const actions = [
      { label: 'View', key: 'read', icon: <EyeOutlined /> },
      { label: 'Edit', key: 'edit', icon: <EditOutlined /> },
      { label: 'Download PDF', key: 'download', icon: <FilePdfOutlined /> },
      { label: 'Record Payment', key: 'recordPayment', icon: <CreditCardOutlined /> },
    ];
    if (isInProgress(record)) {
      actions.unshift({ label: 'Resume', key: 'resume', icon: <PlayCircleOutlined /> });
    }
    actions.push({ type: 'divider' }, { label: 'Delete', key: 'delete', icon: <DeleteOutlined />, danger: true });
    return actions;
  };

  const actionColumn = {
    title: '',
    key: 'action',
    fixed: 'right',
    width: 56,
    align: 'center',
    render: (_, record) => (
      <Dropdown
        menu={{
          items: getActionItems(record),
          onClick: ({ key }) => {
            switch (key) {
              case 'read':
                handleRead(record);
                break;
              case 'edit':
                handleEdit(record);
                break;
              case 'download':
                handleDownload(record);
                break;
              case 'delete':
                handleDelete(record);
                break;
              case 'recordPayment':
                handleRecordPayment(record);
                break;
              case 'resume':
                handleResumeBill(record);
                break;
              default:
                break;
            }
          },
        }}
        trigger={['click']}
      >
        <Button type="text" icon={<EllipsisOutlined />} loading={downloadingId === record._id} />
      </Dropdown>
    ),
  };

  const tableColumns = [...baseColumns, actionColumn];

  const groupedByContractor = items.reduce((acc, bill) => {
    const key = bill.contractorDisplayName || bill.sourceContractorId?.name || bill.sourceContractorId?._id || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(bill);
    return acc;
  }, {});

  return (
    <ErpLayout>
      <Content className="all-bills-dashboard" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Row justify="space-between" align="middle" wrap style={{ marginBottom: 16 }}>
            <Col>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>All Bills</h1>
              <p style={{ margin: '4px 0 0', color: '#8c8c8c', fontSize: 14 }}>
                Search by bill number, filter by contractor, or view by contractor.
              </p>
            </Col>
            <Col>
              <Space wrap>
                <Button icon={<FileTextOutlined />} onClick={() => navigate('/billing/planning')}>
                  Create from Planning
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoice/create')}>
                  Direct Bill
                </Button>
              </Space>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic title="Bills" value={pagination.total} suffix={hasFilters ? '(filtered)' : ''} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic
                  title="Total amount (this page)"
                  value={totalAmount}
                  precision={2}
                  prefix="₹"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic title="View" value={viewMode === 'table' ? 'Table' : 'By contractor'} />
              </Card>
            </Col>
          </Row>

          <Card size="small" style={{ marginBottom: 24, borderRadius: 12 }}>
            <Space wrap size="middle" style={{ width: '100%' }}>
              <Input.Search
                placeholder="Search by bill number"
                allowClear
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 220 }}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              />
              <AutoCompleteAsync
                entity="vendor"
                displayLabels={['name']}
                searchFields="name"
                value={contractorId}
                onChange={handleContractorChange}
                placeholder="Filter by contractor"
                style={{ width: 260 }}
              />
              {hasFilters && (
                <Button icon={<ClearOutlined />} onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
              <Segmented
                options={[
                  { label: 'Table', value: 'table' },
                  { label: 'By contractor', value: 'contractor' },
                ]}
                value={viewMode}
                onChange={setViewMode}
              />
            </Space>
          </Card>

          {viewMode === 'table' && (
            <Card size="small" style={{ borderRadius: 12 }}>
              <Table
                rowKey="_id"
                columns={tableColumns}
                dataSource={items}
                loading={loading}
                pagination={{
                  ...pagination,
                  showSizeChanger: false,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} bills`,
                }}
                onChange={handleTableChange}
                scroll={{ x: 900 }}
              />
            </Card>
          )}

          {viewMode === 'contractor' && (
            <Row gutter={[16, 16]}>
              {loading ? (
                <Col span={24}>
                  <Card size="small" style={{ textAlign: 'center', padding: 48 }}>
                    Loading bills…
                  </Card>
                </Col>
              ) : (
                Object.entries(groupedByContractor).map(([name, bills]) => (
                  <Col xs={24} key={name}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <UserOutlined />
                          <span>{name}</span>
                          <Tag>{bills.length} bill{bills.length !== 1 ? 's' : ''}</Tag>
                        </Space>
                      }
                      style={{ borderRadius: 12 }}
                    >
                      <Table
                        rowKey="_id"
                        columns={tableColumns}
                        dataSource={bills}
                        loading={false}
                        pagination={false}
                        size="small"
                        scroll={{ x: 800 }}
                      />
                    </Card>
                  </Col>
                ))
              )}
              {!loading && items.length === 0 && (
                <Col span={24}>
                  <Card size="small">
                    <div style={{ textAlign: 'center', padding: 24, color: '#8c8c8c' }}>
                      No bills found. Try changing filters or create a new bill.
                    </div>
                  </Card>
                </Col>
              )}
            </Row>
          )}
        </div>
      </Content>
    </ErpLayout>
  );
}
