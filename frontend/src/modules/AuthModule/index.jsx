// frontend/src/modules/AuthModule/index.jsx
import React from "react";
import "@/style/auth-premium.css";
import SideContent from "./SideContent";

export default function AuthModule({ authContent }) {
  return (
    <div className="auth-premium-container">

      {/* LEFT SECTION */}
      <div className="auth-left">
        <SideContent />
      </div>

      {/* RIGHT SECTION */}
      <div className="auth-right">
        <div className="auth-form-box">
          {authContent}
        </div>
      </div>

    </div>
  );
}