import { HashRouter, Routes, Route } from "react-router-dom";
import React from "react";
import Layout from "./layout/layout";
import Dashboard from "./pages/dashboard";
import Meals from "./pages/meals";
import MealDetail from "./pages/MealDetail";
import NewMeal from "./pages/NewMeal";
import RoutesPage from "./pages/routesPage";
import RouteDetail from "./pages/RouteDetail";
import RouteEdit from "./pages/RouteEdit";
import Gear from "./pages/gear";
import Sundays from "./pages/sundays";
import Menu from "./pages/menu";
import WeekSchedule from "./pages/weekSchedule";
import WeekDetail from "./pages/weekDetail";
import WeekEdit from "./pages/weekEdit";
import FoodPrint from "./pages/foodPrint";
import RoutesPrint from "./pages/routesPrint";
import PastMenus from "./pages/pastMenus";
import TipsAndTricks from "./pages/tipsAndTricks";
import TipDetail from "./pages/tipDetail";
import TipEdit from "./pages/tipEdit";
import AboutCoder from "./pages/aboutCoder";
import PackingListEdit from "./pages/packingListEdit";
import PackingListPrint from "./pages/packingListPrint";
import GearUsageNoteDetail from "./pages/gearUsageNoteDetail";
import GearUsageNoteEdit from "./pages/gearUsageNoteEdit";
import GearFixNoteDetail from "./pages/gearFixNoteDetail";
import GearFixNoteEdit from "./pages/gearFixNoteEdit";
import SundayCounselorTipDetail from "./pages/sundayCounselorTipDetail";
import SundayCounselorTipEdit from "./pages/sundayCounselorTipEdit";

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
          <Route path="/routes/new" element={<RouteEdit />} />
          <Route path="/routes/:id" element={<RouteDetail />} />
          <Route path="/routes/:id/edit" element={<RouteEdit />} />
          <Route path="/gear" element={<Gear />} />
          <Route path="/gear/packing/:id" element={<PackingListEdit />} />
          <Route path="/gear/packing/:id/print" element={<PackingListPrint />} />
          <Route path="/gear/usage/new" element={<GearUsageNoteEdit />} />
          <Route path="/gear/usage/:id/edit" element={<GearUsageNoteEdit />} />
          <Route path="/gear/usage/:id" element={<GearUsageNoteDetail />} />
          <Route path="/gear/fixes/new" element={<GearFixNoteEdit />} />
          <Route path="/gear/fixes/:id/edit" element={<GearFixNoteEdit />} />
          <Route path="/gear/fixes/:id" element={<GearFixNoteDetail />} />
          <Route path="/sundays" element={<Sundays />} />
          <Route path="/sundays/counselor-tips/new" element={<SundayCounselorTipEdit />} />
          <Route path="/sundays/counselor-tips/:id/edit" element={<SundayCounselorTipEdit />} />
          <Route path="/sundays/counselor-tips/:id" element={<SundayCounselorTipDetail />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/weeks" element={<WeekSchedule />} />
          <Route path="/weeks/new" element={<WeekEdit />} />
          <Route path="/weeks/:id" element={<WeekDetail />} />
          <Route path="/weeks/:id/edit" element={<WeekEdit />} />
          <Route path="/food-print" element={<FoodPrint />} />
          <Route path="/routes-print" element={<RoutesPrint />} />
          <Route path="/past-menus" element={<PastMenus />} />
          <Route path="/tips" element={<TipsAndTricks />} />
          <Route path="/tips/new" element={<TipEdit />} />
          <Route path="/tips/:id/edit" element={<TipEdit />} />
          <Route path="/tips/:id" element={<TipDetail />} />
          <Route path="/aboutCoder" element={<AboutCoder />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}