import { useLayoutEffect, useEffect, useState } from 'react';
import { Row, Col, Button } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

import CreateForm from '@/components/CreateForm';
import UpdateForm from '@/components/UpdateForm';
import DeleteModal from '@/components/DeleteModal';
import ReadItem from '@/components/ReadItem';
import SearchItem from '@/components/SearchItem';
import DataTable from '@/components/DataTable/DataTable';

import { useDispatch, useSelector } from 'react-redux';

import { selectCurrentItem } from '@/redux/crud/selectors';
import useLanguage from '@/locale/useLanguage';
import { crud } from '@/redux/crud/actions';
import { useCrudContext } from '@/context/crud';
import usePermission from '@/hooks/usePermission';
import { ENTITY_TO_MODULE, ALLOW_ALL_MODULE } from '@/config/roles';

import { CrudLayout } from '@/layout';

function getPermissionModule(config) {
  if (config.permissionModule) return config.permissionModule;
  const entity = (config.entity || '').toLowerCase();
  return ENTITY_TO_MODULE[entity] || ALLOW_ALL_MODULE;
}

function SidePanelTopContent({ config, formElements, withUpload }) {
  const translate = useLanguage();
  const { crudContextAction, state } = useCrudContext();
  const { deleteModalLabels } = config;
  const { modal, editBox } = crudContextAction;

  const permissionModule = getPermissionModule(config);
  const canEdit = usePermission(permissionModule, 'edit');
  const canDelete = usePermission(permissionModule, 'delete');

  const { isReadBoxOpen, isEditBoxOpen } = state;
  const { result: currentItem } = useSelector(selectCurrentItem);
  const dispatch = useDispatch();

  const [labels, setLabels] = useState('');
  useEffect(() => {
    if (currentItem) {
      const currentlabels = deleteModalLabels.map((x) => currentItem[x]).join(' ');

      setLabels(currentlabels);
    }
  }, [currentItem]);

  const removeItem = () => {
    dispatch(crud.currentAction({ actionType: 'delete', data: currentItem }));
    modal.open();
  };
  const editItem = () => {
    dispatch(crud.currentAction({ actionType: 'update', data: currentItem }));
    editBox.open();
  };

  const show = isReadBoxOpen || isEditBoxOpen ? { opacity: 1 } : { opacity: 0 };
  return (
    <>
      <Row style={show} gutter={(24, 24)}>
        <Col span={10}>
          <p style={{ marginBottom: '10px' }}>{labels}</p>
        </Col>
        <Col span={14}>
          {canDelete && (
            <Button
              onClick={removeItem}
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              style={{ float: 'right', marginLeft: '5px', marginTop: '10px' }}
            >
              {translate('remove')}
            </Button>
          )}
          {canEdit && (
            <Button
              onClick={editItem}
              type="text"
              icon={<EditOutlined />}
              size="small"
              style={{ float: 'right', marginLeft: '0px', marginTop: '10px' }}
            >
              {translate('edit')}
            </Button>
          )}
        </Col>

        <Col span={24}>
          <div className="line"></div>
        </Col>
        <div className="space10"></div>
      </Row>
      <ReadItem config={config} />
      <UpdateForm config={config} formElements={formElements} withUpload={withUpload} />
    </>
  );
}

function FixHeaderPanel({ config }) {
  const { crudContextAction } = useCrudContext();

  const { collapsedBox } = crudContextAction;

  const addNewItem = () => {
    collapsedBox.close();
  };

  return (
    <Row gutter={8}>
      <Col className="gutter-row" span={21}>
        <SearchItem config={config} />
      </Col>
      <Col className="gutter-row" span={3}>
        <Button onClick={addNewItem} block={true} icon={<PlusOutlined />}></Button>
      </Col>
    </Row>
  );
}

function CrudModule({ config, createForm, updateForm, withUpload = false }) {
  const dispatch = useDispatch();

  useLayoutEffect(() => {
    dispatch(crud.resetState());
  }, [dispatch, config.entity]);

  return (
    <CrudLayout
      config={config}
      fixHeaderPanel={<FixHeaderPanel config={config} />}
      sidePanelBottomContent={
        <CreateForm config={config} formElements={createForm} withUpload={withUpload} />
      }
      sidePanelTopContent={
        <SidePanelTopContent config={config} formElements={updateForm} withUpload={withUpload} />
      }
    >
      <DataTable config={config} key={config.entity} />
      <DeleteModal config={config} />
    </CrudLayout>
  );
}

export default CrudModule;