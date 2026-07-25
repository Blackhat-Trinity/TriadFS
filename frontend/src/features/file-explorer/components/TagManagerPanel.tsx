import { useMemo, useState } from "react";
import { Plus, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FileTag } from "@/types";

interface TagManagerPanelProps {
  selectedNodeId: string | null;
  allTags: FileTag[];
  assignedTags: FileTag[];
  onCreateTag: (name: string, colorHex: string) => Promise<void> | void;
  onAssignTag: (tagId: string) => Promise<void> | void;
  onUnassignTag: (tagId: string) => Promise<void> | void;
  onDeleteTag: (tagId: string) => Promise<void> | void;
}

export function TagManagerPanel({
  selectedNodeId,
  allTags,
  assignedTags,
  onCreateTag,
  onAssignTag,
  onUnassignTag,
  onDeleteTag
}: TagManagerPanelProps) {
  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState("#4f46e5");
  const assignedIds = useMemo(() => new Set(assignedTags.map((tag) => tag.id)), [assignedTags]);

  return (
    <section className="rounded-lg border border-[#2a2f38] bg-[#131922] p-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Tag className="h-4 w-4 text-sky-300" />
          Tags
        </h4>
        <span className="text-xs text-zinc-500">{allTags.length} total</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Create tag"
          className="h-8 border-[#2b313c] bg-[#0f141d] text-xs"
        />
        <input
          type="color"
          value={colorHex}
          onChange={(event) => setColorHex(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-[#2b313c] bg-[#0f141d]"
        />
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={() => {
            const nextName = name.trim();
            if (!nextName) {
              return;
            }
            void onCreateTag(nextName, colorHex);
            setName("");
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {assignedTags.length > 0 ? (
          assignedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="flex items-center gap-1 border border-[#2e3b4d] bg-[#1a2433] text-zinc-100">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.colorHex }} />
              {tag.name}
              {selectedNodeId && (
                <button type="button" className="opacity-70 hover:opacity-100" onClick={() => void onUnassignTag(tag.id)}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-zinc-500">{selectedNodeId ? "No tags assigned" : "Select an item to manage tags"}</span>
        )}
      </div>

      <div className="mt-3 max-h-44 space-y-1 overflow-y-auto">
        {allTags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between rounded border border-[#253041] bg-[#111723] px-2 py-1.5">
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 text-left text-xs text-zinc-200"
              onClick={() => {
                if (!selectedNodeId) {
                  return;
                }
                if (assignedIds.has(tag.id)) {
                  void onUnassignTag(tag.id);
                } else {
                  void onAssignTag(tag.id);
                }
              }}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.colorHex }} />
              <span className="truncate">{tag.name}</span>
              <span className="text-zinc-500">({tag.usageCount})</span>
            </button>
            <div className="flex items-center gap-1">
              {selectedNodeId && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px] text-zinc-300 hover:bg-[#253041]"
                  onClick={() => void (assignedIds.has(tag.id) ? onUnassignTag(tag.id) : onAssignTag(tag.id))}
                >
                  {assignedIds.has(tag.id) ? "Detach" : "Attach"}
                </Button>
              )}
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-red-300 hover:bg-[#2f1f2a]" onClick={() => void onDeleteTag(tag.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
