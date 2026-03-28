"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import {
  LayoutDashboard, Users, Bell, LogOut, Dumbbell, ChevronRight, X, FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/members/import", label: "Import", icon: FileUp },
  { href: "/reminders", label: "Reminders", icon: Bell },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-40 flex flex-col transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
        style={{ width: "var(--sidebar-width)" }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-card border-r border-border" />

        <div className="relative flex flex-col h-full p-4">
          <div className="md:hidden flex justify-end mb-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-4 mb-6">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center glow-orange">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-xl text-foreground leading-none tracking-widest">
                GYMPRO
              </p>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">
                Trainer Dashboard
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground glow-orange"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="border-t border-border my-3" />

          {/* User + Logout */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || ""}
                  className="w-7 h-7 rounded-full ring-2 ring-primary/40"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {user?.displayName?.[0] ?? "T"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {user?.displayName ?? "Trainer"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                onClose?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
