import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <h2 className="logo">Resources</h2>

        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/routes">Routes</NavLink>
        <NavLink to="/gear">Gear</NavLink>
        <NavLink to="/sundays">Sundays</NavLink>
        <NavLink to="/meals">Meals</NavLink>
        <NavLink to="/menu">Menu</NavLink>
        <NavLink to="/weeks">Weeks</NavLink>
    </nav>
  );
}
