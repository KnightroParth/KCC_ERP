import { CrudContextProvider } from '@/context/crud';
import { Layout } from "antd";

const { Content } = Layout;

export default function DefaultLayout({ children }) {
  return (
    <CrudContextProvider>
      <Layout style={{ minHeight: "100vh" }}>
        <Content style={{ padding: 0 }}>
          {children}
        </Content>
      </Layout>
    </CrudContextProvider>
  );
}
