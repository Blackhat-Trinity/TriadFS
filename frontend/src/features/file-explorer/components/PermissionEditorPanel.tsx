import { useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PermissionEntry } from "@/types";

type PermissionType = "READ" | "WRITE" | "ADMIN";

interface PermissionEditorPanelProps {
  selectedNodeId: string | null;
  permissions: PermissionEntry[];
  onGrantUser: (userId: string, permissionType: PermissionType) => Promise<void> | void;
  onGrantRole: (roleName: string, permissionType: PermissionType) => Promise<void> | void;
  onRevoke: (permissionId: string) => Promise<void> | void;
}

export function PermissionEditorPanel({
  selectedNodeId,
  permissions,
  onGrantUser,
  onGrantRole,
  onRevoke
}: PermissionEditorPanelProps) {
  const [userId, setUserId] = useState("");
  const [roleName, setRoleName] = useState("ROLE_VIEWER");
  const [permissionType, setPermissionType] = useState<PermissionType>("READ");

  return (
    <section className="rounded-lg border border-[#2a2f38] bg-[#131922] p-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <KeyRound className="h-4 w-4 text-violet-300" />
        Access Control
      </h4>

      {selectedNodeId ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Grantee user UUID" className="h-8 border-[#2b313c] bg-[#0f141d] text-xs" />
            <select
              value={permissionType}
              onChange={(event) => setPermissionType(event.target.value as PermissionType)}
              className="h-8 rounded-md border border-[#2b313c] bg-[#0f141d] px-2 text-xs text-zinc-200"
            >
              <option value="READ">READ</option>
              <option value="WRITE">WRITE</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={() => {
                const value = userId.trim();
                if (!value) {
                  return;
                }
                void onGrantUser(value, permissionType);
                setUserId("");
              }}
            >
              Grant User
            </Button>
            <div className="flex items-center gap-2">
              <select
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                className="h-8 flex-1 rounded-md border border-[#2b313c] bg-[#0f141d] px-2 text-xs text-zinc-200"
              >
                <option value="ROLE_VIEWER">ROLE_VIEWER</option>
                <option value="ROLE_RESEARCHER">ROLE_RESEARCHER</option>
                <option value="ROLE_ADMIN">ROLE_ADMIN</option>
              </select>
              <Button type="button" size="sm" className="h-8" onClick={() => void onGrantRole(roleName, permissionType)}>
                Grant Role
              </Button>
            </div>
          </div>

          <div className="mt-3 max-h-44 space-y-1 overflow-y-auto">
            {permissions.length === 0 ? (
              <p className="text-xs text-zinc-500">No ACL overrides. File owner controls access.</p>
            ) : (
              permissions.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded border border-[#253041] bg-[#111723] px-2 py-1.5">
                  <div className="min-w-0 text-xs text-zinc-200">
                    <p className="truncate">
                      {entry.granteeUserEmail || entry.granteeRoleName || entry.granteeUserId || "Unknown target"}
                    </p>
                    <p className="text-[10px] text-zinc-500">{entry.permissionType}</p>
                  </div>
                  <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-red-300 hover:bg-[#2f1f2a]" onClick={() => void onRevoke(entry.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Select a node to manage ACLs.</p>
      )}
    </section>
  );
}
