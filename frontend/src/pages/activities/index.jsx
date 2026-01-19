// frontend/src/pages/activities/index.jsx
import React, { useState, useEffect } from "react";
import { Layout, Select, Typography, message, Empty, Button, Drawer, Form, Input, Table, Space, Tag, Modal } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { request } from "@/request";
import { WORK_CATEGORIES } from "@/pages/AssignWork/config";
import ImageUpload from "@/components/ImageUpload";

const { Content } = Layout;
const { Option } = Select;

// Add "Extra Work" to the categories list
const ACTIVITY_CATEGORIES = [
  ...WORK_CATEGORIES,
  { id: "extra", label: "Extra Work", fields: [] }
];

export default function Activities() {
  const [projects, setProjects] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  const [activitiesList, setActivitiesList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Fetch projects and units on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingProjects(true);
        const projectResult = await request.listAll({ entity: "project" });
        if (projectResult.success && projectResult.result) {
          setProjects(projectResult.result);
        }

        const unitsResult = await request.listAll({ entity: "units" });
        if (unitsResult.success && unitsResult.result) {
          setUnitsList(unitsResult.result);
        }

        // Fetch activities
        setLoadingActivities(true);
        const activitiesResult = await request.listAll({ entity: "activities" });
        if (activitiesResult.success && activitiesResult.result) {
          setActivitiesList(activitiesResult.result);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        message.error("Failed to load data");
      } finally {
        setLoadingProjects(false);
        setLoadingActivities(false);
      }
    };
    fetchData();
  }, []);

  // Update building options when project changes
  useEffect(() => {
    if (selectedProject) {
      const selectedProjCode = selectedProject.projectCode || selectedProject.code;
      const projectUnits = unitsList.filter((u) => {
        if (!u) return false;
        const unitProjectId = typeof u.projectId === "object"
          ? u.projectId._id || u.projectId
          : u.projectId;
        return unitProjectId === selectedProjCode || unitProjectId === selectedProject._id;
      });

      const getBuildingName = (unit) => unit.buildingName || unit.towerOrWing || unit.building;
      const uniqueBuildings = [...new Set(
        projectUnits
          .map(getBuildingName)
          .filter(Boolean)
      )].sort();

      setBuildings(uniqueBuildings);
      setSelectedBuilding(null);
    } else {
      setBuildings([]);
      setSelectedBuilding(null);
    }
  }, [selectedProject, unitsList]);

  // Get filtered activities based on selected filters
  const getFilteredActivities = () => {
    let filtered = activitiesList;

    if (selectedProject) {
      filtered = filtered.filter(activity => {
        const activityProjectId = activity.projectId?._id || activity.projectId;
        return activityProjectId === selectedProject._id ||
          activity.projectId?.projectCode === selectedProject.projectCode;
      });
    }

    if (selectedBuilding) {
      filtered = filtered.filter(activity => {
        // Resolve unit: if object use it, if ID string find it in unitsList
        const uId = activity.unitId?._id || activity.unitId;
        const unit = typeof activity.unitId === 'object' && activity.unitId !== null
          ? activity.unitId
          : unitsList.find(u => u._id === uId);

        if (!unit) return false;
        const buildingName = unit.buildingName || unit.towerOrWing;
        return buildingName === selectedBuilding;
      });
    }



    return filtered;
  };

  // Get units for the selected building ONLY (not all project units)
  const getBuildingUnits = () => {
    if (!selectedProject || !selectedBuilding) return [];
    const selectedProjCode = selectedProject.projectCode || selectedProject.code;

    return unitsList.filter((u) => {
      if (!u) return false;
      const unitProjectId = typeof u.projectId === "object"
        ? u.projectId._id || u.projectId
        : u.projectId;
      const matchesProject = unitProjectId === selectedProjCode || unitProjectId === selectedProject._id;
      const buildingName = u.buildingName || u.towerOrWing || u.building;
      const matchesBuilding = buildingName === selectedBuilding;

      return matchesProject && matchesBuilding;
    });
  };

  const handleAddActivity = async (values) => {
    try {
      setSubmitting(true);

      // Get category label from selected category in form
      const selectedCat = ACTIVITY_CATEGORIES.find(c => c.id === values.category);

      const activityData = {
        projectId: selectedProject._id,
        unitId: values.unitId,
        activityCode: `ACT-${Date.now()}`, // Auto-generate activity code
        activityName: values.activityName,
        remarks: values.remarks || '',
        defaultRate: 0,
        category: selectedCat ? selectedCat.label : values.category,
        photos: {
          before: values.photoBefore || null,
          after: values.photoAfter || null,
        },
      };

      const result = await request.create({ entity: "activities", jsonData: activityData });

      if (result.success) {
        message.success('Activity added successfully');
        form.resetFields();
        setIsDrawerOpen(false);

        // Update local state immediately
        const newActivity = result.result;
        // Populate unit and project manually for filters/display
        const populatedActivity = {
          ...newActivity,
          projectId: selectedProject,
          unitId: unitsList.find(u => u._id === values.unitId),
          category: selectedCat ? selectedCat.label : values.category,
        };

        setActivitiesList(prev => [populatedActivity, ...prev]);
      } else {
        message.error('Failed to add activity');
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      message.error('An error occurred while adding activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditActivity = (record) => {
    setEditingActivity(record);

    // Find the category ID from the label
    const cat = ACTIVITY_CATEGORIES.find(c => c.label === record.category);

    editForm.setFieldsValue({
      unitId: record.unitId?._id || record.unitId,
      activityName: record.activityName,
      remarks: record.remarks || '',
      category: cat ? cat.id : record.category,
      photoBefore: record.photos?.before || null,
      photoAfter: record.photos?.after || null,
    });
    setIsEditDrawerOpen(true);
  };

  const handleEditSubmit = async (values) => {
    try {
      setSubmitting(true);

      // Get category label from selected category in form
      const selectedCat = ACTIVITY_CATEGORIES.find(c => c.id === values.category);

      const updateData = {
        activityName: values.activityName,
        remarks: values.remarks || '',
        category: selectedCat ? selectedCat.label : values.category,
        photos: {
          before: values.photoBefore || null,
          after: values.photoAfter || null,
        },
      };

      const result = await request.update({
        entity: 'activities',
        id: editingActivity._id,
        jsonData: updateData
      });

      if (result.success) {
        message.success('Activity updated successfully');
        editForm.resetFields();
        setIsEditDrawerOpen(false);
        setEditingActivity(null);

        // Update local state immediately
        setActivitiesList(prev => prev.map(item => {
          if (item._id === editingActivity._id) {
            return {
              ...item,
              ...updateData,
              projectId: selectedProject, // Maintain reference
              unitId: unitsList.find(u => u._id === values.unitId),
            };
          }
          return item;
        }));
      } else {
        message.error('Failed to update activity');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      message.error('An error occurred while updating activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteActivity = async (record) => {
    try {
      const result = await request.delete({ entity: 'activities', id: record._id });
      if (result.success) {
        message.success('Activity deleted successfully');
        // Update local state immediately
        setActivitiesList(prev => prev.filter(item => item._id !== record._id));
      } else {
        message.error('Failed to delete activity');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      message.error('An error occurred while deleting activity');
    }
  };

  const columns = [
    {
      title: 'Unit / Flat No.',
      key: 'unit',
      render: (_, record) => {
        const uId = record?.unitId?._id || record?.unitId;
        const u = typeof record?.unitId === 'object' && record?.unitId !== null
          ? record.unitId
          : unitsList.find(unit => unit._id === uId);

        if (!u) return "-";
        return u.unitNumber || '-';
      },
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text) => text ? <Tag color="blue">{text}</Tag> : '-',
    },
    {
      title: 'Activity Name',
      dataIndex: 'activityName',
      key: 'activityName',
    },
    {
      title: 'Upload Photos',
      key: 'photos',
      render: (_, record) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div>
            <strong style={{ fontSize: '12px' }}>Before:</strong>
            {record.photos?.before ? (
              <div style={{ marginTop: '4px' }}>
                <img
                  src={record.photos.before}
                  alt="Before"
                  style={{ maxWidth: '80px', maxHeight: '80px', cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  onClick={() => {
                    setPreviewImage(record.photos.before);
                    setPreviewVisible(true);
                  }}
                />
              </div>
            ) : (
              <span style={{ color: '#8c8c8c', fontSize: '12px' }}>No image</span>
            )}
          </div>
          <div>
            <strong style={{ fontSize: '12px' }}>After:</strong>
            {record.photos?.after ? (
              <div style={{ marginTop: '4px' }}>
                <img
                  src={record.photos.after}
                  alt="After"
                  style={{ maxWidth: '80px', maxHeight: '80px', cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  onClick={() => {
                    setPreviewImage(record.photos.after);
                    setPreviewVisible(true);
                  }}
                />
              </div>
            ) : (
              <span style={{ color: '#8c8c8c', fontSize: '12px' }}>No image</span>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEditActivity(record)}
          />
          <Button
            size="small"
            danger
            type="primary"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteActivity(record)}
          />
        </Space>
      ),
    },
  ];

  const filteredActivities = getFilteredActivities();
  const buildingUnits = getBuildingUnits();

  return (
    <Layout style={{ minHeight: "100vh", background: "#fafafa" }}>
      <Content style={{ padding: "32px 24px" }}>
        <div className="page-content-inner">
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="page-title">Activities</h1>
              <p style={{ color: "#8c8c8c", marginBottom: 0 }}>
                Manage activities across projects and buildings
              </p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setIsDrawerOpen(true)}
              disabled={!selectedProject || !selectedBuilding}
            >
              Add New Activity
            </Button>
          </div>

          <div className="filter-bar" style={{ marginBottom: '24px' }}>
            <div className="filter-bar-item" style={{ flex: 1, minWidth: 250 }}>
              <label className="filter-bar-label">Project</label>
              <Select
                placeholder="Select Project"
                style={{ width: "100%" }}
                onChange={(value) => {
                  const project = projects.find((p) => p._id === value);
                  setSelectedProject(project || null);
                  // setSelectedCategory(null); // Category filter removed
                }}
                size="large"
                loading={loadingProjects}
                value={selectedProject ? selectedProject._id : undefined}
                allowClear
              >
                {projects.map((p) => (
                  <Option key={p._id} value={p._id}>
                    {p.name}
                  </Option>
                ))}
              </Select>
            </div>
            <div className="filter-bar-item" style={{ flex: 1, minWidth: 250 }}>
              <label className="filter-bar-label">Building</label>
              <Select
                placeholder={
                  !selectedProject
                    ? "Select a project first"
                    : buildings.length === 0
                      ? "No buildings found"
                      : "Select Building/Tower"
                }
                style={{ width: "100%" }}
                onChange={(value) => setSelectedBuilding(value)}
                size="large"
                disabled={!selectedProject}
                value={selectedBuilding}
                allowClear
              >
                {buildings.map((b) => (
                  <Option key={b} value={b}>
                    {b}
                  </Option>
                ))}
              </Select>
            </div>
            {/* Category filter removed as requested */}
          </div>

          {selectedProject && selectedBuilding ? (
            <div className="card-section">
              <Table
                columns={columns}
                dataSource={filteredActivities}
                rowKey="_id"
                loading={loadingActivities}
                pagination={{ pageSize: 20 }}
                locale={{
                  emptyText: <Empty description="No activities found for the selected filters" />
                }}
              />
            </div>
          ) : (
            <div className="card-section">
              <Empty description="Please select a Project and Building to view activities" />
            </div>
          )}
        </div>
      </Content>

      {/* Add Activity Drawer */}
      <Drawer
        title="Add New Activity"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddActivity}
        >
          <Form.Item
            name="unitId"
            label="Unit / Flat No."
            rules={[{ required: true, message: 'Please select a unit' }]}
          >
            <Select placeholder="Select Unit">
              {buildingUnits.map((u) => (
                <Option key={u._id} value={u._id}>
                  {u.unitNumber} {u.floorNumber ? `(Floor ${u.floorNumber})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select Category">
              {ACTIVITY_CATEGORIES.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="activityName"
            label="Activity Name"
            rules={[{ required: true, message: 'Please enter activity name' }]}
          >
            <Input placeholder="e.g., Plumbing, Electrical Work, Tile Fitting" />
          </Form.Item>

          <Form.Item
            name="remarks"
            label="Remarks"
          >
            <Input.TextArea placeholder="Add any additional remarks about this activity" rows={3} />
          </Form.Item>

          <Form.Item
            name="photoBefore"
            label="Photo - Before"
            valuePropName="value"
            getValueFromEvent={(e) => e}
          >
            <ImageUpload label="Upload Before Photo" />
          </Form.Item>

          <Form.Item
            name="photoAfter"
            label="Photo - After"
            valuePropName="value"
            getValueFromEvent={(e) => e}
          >
            <ImageUpload label="Upload After Photo" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={submitting}
            >
              Add Activity
            </Button>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Edit Activity Drawer */}
      <Drawer
        title="Edit Activity"
        placement="right"
        onClose={() => {
          setIsEditDrawerOpen(false);
          setEditingActivity(null);
          editForm.resetFields();
        }}
        open={isEditDrawerOpen}
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="unitId"
            label="Unit / Flat No."
            rules={[{ required: true, message: 'Please select a unit' }]}
          >
            <Select placeholder="Select Unit">
              {unitsList.map((u) => (
                <Option key={u._id} value={u._id}>
                  {u.unitNumber} {u.buildingName ? `- ${u.buildingName}` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select Category">
              {ACTIVITY_CATEGORIES.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="activityName"
            label="Activity Name"
            rules={[{ required: true, message: 'Please enter activity name' }]}
          >
            <Input placeholder="e.g., Plumbing, Electrical Work, Tile Fitting" />
          </Form.Item>

          <Form.Item
            name="remarks"
            label="Remarks"
          >
            <Input.TextArea placeholder="Add any additional remarks about this activity" rows={3} />
          </Form.Item>

          <Form.Item
            name="photoBefore"
            label="Photo - Before"
            valuePropName="value"
            getValueFromEvent={(e) => e}
          >
            <ImageUpload label="Upload Before Photo" />
          </Form.Item>

          <Form.Item
            name="photoAfter"
            label="Photo - After"
            valuePropName="value"
            getValueFromEvent={(e) => e}
          >
            <ImageUpload label="Upload After Photo" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsEditDrawerOpen(false);
                setEditingActivity(null);
                editForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
              >
                Update Activity
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Image Preview Modal */}
      <Modal
        title="Image Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        centered
        width={800}
      >
        <div style={{ textAlign: 'center' }}>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: '600px', borderRadius: '4px' }}
            />
          )}
        </div>
      </Modal>
    </Layout>
  );
}