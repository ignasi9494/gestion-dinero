"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  Upload,
  Tags,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  accent?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Movimientos", href: "/transactions", icon: List },
  { label: "Importar", href: "/upload", icon: Upload, accent: true },
  { label: "Categorias", href: "/categories", icon: Tags },
  { label: "Ajustes", href: "/settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            GestionDinero
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    item.accent && !isActive && "text-primary"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content ────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* ── Mobile Bottom Nav ───────────────────────────── */}
      <nav className="glass fixed inset-x-0 bottom-0 z-50 border-t border-border md:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            if (item.accent) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200",
                      isActive
                        ? "gradient-primary shadow-lg shadow-primary/30 scale-105"
                        : "bg-primary/10"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5",
                        isActive ? "text-white" : "text-primary"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                    isActive ? "bg-accent" : "bg-transparent"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Safe area for devices with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
