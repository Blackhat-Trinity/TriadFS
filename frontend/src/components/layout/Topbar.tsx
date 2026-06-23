import { BellDot, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 mb-4 flex h-16 items-center gap-3 rounded-xl border bg-card/80 px-4 backdrop-blur">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search files, folders, sessions..." />
      </div>
      <ThemeToggle />
      <button className="rounded-md border p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="notifications">
        <BellDot className="h-4 w-4" />
      </button>
    </header>
  );
}
