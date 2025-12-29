import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import "./layout.css";

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
