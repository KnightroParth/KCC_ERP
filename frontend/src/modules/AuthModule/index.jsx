// frontend/src/modules/AuthModule/index.jsx
import React from "react";
import SideContent from "./SideContent";
import "@/style/auth-premium.css";

export default function AuthModule({ authContent, AUTH_TITLE }) {
  return (
    <div className="auth-premium-container">
      {/* LEFT */}
      <div className="auth-left">
        <SideContent />
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className="auth-form-box">
          {/* keep title if provided */}
          {AUTH_TITLE && <h2 className="login-title">{AUTH_TITLE}</h2>}

          {/* <<< THIS IS THE CRITICAL LINE: render the form container passed by LoginPage */}
          {authContent}
        </div>
      </div>
    </div>
  );
}