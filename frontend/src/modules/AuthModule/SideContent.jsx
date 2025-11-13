import { Typography } from "antd";
import logo from "@/style/images/logo-text.png"; // keep your logo

const { Title, Text } = Typography;

export default function SideContent() {
  return (
    <div className="side-panel-content">
      <img src={logo} alt="KCC Logo" className="side-logo" />

      <Title level={1} className="side-title">
        KCC ERP System
      </Title>

      <Text className="side-subtitle">“House + Love = Home”</Text>

      <p className="side-description">
        Building Homes. Building Trust. Since 35 Years.
        <br />
        <br />
        Centralized management for Projects, Units, Billing & Work Progress.  
        Trusted by Kothari Construction Company.
      </p>
    </div>
  );
}