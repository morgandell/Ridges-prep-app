import React from "react";
import { NavLink } from "react-router-dom";
import { faMountainCity } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-section">
      <h2 className="logo">Resources</h2>

        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/gear">Gear</NavLink>
        <NavLink to="/sundays">Sundays</NavLink>
        <NavLink to="/tips">Tips &amp; Tricks</NavLink>
        <NavLink to="/meals">Meals</NavLink>
        <NavLink to="/past-menus">Past Menus</NavLink>
        <NavLink to="/routes">Routes</NavLink>
        </div>
        
    <div className="sidebar-section">
    <h2 className="logo">Planning</h2>
        <NavLink to="/menu">Menu</NavLink>
        <NavLink to="/weeks">Weeks</NavLink>
    </div>
    
    

    <div className="sidebar-section">
    <h2 className="logo">Print Outs</h2>
        <NavLink to="/food-print">Food Print</NavLink>
        <NavLink to="/routes-print">Routes Print</NavLink>
    </div>
      <NavLink to="/aboutCoder"><FontAwesomeIcon icon={faMountainCity} className="icon-secondary" /></NavLink>
    </nav>
  );
}
