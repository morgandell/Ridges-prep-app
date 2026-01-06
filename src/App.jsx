import { HashRouter, Routes, Route } from "react-router-dom";
import React from "react";
import Layout from "./layout/layout";
import Dashboard from "./pages/dashboard";
import Meals from "./pages/meals";
import MealDetail from "./pages/MealDetail";
import NewMeal from "./pages/NewMeal";
import RoutesPage from "./pages/routes";   // renamed to RoutesPage
import Gear from "./pages/gear";
import Sundays from "./pages/sundays";
import Menu from "./pages/menu";
import WeekSchedule from "./pages/weekSchedule";
import WeekDetail from "./pages/weekDetail";
import WeekEdit from "./pages/weekEdit";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/meals/new" element={<NewMeal />} />
          <Route path="/meals/:id" element={<MealDetail />} />
          <Route path="/meals/:id/edit" element={<NewMeal />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/gear" element={<Gear />} />
          <Route path="/sundays" element={<Sundays />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/weeks" element={<WeekSchedule />} />
          <Route path="/weeks/:id" element={<WeekDetail />} />
          <Route path="/weeks/:id/edit" element={<WeekEdit />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}