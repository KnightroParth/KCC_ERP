import React from "react";
import logo from "@/style/images/logo-text.png";

export default function SideContent() {
  return (
    <div className="side-panel-content">
      <img src={logo} alt="KCC Logo" className="side-logo" />

      <h1 className="side-title">KCC ERP System</h1>

      <div className="side-tagline">“House + Love = Home”</div>

      <p className="side-description">
        Building Homes. Building Trust. Since 35 Years.
        <br />
        Centralized management for Projects, Units, Billing & Work Progress.
        Trusted by Kothari Construction Company.
      </p>

      <ul className="side-points">
        <li>Trusted Since 35 Years</li>
        <li>Quality. Commitment. Construction.</li>
        <li>Smart ERP for Projects, Units & Billing</li>
      </ul>
    </div>
  );
}