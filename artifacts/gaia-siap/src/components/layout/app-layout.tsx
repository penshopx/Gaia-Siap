import { Link, useLocation } from "wouter";
import { LayoutDashboard, Plus, Bell, Briefcase, Menu, LogOut } from "lucide-react";
import { useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();

  const navigation = [
    { name: "Dasbor", href: "/dashboard", icon: LayoutDashboard },
    { name: "Buat Kasus Baru", href: "/mulai", icon: Plus },
  ];

  const displayName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Pengguna";
  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-[100dvh] w-full bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-white transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:flex md:flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Briefcase size={18} />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">Gaia SIAP</span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="space-y-1">
            <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Menu Utama
            </p>
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-100 text-primary"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon size={18} className={isActive ? "text-primary" : "text-slate-400"} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t p-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
              {initials || "?"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-slate-900 leading-none truncate">{displayName}</span>
              {displayEmail && (
                <span className="text-xs text-slate-500 mt-1 truncate">{displayEmail}</span>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-slate-500 hover:text-slate-700 md:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:block">
              <h1 className="text-sm font-medium text-slate-600">
                {displayName ? `Ruang Kerja — ${displayName}` : "Ruang Kerja Saya"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-slate-500 hover:text-slate-700">
              <Bell size={20} />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
              title="Keluar"
            >
              <LogOut size={20} className="text-slate-500" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
