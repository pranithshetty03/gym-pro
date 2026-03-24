"use client";

import { Sidebar } from "./Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white relative z-0 overflow-hidden">
      {/* Radiant Theme Colored Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-zinc-800/30 rounded-full blur-[150px] pointer-events-none -z-10" />
      
      <Sidebar />
      <main
        className="transition-all duration-300 relative z-10"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
