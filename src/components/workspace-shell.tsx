import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useMyProfile, useMyRoles, isAdmin, isDeptHead } from "@/lib/workspace-hooks";
import { DEPT_LABEL, ROLE_LABEL } from "@/lib/workspace-schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardList,
  Building2,
  Megaphone,
  BookOpen,
  Calendar,
  BarChart3,
  Bell,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ClipboardList },
  { to: "/projects", label: "Projects", icon: Briefcase },
  { to: "/members", label: "Members", icon: Users },
  { to: "/departments", label: "Departments", icon: Building2 },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
  { to: "/knowledge", label: "Knowledge Hub", icon: BookOpen },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/reports", label: "Reports", icon: BarChart3 },
] as const;

export function WorkspaceShell({ children, title, subtitle, actions }: { children: ReactNode; title?: string; subtitle?: string; actions?: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useMyProfile();
  const { data: roles } = useMyRoles();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const admin = isAdmin(roles);
  const head = isDeptHead(roles);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.full_name ?? profile?.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="grid h-8 w-8 place-items-center rounded-lg shadow-glow" style={{ background: "var(--gradient-primary)" }}>
            <span className="font-display text-sm font-bold text-primary-foreground">c</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">CoLab Nation</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Workspace</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {(admin || head) && (
            <div className="mt-6">
              <div className="px-3 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Admin</div>
              <Link
                to="/admin/applications"
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  pathname.startsWith("/admin/applications")
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Applications</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent/50 transition">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{profile?.full_name ?? profile?.email}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {roles && roles.length ? ROLE_LABEL[roles[0]] : profile?.department ? DEPT_LABEL[profile.department] : "Member"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-6 gap-4">
            <div className="min-w-0">
              {title && <h1 className="font-display text-xl font-semibold truncate">{title}</h1>}
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm">{profile?.full_name ?? profile?.email}</div>
                    <div className="text-xs text-muted-foreground">{profile?.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {roles?.map((r) => (
                    <div key={r} className="px-2 py-1">
                      <Badge variant="secondary" className="text-[10px]">{ROLE_LABEL[r]}</Badge>
                    </div>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
