"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white relative z-0 overflow-hidden">
      {/* Radiant Theme Colored Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-zinc-800/30 rounded-full blur-[150px] pointer-events-none -z-10" />
      
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="transition-all duration-300 relative z-10 md:ml-[var(--sidebar-width)] min-h-screen">
        <div className="md:hidden sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur px-4 py-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground"
          >
            <Menu className="w-4 h-4" />
            Menu
          </button>
        </div>
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
