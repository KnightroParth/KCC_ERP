import React from "react";
import { Card, Typography } from "antd";
import logo from "@/style/images/logo-text.png";

const { Title, Paragraph } = Typography;

export default function About() {
  return (
    <Card
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: "40px 55px",
        borderRadius: 14,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 25 }}>
        <img src={logo} alt="KCC ERP" style={{ width: 180, marginBottom: 15 }} />
        <Title level={2}>KCC ERP System</Title>
        <Paragraph type="secondary">
          Centralized Digital Management System for Construction Projects
        </Paragraph>
      </div>

      <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
        KCC ERP System is an internal enterprise application designed exclusively for
        <b> Kothari Construction Company (KCC)</b> to streamline and digitize daily
        operations across projects and sites.
      </Paragraph>

      <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
        The system provides unified management of:
      </Paragraph>

      <ul style={{ fontSize: 15, marginTop: -8, marginBottom: 20, lineHeight: 1.8 }}>
        <li>Projects & Sites</li>
        <li>Units & Inventory</li>
        <li>Billing, Payments & Quotations</li>
        <li>Work Progress & Task Monitoring</li>
        <li>Contractor & Personnel Management</li>
      </ul>

      <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
        The goal of the system is to ensure transparency, improve efficiency, maintain
        records digitally, and allow KCC management to make informed decisions with
        real-time project insights.
      </Paragraph>

      <Paragraph style={{ marginTop: 28, fontSize: 15, textAlign: "center" }}>
        <b>Designed, Developed & Maintained for internal organizational use only.</b>
      </Paragraph>
    </Card>
  );
}