// frontend/src/modules/AuthModule/index.jsx
import React from "react";
import SideContent from "./SideContent";
import "@/style/auth-premium.css";

import bg1 from "@/style/images/bg1.png";
import bg2 from "@/style/images/bg2.png";

export default function AuthModule({ authContent, AUTH_TITLE }) {
  const bgImages = [bg1, bg2];
  const [currentBg, setCurrentBg] = React.useState(0);

  // Auto-switch every 6 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="auth-premium-container">
      
      {/* LEFT PANEL */}
      <div className="auth-left">
        <SideContent />
      </div>

      {/* RIGHT PANEL WITH MORPH TRANSITION */}
      <div className="auth-right">
        {bgImages.map((img, index) => (
          <div
            key={index}
            className={`bg-layer ${index === currentBg ? "active" : ""}`}
            style={{ backgroundImage: `url(${img})` }}
          ></div>
        ))}

        <div className="auth-form-box">
          {AUTH_TITLE ? <h2 className="login-title">{AUTH_TITLE}</h2> : null}
          {authContent}
        </div>
      </div>
    </div>
  );
}