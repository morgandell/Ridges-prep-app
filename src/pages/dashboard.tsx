import React, { useState } from "react";
import "./dashboard.css";
import welcomeImg from "../assets/IMG-selfie.jpg";
type DashboardTab = "general" | "menu" | "routes";

// Image comes from your repo's picture folder.


const WELCOME_IMG_SRC = welcomeImg;


export default function Dashboard() {
  const [tab, setTab] = useState<DashboardTab>("general");

  return (
    <div className="dashboard-page">
      {/* Content above the buttons stays the same for all tabs */}
      <div className="dashboard-general">
        <h1 className="dashboard-title">WELCOME TO YOUR RIDGES PREP APP!</h1>

        <div className="dashboard-intro-row">
          <img className="dashboard-welcome-image" src={WELCOME_IMG_SRC} alt="Welcome" />

          <div className="dashboard-intro-text">
            <p>
              To start, you have the coolest job at camp (I know because I had almost all of the
              jobs)! Ridges is such a cool experience and such a great opportunity for the kids,
              but before you can get on the trail there is lots of planning to do. Thats why I
              made this app. The goal is to have resources from past years all in one spot, and
              give you a way to plan menus and routes then communicate them well so they get
              approved!
            </p>
            <p>
              BIBLE VERSE HERE!
            </p>

          </div>
        </div>
        <p className="dashboard-intro-subtitle">
              Now, to get you some help on how to use this app to help you plan!
            </p>
      </div>

      {/* Buttons stay, only the content below changes */}
      <div className="dashboard-tabbar">
        <button
          type="button"
          className={`tab-btn ${tab === "general" ? "active" : ""}`}
          onClick={() => setTab("general")}
        >
          GENERAL
        </button>

        <button
          type="button"
          className={`tab-btn ${tab === "menu" ? "active" : ""}`}
          onClick={() => setTab("menu")}
        >
          MENU
        </button>

        <button
          type="button"
          className={`tab-btn ${tab === "routes" ? "active" : ""}`}
          onClick={() => setTab("routes")}
        >
          ROUTES
        </button>
      </div>
      <div className="dashboard-tab-content">
        {tab === "general" && (
          <div className="dashboard-general-content">
            <p>
              The resources pages should have info from many years! Make sure to get a look at
              what past ridges counselors might have to say and feel free to add things that worked
              great for you!
            </p>
            <p>
              The <strong>Gear, Sundays, </strong> and <strong>Tips &amp; Tricks</strong> pages are all
              basic information that should be helpful before you make it to the trail. These pages are
              not as necessary in the process of planning out your summer.
            </p><p>
              For <strong>Gear</strong> the most important thing is to make sure you are comfortable with
              all of the gear and you know how to use it and fix it if something were to happen.
            </p><p>
              For <strong>Sundays</strong> the most important thing is to make sure you have a good idea of
              what you want to do for your Sundays and have a plan for how to get everyone ready to start hiking.
            </p><p>
              <strong>Tips &amp; Tricks</strong> is a collection of advice from past counselors. It has a lot of good info,
              and if there is anything that made your life easier over your time as a ridges counselor, please add it to the list!
            </p>
            </div>
          
        )}

        {tab === "menu" && (
          <p>
            The <strong>Menu</strong> planner helps you build the weekly schedule. Add meals,
            then save once you’re ready to share what you’ve planned.
          </p>
        )}

        {tab === "routes" && (
          <p>
            The <strong>Routes</strong> pages help you map out the plan for your group each day.
            Use <strong>Routes Print</strong> to generate a clean handout for the week.
          </p>
        )}
      </div>
    </div>
  );
}