import React from 'react';
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import ProblemContrast from './components/ProblemContrast/ProblemContrast';
import Simulator from './components/Simulator/Simulator';
import Capabilities from './components/Capabilities/Capabilities';
import TechStack from './components/TechStack/TechStack';
import CLIStart from './components/CLIStart/CLIStart';
import Footer from './components/Footer/Footer';

export default function App() {
  return (
    <div className="app-layout">
      {/* Navigation Header */}
      <Navbar />

      {/* Main Page Sections */}
      <main>
        {/* Slogans & Tech introduction */}
        <Hero />

        {/* Traditional Black-Box vs MemoryNode Governance Contrast */}
        <ProblemContrast />

        {/* Interactive Step-by-Step Lifecycle Simulator */}
        <Simulator />

        {/* Capability Matrix / Grid */}
        <Capabilities />

        {/* Core System Architecture Nodes */}
        <TechStack />

        {/* 5-second CLI deploy tutorial */}
        <CLIStart />
      </main>

      {/* Footer & Source code credits */}
      <Footer />
    </div>
  );
}
