"use client";

import { useState } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Simulator from "../components/Simulator";
import ParadigmShift from "../components/ParadigmShift";
import Architecture from "../components/Architecture";
import ApiExplorer from "../components/ApiExplorer";
import Footer from "../components/Footer";

export default function PortalPage() {
  const [language, setLanguage] = useState("zh");
  const t = (zh, en) => (language === "zh" ? zh : en);

  return (
    <div className="relative min-h-screen bg-[#020202]">
      {/* Background Grids */}
      <div className="grid-overlay"></div>
      <div className="radial-glow-1" style={{ top: "-150px", left: "-100px" }}></div>
      <div className="radial-glow-2" style={{ top: "500px", right: "-100px" }}></div>
      <div className="radial-glow-3" style={{ bottom: "-100px", left: "-150px" }}></div>

      <Header language={language} setLanguage={setLanguage} t={t} />
      <Hero t={t} />
      <div className="gradient-divider"></div>
      <Simulator language={language} t={t} />
      <div className="gradient-divider"></div>
      <ParadigmShift t={t} />
      <div className="gradient-divider"></div>
      <Architecture language={language} t={t} />
      <div className="gradient-divider"></div>
      <ApiExplorer language={language} t={t} />
      <Footer />
    </div>
  );
}
