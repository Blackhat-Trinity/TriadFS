import { useMemo, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FileTag, SmartFolder } from "@/types";
import type { SmartFolderPayload } from "@/api/files";
import { cn } from "@/lib/utils";

interface SmartFoldersPanelProps {
  smartFolders: SmartFolder[];
  allTags: FileTag[];
  activeSmartFolderId: string | null;
  onCreate: (payload: SmartFolderPayload) => Promise<void> | void;
  onDelete: (smartFolderId: string) => Promise<void> | void;
  onActivate: (smartFolderId: string | null) => void;
}

export function SmartFoldersPanel({
  smartFolders,
  allTags,
  activeSmartFolderId,
  onCreate,
  onDelete,
  onActivate
}: SmartFoldersPanelProps) {
  const [name, setName] = useState("");
  const [nameContains, setNameContains] = useState("");
  const [extensionsCsv, setExtensionsCsv] = useState("");
  const [updatedWithinDays, setUpdatedWithinDays] = useState("");
  const [nodeType, setNodeType] = useState<"ANY" | "FILE" | "FOLDER">("ANY");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [requiredTagIds, setRequiredTagIds] = useState<string[]>([]);

  const selectedTagSet = useMemo(() => new Set(requiredTagIds), [requiredTagIds]);

  return (
    <section className="rounded-lg border border-[#24272d] bg-[#131519] p-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Sparkles className="h-4 w-4 text-zinc-300" />
          Smart Folders
        </h4>
        <span className="text-xs text-zinc-500">{smartFolders.length} saved</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="h-8 border-[#2a2d33] bg-[#0d0f12] text-xs" />
        <Input value={nameContains} onChange={(event) => setNameContains(event.target.value)} placeholder="Name contains" className="h-8 border-[#2a2d33] bg-[#0d0f12] text-xs" />
        <Input value={extensionsCsv} onChange={(event) => setExtensionsCsv(event.target.value)} placeholder="Extensions: pdf,docx" className="h-8 border-[#2a2d33] bg-[#0d0f12] text-xs" />
        <Input value={updatedWithinDays} onChange={(event) => setUpdatedWithinDays(event.target.value)} placeholder="Updated within days" className="h-8 border-[#2a2d33] bg-[#0d0f12] text-xs" />

        <select
          value={nodeType}
          onChange={(event) => setNodeType(event.target.value as "ANY" | "FILE" | "FOLDER")}
          className="h-8 rounded-md border border-[#2a2d33] bg-[#0d0f12] px-2 text-xs text-zinc-200"
        >
          <option value="ANY">Any node type</option>
          <option value="FILE">Files only</option>
          <option value="FOLDER">Folders only</option>
        </select>

        <label className="flex h-8 items-center gap-2 rounded-md border border-[#2a2d33] bg-[#0d0f12] px-2 text-xs text-zinc-300">
          <input type="checkbox" checked={includeDeleted} onChange={(event) => setIncludeDeleted(event.target.checked)} />
          Include deleted
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {allTags.slice(0, 10).map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] text-zinc-200",
              selectedTagSet.has(tag.id) ? "border-[#5b616b] bg-[#22262d]" : "border-[#2a2d33] bg-[#17191d]"
            )}
            onClick={() =>
              setRequiredTagIds((prev) =>
                prev.includes(tag.id) ? prev.filter((entry) => entry !== tag.id) : [...prev, tag.id]
              )
            }
          >
            {tag.name}
          </button>
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        className="mt-3 h-8 gap-1"
        onClick={() => {
          const nextName = name.trim();
          if (!nextName) {
            return;
          }
          void onCreate({
            name: nextName,
            nameContains: nameContains.trim() || undefined,
            nodeType: nodeType === "ANY" ? null : nodeType,
            extensions: extensionsCsv
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean),
            requiredTagIds,
            updatedWithinDays: updatedWithinDays.trim() ? Number(updatedWithinDays) : null,
            includeDeleted
          });
          setName("");
          setNameContains("");
          setExtensionsCsv("");
          setUpdatedWithinDays("");
          setNodeType("ANY");
          setIncludeDeleted(false);
          setRequiredTagIds([]);
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Save Smart Folder
      </Button>

      <div className="mt-3 max-h-44 space-y-1 overflow-y-auto">
        {smartFolders.map((folder) => (
          <div key={folder.id} className={cn("flex items-center justify-between rounded border px-2 py-1.5", activeSmartFolderId === folder.id ? "border-[#5b616b] bg-[#1e2127]" : "border-[#2a2d33] bg-[#111317]")}>
            <button type="button" className="min-w-0 text-left text-xs text-zinc-200" onClick={() => onActivate(folder.id)}>
              <p className="truncate">{folder.name}</p>
              <p className="truncate text-[10px] text-zinc-500">
                {folder.nodeType ?? "ANY"}{folder.extensions.length > 0 ? ` - ${folder.extensions.join(",")}` : ""}
              </p>
            </button>
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => onActivate(activeSmartFolderId === folder.id ? null : folder.id)}>
                {activeSmartFolderId === folder.id ? "Clear" : "Apply"}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-red-300 hover:bg-[#2f1f2a]" onClick={() => void onDelete(folder.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
