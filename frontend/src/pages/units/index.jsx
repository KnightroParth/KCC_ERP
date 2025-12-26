import React, { useState, useEffect } from "react";
import { Layout, Select, Typography, message, Empty, Button, Drawer, Form, Input, InputNumber, Collapse, Modal, Popconfirm, Space } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { request } from "@/request";
import UnitsTable from "./UnitsTable";

const { Content } = Layout;
const { Option } = Select;
const { Title } = Typography;

export default function Units() {
  const [projects, setProjects] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isBuildingDrawerOpen, setIsBuildingDrawerOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [form] = Form.useForm();
  const [buildingForm] = Form.useForm();
  const [editBuildingForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [isEditBuildingDrawerOpen, setIsEditBuildingDrawerOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);

  // Fetch projects and units on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingProjects(true);
        const projectResult = await request.listAll({ entity: "project" });
        if (projectResult.success && projectResult.result) {
          console.log('Projects loaded:', projectResult.result);
          setProjects(projectResult.result);
        }

        const unitsResult = await request.listAll({ entity: "units" });
        if (unitsResult.success && unitsResult.result) {
          console.log('Units loaded:', unitsResult.result);
          setUnitsList(unitsResult.result);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        message.error("Failed to load projects and units");
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchData();
  }, []);

  // Update building options when project changes
  useEffect(() => {
    if (selectedProject) {
      console.log('Selected Project:', selectedProject);
      console.log('Total units available:', unitsList.length);

      if (unitsList.length === 0) {
        console.warn('No units loaded!');
        setBuildings([]);
        return;
      }

      // Filter units for selected project
      const selectedProjCode = selectedProject.projectCode || selectedProject.code;
      const projectUnits = unitsList.filter((u) => {
        if (!u) return false;
        const unitProjectId = typeof u.projectId === "object"
          ? u.projectId._id || u.projectId
          : u.projectId;
        return unitProjectId === selectedProjCode || unitProjectId === selectedProject._id;
      });

      console.log('Filtered project units:', projectUnits.length);

      // Extract unique buildings
      const getBuildingName = (unit) => unit.buildingName || unit.towerOrWing || unit.building;
      const uniqueBuildingsSet = new Set(
        projectUnits
          .map(getBuildingName)
          .filter(Boolean)
      );

      const newBuildingNames = Array.from(uniqueBuildingsSet);

      // Preserve existing building order - keep existing buildings in their position,
      // add new ones at the end, remove deleted ones
      const existingBuildingNames = buildings.map(b => b.name);
      const orderedBuildingNames = [
        ...existingBuildingNames.filter(name => newBuildingNames.includes(name)),
        ...newBuildingNames.filter(name => !existingBuildingNames.includes(name)).sort()
      ];

      // Create buildings array with their units
      const buildingsData = orderedBuildingNames.map(building => {
        const buildingUnits = projectUnits.filter(u => getBuildingName(u) === building);
        return {
          name: building,
          units: buildingUnits.sort((a, b) => {
            const floorA = parseInt(a.floorNumber || a.floor || 0);
            const floorB = parseInt(b.floorNumber || b.floor || 0);
            if (floorA !== floorB) return floorA - floorB;
            const numA = parseInt(a.unitNumber.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.unitNumber.replace(/\D/g, '')) || 0;
            return numA - numB;
          })
        };
      });

      setBuildings(buildingsData);

      // Only reset selection if project actually changed (not just units refresh)
      // Check if selected building still exists
      if (selectedBuilding) {
        const buildingStillExists = buildingsData.find(b => b.name === selectedBuilding);
        if (buildingStillExists) {
          // Update table data with refreshed units
          const data = buildingStillExists.units.map(u => ({
            ...u,
            key: u._id,
          }));
          setTableData(data);
        } else {
          // Building was deleted or renamed, clear selection
          setSelectedBuilding(null);
          setTableData([]);
        }
      }
    } else {
      setBuildings([]);
      setSelectedBuilding(null);
      setTableData([]);
    }
  }, [selectedProject, unitsList]);

  const handleBuildingChange = (activeKeys) => {
    if (activeKeys.length > 0) {
      const selectedBuildingName = activeKeys[0];
      setSelectedBuilding(selectedBuildingName);

      // Find the building and set its units as table data
      const building = buildings.find(b => b.name === selectedBuildingName);
      if (building) {
        const data = building.units.map(u => ({
          ...u,
          key: u._id,
        }));
        setTableData(data);
      }
    } else {
      setSelectedBuilding(null);
      setTableData([]);
    }
  };

  const handleAddUnit = async (values) => {
    try {
      setSubmitting(true);
      const unitData = {
        projectId: selectedProject.projectCode || selectedProject.code,
        buildingName: selectedBuilding,
        unitNumber: values.unitNumber,
        floorNumber: values.floor,
        areaSqft: values.saleableArea,
        basePrice: values.ratePerSqft,
        status: values.status,
        buyerName: values.ownerName,
      };

      const result = await request.create({ entity: "unit", jsonData: unitData });

      if (result.success) {
        message.success('Unit added successfully');
        form.resetFields();
        setIsDrawerOpen(false);

        // Refresh units list
        const unitsResult = await request.listAll({ entity: "units" });
        if (unitsResult.success && unitsResult.result) {
          setUnitsList(unitsResult.result);
        }
      } else {
        message.error('Failed to add unit');
      }
    } catch (error) {
      console.error('Error adding unit:', error);
      message.error('An error occurred while adding unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshTable = async () => {
    const unitsResult = await request.listAll({ entity: "units" });
    if (unitsResult.success && unitsResult.result) {
      setUnitsList(unitsResult.result);
    }
  };

  const handleAddBuilding = async (values) => {
    try {
      setSubmitting(true);
      // Create a placeholder unit to represent a building
      const buildingData = {
        projectId: selectedProject.projectCode || selectedProject.code,
        buildingName: values.buildingName,
        floorNumber: "0",
        unitNumber: `${values.buildingName}-BUILDING`,
        unitType: "Building",
        areaSqft: 0,
        basePrice: 0,
        status: "Available",
      };

      const result = await request.create({ entity: "unit", jsonData: buildingData });

      if (result.success) {
        message.success('Building added successfully');
        buildingForm.resetFields();
        setIsBuildingDrawerOpen(false);

        // Refresh units list to show new building
        const unitsResult = await request.listAll({ entity: "units" });
        if (unitsResult.success && unitsResult.result) {
          setUnitsList(unitsResult.result);
        }
      } else {
        message.error('Failed to add building');
      }
    } catch (error) {
      console.error('Error adding building:', error);
      message.error('An error occurred while adding building');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBuilding = (buildingName) => {
    setEditingBuilding(buildingName);
    editBuildingForm.setFieldsValue({ buildingName });
    setIsEditBuildingDrawerOpen(true);
  };

  const handleEditBuildingSubmit = async (values) => {
    try {
      setSubmitting(true);
      const newBuildingName = values.buildingName;

      // Find all units in this building and update their buildingName
      const building = buildings.find(b => b.name === editingBuilding);
      if (building && building.units.length > 0) {
        // Update each unit with the new building name
        const updatePromises = building.units.map(unit =>
          request.update({
            entity: 'unit',
            id: unit._id,
            jsonData: { buildingName: newBuildingName }
          })
        );

        await Promise.all(updatePromises);
        message.success(`Building renamed from "${editingBuilding}" to "${newBuildingName}"`);

        // Refresh units list
        const unitsResult = await request.listAll({ entity: "units" });
        if (unitsResult.success && unitsResult.result) {
          // Set the selected building to the new name before updating units list
          setSelectedBuilding(newBuildingName);
          setUnitsList(unitsResult.result);
        }
      }

      editBuildingForm.resetFields();
      setIsEditBuildingDrawerOpen(false);
      setEditingBuilding(null);
    } catch (error) {
      console.error('Error editing building:', error);
      message.error('An error occurred while editing building');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBuilding = async (buildingName) => {
    try {
      setSubmitting(true);

      // Find all units in this building
      const building = buildings.find(b => b.name === buildingName);
      if (building && building.units.length > 0) {
        // Delete each unit in this building
        const deletePromises = building.units.map(unit =>
          request.delete({ entity: 'unit', id: unit._id })
        );

        await Promise.all(deletePromises);
        message.success(`Building "${buildingName}" and all its units deleted`);

        // Refresh units list
        const unitsResult = await request.listAll({ entity: "units" });
        if (unitsResult.success && unitsResult.result) {
          setUnitsList(unitsResult.result);
        }

        setSelectedBuilding(null);
        setTableData([]);
      }
    } catch (error) {
      console.error('Error deleting building:', error);
      message.error('An error occurred while deleting building');
    } finally {
      setSubmitting(false);
    }
  };

  // Create collapse items for buildings
  const collapseItems = buildings.map(building => ({
    key: building.name,
    label: building.name,
    children: (
      <div>
        <p style={{ marginBottom: '16px', color: '#666' }}>
          {building.units.length} unit{building.units.length !== 1 ? 's' : ''}
        </p>
      </div>
    ),
  }));

  return (
    <Layout style={{ minHeight: "100vh", background: "#fafafa" }}>
      <Content style={{ padding: "32px 24px" }}>
        <div className="page-content-inner">
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="page-title">Units Management</h1>
              <p style={{ color: "#8c8c8c", marginBottom: 0 }}>
                View and manage units across projects and buildings
              </p>
            </div>
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
          </div>

          {selectedProject ? (
            <>
              {buildings.length > 0 ? (
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#333' }}>
                        Buildings / Towers / Wings
                      </h2>
                      <Space>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setIsBuildingDrawerOpen(true)}
                        >
                          Add Building
                        </Button>
                        <Button
                          type="primary"
                          ghost
                          icon={<EditOutlined />}
                          onClick={() => handleEditBuilding(selectedBuilding)}
                          disabled={!selectedBuilding}
                        >
                          Edit Building
                        </Button>
                        <Popconfirm
                          title="Delete Building"
                          description={selectedBuilding ? `Are you sure you want to delete "${selectedBuilding}" and all its units?` : ''}
                          onConfirm={() => handleDeleteBuilding(selectedBuilding)}
                          okText="Yes, Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                          disabled={!selectedBuilding}
                        >
                          <Button
                            danger
                            type="primary"
                            ghost
                            icon={<DeleteOutlined />}
                            disabled={!selectedBuilding}
                          >
                            Delete Building
                          </Button>
                        </Popconfirm>
                      </Space>
                    </div>
                    <Collapse
                      items={collapseItems}
                      onChange={handleBuildingChange}
                      activeKey={selectedBuilding ? [selectedBuilding] : []}
                      accordion
                    />
                  </div>

                  {selectedBuilding && tableData.length > 0 && (
                    <div className="card-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                          Units in {selectedBuilding}
                        </h3>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setIsDrawerOpen(true)}
                        >
                          Add Unit
                        </Button>
                      </div>
                      <UnitsTable data={tableData} onRefresh={handleRefreshTable} />
                    </div>
                  )}
                </>
              ) : (
                <div className="card-section">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <Empty description="No buildings found for this project" />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="large"
                      onClick={() => setIsBuildingDrawerOpen(true)}
                    >
                      Add First Building
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card-section">
              <Empty description="Please select a Project to view buildings and units" />
            </div>
          )}
        </div>
      </Content>

      {/* Add Unit Drawer */}
      <Drawer
        title="Add New Unit"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddUnit}
        >
          <Form.Item
            name="unitNumber"
            label="Unit Number"
            rules={[{ required: true, message: 'Please enter unit number' }]}
          >
            <Input placeholder="e.g., A-502" />
          </Form.Item>

          <Form.Item
            name="floor"
            label="Floor Number"
            rules={[{ required: true, message: 'Please enter floor number' }]}
          >
            <Input placeholder="e.g., 5" />
          </Form.Item>

          <Form.Item
            name="saleableArea"
            label="Area (Sq Ft)"
            rules={[{ required: true, message: 'Please enter area' }]}
          >
            <InputNumber min={0} step={0.01} placeholder="e.g., 1220" />
          </Form.Item>

          <Form.Item
            name="ratePerSqft"
            label="Base Price"
            rules={[{ required: true, message: 'Please enter base price' }]}
          >
            <InputNumber min={0} step={0.01} placeholder="e.g., 5000" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            initialValue="Available"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select Status">
              <Option value="Available">Available</Option>
              <Option value="Booked">Booked</Option>
              <Option value="Sold">Sold</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="ownerName"
            label="Buyer Name (Optional)"
          >
            <Input placeholder="Buyer name if sold" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={submitting}
            >
              Add Unit
            </Button>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Add Building Drawer */}
      <Drawer
        title="Add New Building"
        placement="right"
        onClose={() => setIsBuildingDrawerOpen(false)}
        open={isBuildingDrawerOpen}
        width={500}
      >
        <Form
          form={buildingForm}
          layout="vertical"
          onFinish={handleAddBuilding}
        >
          <Form.Item
            name="buildingName"
            label="Building / Tower / Wing Name"
            rules={[{ required: true, message: 'Please enter building name' }]}
          >
            <Input placeholder="e.g., Tower A, Wing B, Building 1" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={submitting}
            >
              Add Building
            </Button>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Edit Building Drawer */}
      <Drawer
        title="Edit Building"
        placement="right"
        onClose={() => {
          setIsEditBuildingDrawerOpen(false);
          setEditingBuilding(null);
          editBuildingForm.resetFields();
        }}
        open={isEditBuildingDrawerOpen}
        width={500}
      >
        <Form
          form={editBuildingForm}
          layout="vertical"
          onFinish={handleEditBuildingSubmit}
        >
          <Form.Item
            name="buildingName"
            label="Building / Tower / Wing Name"
            rules={[{ required: true, message: 'Please enter building name' }]}
          >
            <Input placeholder="e.g., Tower A, Wing B, Building 1" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={submitting}
            >
              Update Building
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    </Layout>
  );
}
