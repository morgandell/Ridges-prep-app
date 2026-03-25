import React from "react";
import "./aboutCoder.css";
import goof from "../assets/YouFoundMe.png";
// import cramer from "../assets/Cramer.jpg";

const GOOF_IMG_SRC = goof;
// const CRAMER_IMG_SRC = cramer;

export default function AboutCoder() {
  return (
    <div>
      <img className="found-me-image" src={GOOF_IMG_SRC} alt="Pic of me" />
      <p>
        My name is Nessy or Morgan and I wrote this program between my two years as a ridges counselor. 
        I did ridges for 4 years as a camper and then went on to work at camp for 7 summers (2020-2026), and only the last 
        two as ridges. I also graduated with a bachelors in computer science, leading to this app. 
        Ridges means so much to me and I hope that it continues to grow. My time on ridges was
        some of the best of my life.
      </p>
        <p>
        I got to lead ridges with my best friend (now fiance) and I really couldn't have gotten luckier. 
        Hopefully you get a life long friend!
        </p>
        {/* <img className="dashboard-welcome-image" src={CRAMER_IMG_SRC} alt="Pic of me and Alpine" /> */}
    </div>
  );
}