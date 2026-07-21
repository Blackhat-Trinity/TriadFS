import { Clock3, Share2, Star, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SmartFolder } from "@/types";
import { cn } from "@/lib/utils";

export type ExplorerScope = "all" | "recent" | "favorites" | "shared";

interface ExplorerScopeTabsProps {
  value: ExplorerScope;
  onChange: (value: ExplorerScope) => void;
  smartFolders: SmartFolder[];
  activeSmartFolderId: string | null;
  onSelectSmartFolder: (id: string | null) => void;
}

export function ExplorerScopeTabs({
  value,
  onChange,
  smartFolders,
  activeSmartFolderId,
  onSelectSmartFolder
}: ExplorerScopeTabsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Tabs value={value} onValueChange={(next) => onChange(next as ExplorerScope)}>
        <TabsList className="h-9 bg-[#15171a]">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#2b2f36] data-[state=active]:text-zinc-100">
            All
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-1.5 data-[state=active]:bg-[#2b2f36] data-[state=active]:text-zinc-100">
            <Clock3 className="h-3.5 w-3.5" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5 data-[state=active]:bg-[#2b2f36] data-[state=active]:text-zinc-100">
            <Star className="h-3.5 w-3.5" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-1.5 data-[state=active]:bg-[#2b2f36] data-[state=active]:text-zinc-100">
            <Share2 className="h-3.5 w-3.5" />
            Shared
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white",
            activeSmartFolderId === null ? "bg-[#23262c]" : ""
          )}
          onClick={() => onSelectSmartFolder(null)}
        >
          <WandSparkles className="h-4 w-4" />
          No Smart Filter
        </Button>
        {smartFolders.slice(0, 4).map((folder) => (
          <Button
            key={folder.id}
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 text-zinc-300 hover:bg-[#1b1e23] hover:text-white",
              activeSmartFolderId === folder.id ? "bg-[#23262c] text-zinc-100" : ""
            )}
            onClick={() => onSelectSmartFolder(folder.id)}
          >
            {folder.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
