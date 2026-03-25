import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-section">
      <h2 className="logo">Resources</h2>

        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/gear">Gear</NavLink>
        <NavLink to="/sundays">Sundays</NavLink>
        <NavLink to="/meals">Meals</NavLink>
        <NavLink to="/past-menus">Past Menus</NavLink>
        <NavLink to="/routes">Routes</NavLink>
        <NavLink to="/tips">Tips &amp; Tricks</NavLink>
        </div>
        <br></br>
        <br></br>
    <div className="sidebar-section">
    <h2 className="logo">Planning</h2>
        <NavLink to="/menu">Menu</NavLink>
        <NavLink to="/weeks">Weeks</NavLink>
    </div>
    <br></br>
    <br></br>

    <div className="sidebar-section">
    <h2 className="logo">Print Outs</h2>
        <NavLink to="/food-print">Food Print</NavLink>
        <NavLink to="/routes-print">Routes Print</NavLink>
    </div>
    </nav>
  );
}
