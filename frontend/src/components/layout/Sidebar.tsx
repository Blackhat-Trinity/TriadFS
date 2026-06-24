import { BarChart3, Cog, FolderTree, Gauge, PlayCircle, Scale } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/files", label: "File Explorer", icon: FolderTree },
  { to: "/dashboard", label: "Analytics Dashboard", icon: Gauge },
  { to: "/transfer", label: "Transfer Panel", icon: PlayCircle },
  { to: "/benchmarks/run", label: "Benchmark Runner", icon: BarChart3 },
  { to: "/benchmarks/compare", label: "Compare Runs", icon: Scale },
  { to: "/settings", label: "Settings", icon: Cog }
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r bg-card/60 p-4 backdrop-blur xl:block">
      <div className="mb-6 rounded-xl border bg-card p-4 shadow-glass">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">TriadFS</p>
        <h1 className="mt-1 text-2xl font-semibold">File System Studio</h1>
        <p className="mt-2 text-sm text-muted-foreground">Explore files first, then optimize transfer speed, memory, and cost.</p>
      </div>
      <nav className="space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
