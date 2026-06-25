import { MoonStar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  return (
    <Button variant="outline" size="sm" disabled className="cursor-default border-[#26282d] bg-[#121316] text-zinc-200 opacity-100">
      <MoonStar className="mr-2 h-4 w-4 text-zinc-300" />
      Dark Locked
    </Button>
  );
}
