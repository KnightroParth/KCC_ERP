import { ErpContextProvider } from '@/context/erp';
import { Layout } from 'antd';
import AiChat from '@/components/AiChat';

const { Content } = Layout;

export default function ErpLayout({ children }) {
  return (
    <ErpContextProvider>
      <Content
        className="whiteBox shadow layoutPadding"
        style={{
          margin: '30px auto',
          width: '100%',
          maxWidth: 'none',
          minHeight: '600px',
        }}
      >
        {children}
      </Content>
      <AiChat />
    </ErpContextProvider>
  );
}
