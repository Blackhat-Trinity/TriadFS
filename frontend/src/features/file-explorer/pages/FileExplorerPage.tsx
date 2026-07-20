import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowDownAZ,
  ArrowUp,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  Folder,
  FolderClosed,
  Grid2x2,
  HardDriveDownload,
  Home,
  Info,
  Layers3,
  LayoutGrid,
  LayoutList,
  LoaderCircle,
  MemoryStick,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  Share2,
  Sparkles,
  SquareTerminal,
  Star,
  Trash2,
  X
} from "lucide-react";
import {
  assignTagToNode,
  createFolder,
  createSmartFolder,
  createTag,
  deleteSmartFolder,
  deleteTag,
  downloadFileVersion,
  fetchFileTree,
  fetchNodeTags,
  fetchPermissions,
  fetchSmartFolders,
  fetchTags,
  fetchFileVersions,
  grantRolePermission,
  grantUserPermission,
  hardDeleteNode,
  initUploadNode,
  moveNode,
  renameNode,
  resolveSmartFolder,
  revokePermission,
  restoreNode,
  searchNodes,
  softDeleteNode,
  unassignTagFromNode
} from "@/api/files";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { demoTree } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExplorerScopeTabs, type ExplorerScope } from "@/features/file-explorer/components/ExplorerScopeTabs";
import { PermissionEditorPanel } from "@/features/file-explorer/components/PermissionEditorPanel";
import { PropertiesDialog } from "@/features/file-explorer/components/PropertiesDialog";
import { SmartFoldersPanel } from "@/features/file-explorer/components/SmartFoldersPanel";
import { TagManagerPanel } from "@/features/file-explorer/components/TagManagerPanel";
import type { DesktopCapabilities, DesktopPathMetadata, DesktopPathPreview, DesktopSpecialPaths, DesktopTrashEntry, FileNode, FileTag, FileVersion, PermissionEntry } from "@/types";

interface ExplorerNode {
  id: string;
  parentId: string | null;
  nodeType: "FILE" | "FOLDER";
  name: string;
  updatedAt: string;
  deleted: boolean;
  sizeBytes: number;
  source: "remote" | "local" | "desktop";
  originalPath?: string | null;
  deletedAt?: string | null;
}

interface DesktopFsEntry {
  name: string;
  path: string;
  nodeType: "FILE" | "FOLDER";
  sizeBytes: number;
  updatedAt: string;
}

interface ExplorerLocation {
  mode: "folder" | "trash";
  folderId: string | null;
}

interface NotificationItem {
  id: string;
  message: string;
  tone: "info" | "success" | "error";
}

interface ClipboardState {
  mode: "copy" | "cut";
  ids: string[];
}

interface ExplorerTab {
  id: string;
  location: ExplorerLocation;
  locked?: boolean;
}

interface DialogState {
  mode: "new-folder" | "new-file" | "rename";
  value: string;
}

interface MoveDialogState {
  mode: "move" | "copy";
  ids: string[];
  destinationId: string | null;
}

interface InlineEditState {
  mode: "new-folder" | "new-file" | "rename";
  value: string;
  targetId: string | null;
}

interface MarqueeState {
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
}

type SortKey = "name" | "modified" | "size" | "type";
type SortDirection = "asc" | "desc";
type TypeFilter = "all" | "folder" | "file";
type ScopeFilter = ExplorerScope;

const ROOT_KEY = "__root__";
const DESKTOP_TRASH_PARENT_KEY = "__triadfs_desktop_trash__";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function seedFrom(value: string): number {
  return Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function inferSizeBytes(id: string, nodeType: "FILE" | "FOLDER"): number {
  if (nodeType === "FOLDER") {
    return 0;
  }
  const seed = seedFrom(id);
  return 1_024 * 1_024 * (2 + (seed % 900));
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "-";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit <= 1 ? 0 : 2)} ${units[unit]}`;
}

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }
  return parsed.toLocaleString();
}

function isPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toUpperCase();
  return message.includes("EPERM") || message.includes("EACCES") || message.includes("ACCESS IS DENIED");
}

function normalizeTree(nodes: FileNode[], parentId: string | null = null, list: ExplorerNode[] = []): ExplorerNode[] {
  nodes.forEach((node) => {
    const effectiveParentId = node.parentId ?? parentId;
    const updatedAt = node.updatedAt ?? new Date(Date.now() - seedFrom(node.id) * 1_000).toISOString();
    list.push({
      id: node.id,
      parentId: effectiveParentId,
      nodeType: node.nodeType,
      name: node.name,
      updatedAt,
      deleted: node.deleted ?? false,
      sizeBytes: inferSizeBytes(node.id, node.nodeType),
      source: "remote"
    });

    if (node.children.length > 0) {
      normalizeTree(node.children, node.id, list);
    }
  });
  return list;
}

function buildChildrenByParent(nodes: ExplorerNode[]): Record<string, ExplorerNode[]> {
  const map: Record<string, ExplorerNode[]> = {};
  for (const node of nodes) {
    const key = node.parentId ?? ROOT_KEY;
    map[key] = map[key] ?? [];
    map[key].push(node);
  }
  return map;
}

function buildPathById(nodes: ExplorerNode[]): Record<string, string> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const memo: Record<string, string> = {};

  const resolve = (id: string): string => {
    if (memo[id]) {
      return memo[id];
    }
    const node = byId.get(id);
    if (!node) {
      return "/";
    }
    if (node.source === "desktop") {
      memo[id] = node.id;
      return memo[id];
    }
    if (!node.parentId) {
      memo[id] = `/${node.name}`;
      return memo[id];
    }
    const parentPath = resolve(node.parentId);
    memo[id] = `${parentPath}/${node.name}`;
    return memo[id];
  };

  nodes.forEach((node) => {
    memo[node.id] = resolve(node.id);
  });

  return memo;
}
function splitName(name: string): { base: string; ext: string } {
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) {
    return { base: name, ext: "" };
  }
  return { base: name.slice(0, idx), ext: name.slice(idx) };
}

function replaceChildren(nodes: ExplorerNode[], parentId: string, nextChildren: ExplorerNode[]): ExplorerNode[] {
  const directChildren = nodes.filter((node) => node.parentId === parentId).map((node) => node.id);
  const remove = new Set<string>(directChildren);

  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const node of nodes) {
      if (node.parentId && remove.has(node.parentId) && !remove.has(node.id)) {
        remove.add(node.id);
        expanded = true;
      }
    }
  }

  return [...nodes.filter((node) => !remove.has(node.id)), ...nextChildren];
}

function uniqueName(nodes: ExplorerNode[], parentId: string | null, desired: string, excludeId?: string): string {
  const taken = new Set(
    nodes
      .filter((node) => !node.deleted && node.parentId === parentId && node.id !== excludeId)
      .map((node) => node.name.toLowerCase())
  );

  if (!taken.has(desired.toLowerCase())) {
    return desired;
  }

  const { base, ext } = splitName(desired);
  let idx = 2;
  while (taken.has(`${base} (${idx})${ext}`.toLowerCase())) {
    idx += 1;
  }
  return `${base} (${idx})${ext}`;
}

function dedupeSelectionRoots(ids: string[], nodeById: Record<string, ExplorerNode>): string[] {
  const selected = new Set(ids);
  return ids.filter((id) => {
    let cursor = nodeById[id]?.parentId ?? null;
    while (cursor) {
      if (selected.has(cursor)) {
        return false;
      }
      cursor = nodeById[cursor]?.parentId ?? null;
    }
    return true;
  });
}

function isDescendant(candidateId: string | null, ancestorId: string, nodeById: Record<string, ExplorerNode>): boolean {
  if (!candidateId) {
    return false;
  }
  let cursor: string | null = candidateId;
  while (cursor) {
    if (cursor === ancestorId) {
      return true;
    }
    cursor = nodeById[cursor]?.parentId ?? null;
  }
  return false;
}

function collectAncestorChain(nodeId: string | null, nodeById: Record<string, ExplorerNode>): string[] {
  if (!nodeId) {
    return [];
  }

  const chain: string[] = [];
  let cursor: string | null = nodeId;

  while (cursor) {
    chain.unshift(cursor);
    cursor = nodeById[cursor]?.parentId ?? null;
  }

  return chain;
}

function pathBaseName(targetPath: string): string {
  const normalized = targetPath.replace(/[\\/]+$/, "");
  const parts = normalized.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? normalized;
}

function moveDesktopNodeBranch(nodes: ExplorerNode[], sourceId: string, destinationParentId: string): ExplorerNode[] {
  const sourceNode = nodes.find((node) => node.id === sourceId);
  if (!sourceNode) {
    return nodes;
  }

  const nextRootId = joinDesktopPath(destinationParentId, pathBaseName(sourceNode.id) || sourceNode.name);
  const branchIds = new Set<string>([sourceId]);

  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const node of nodes) {
      if (node.parentId && branchIds.has(node.parentId) && !branchIds.has(node.id)) {
        branchIds.add(node.id);
        expanded = true;
      }
    }
  }

  const remapPath = (value: string | null) => {
    if (!value) {
      return value;
    }
    if (value === sourceId) {
      return nextRootId;
    }
    return value.startsWith(sourceId) ? `${nextRootId}${value.slice(sourceId.length)}` : value;
  };

  return nodes.map((node) => {
    if (!branchIds.has(node.id)) {
      return node;
    }

    const isRoot = node.id === sourceId;
    const remappedId = remapPath(node.id) ?? node.id;
    return {
      ...node,
      id: remappedId,
      parentId: isRoot ? destinationParentId : remapPath(node.parentId),
      name: isRoot ? pathBaseName(remappedId) || node.name : node.name,
      updatedAt: new Date().toISOString()
    };
  });
}

function joinDesktopPath(parentPath: string, childName: string): string {
  if (/^[A-Za-z]:\\?$/.test(parentPath)) {
    return parentPath.endsWith("\\") ? `${parentPath}${childName}` : `${parentPath}\\${childName}`;
  }
  if (parentPath === "/") {
    return `/${childName}`;
  }
  const separator = parentPath.includes("\\") ? "\\" : "/";
  return parentPath.endsWith(separator) ? `${parentPath}${childName}` : `${parentPath}${separator}${childName}`;
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function extractDroppedPaths(dataTransfer: DataTransfer): string[] {
  return Array.from(dataTransfer.files)
    .map((file) => (file as File & { path?: string }).path)
    .filter((value): value is string => Boolean(value));
}

function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx < 0 || idx === name.length - 1) {
    return "";
  }
  return name.slice(idx + 1).toLowerCase();
}

function intersectsRect(a: DOMRect, b: DOMRect): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function canRenameNode(node: ExplorerNode | null): boolean {
  if (!node) {
    return false;
  }
  if (node.source === "desktop" && node.parentId === null) {
    return false;
  }
  return true;
}

function normalizeLookupPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const collapsed = trimmed.replace(/[\\/]+/g, "/");
  if (/^[A-Za-z]:\//.test(collapsed)) {
    return collapsed.replace(/\//g, "\\");
  }
  return collapsed;
}

function parentDirectoryOf(targetPath: string): string | null {
  const normalized = targetPath.replace(/[\\/]+$/, "");
  if (!normalized) {
    return null;
  }
  if (/^[A-Za-z]:$/.test(normalized)) {
    return null;
  }

  const index = Math.max(normalized.lastIndexOf("\\"), normalized.lastIndexOf("/"));
  if (index < 0) {
    return null;
  }
  if (index === 2 && /^[A-Za-z]:/.test(normalized)) {
    return normalized.slice(0, 3);
  }
  if (index === 0) {
    return normalized.slice(0, 1);
  }
  return normalized.slice(0, index);
}

export function FileExplorerPage() {
  const logoSrc = `${import.meta.env.BASE_URL}assets/TriadFS_logo.png`;
  const desktopApi = (window as unknown as {
    triadfsDesktop?: {
      explorer?: {
        onOpenPathRequest?: (callback: (targetPath: string) => void) => () => void;
      };
      windowControls?: {
        minimize?: () => void;
        maximizeToggle?: () => void;
        close?: () => void;
        newExplorerWindow?: (targetPath?: string | null) => Promise<{ opened: boolean }>;
      };
      fileSystem?: {
        listRoots?: () => Promise<DesktopFsEntry[]>;
        listDirectory?: (targetPath: string) => Promise<DesktopFsEntry[]>;
        openPath?: (targetPath: string) => Promise<{ ok: boolean; error?: string | null }>;
        createFolder?: (parentPath: string, name: string) => Promise<{ path: string }>;
        createFile?: (parentPath: string, name: string) => Promise<{ path: string }>;
        renamePath?: (targetPath: string, newName: string) => Promise<{ path: string }>;
        listTrash?: () => Promise<DesktopTrashEntry[]>;
        moveToTrash?: (targetPath: string) => Promise<{ trashedPath: string; originalPath: string; deletedAt: string }>;
        restoreTrashPath?: (trashedPath: string) => Promise<{ path: string; originalPath: string }>;
        deleteTrashedPath?: (trashedPath: string) => Promise<{ deleted: boolean }>;
        deletePath?: (targetPath: string) => Promise<{ deleted: boolean }>;
        movePath?: (sourcePath: string, destinationDirectory: string) => Promise<{ path: string }>;
        copyPath?: (sourcePath: string, destinationDirectory: string) => Promise<{ path: string }>;
        duplicatePath?: (sourcePath: string) => Promise<{ path: string }>;
        copyText?: (text: string) => Promise<{ copied: boolean }>;
        revealPath?: (targetPath: string) => Promise<{ revealed: boolean }>;
        getSpecialPaths?: () => Promise<DesktopSpecialPaths>;
        getCapabilities?: () => Promise<DesktopCapabilities>;
        pickDirectory?: (defaultPath?: string | null) => Promise<{ path: string | null }>;
        watchPath?: (targetPath: string) => Promise<{ watching: boolean; path: string }>;
        unwatchPath?: (targetPath: string) => Promise<{ watching: boolean; path: string }>;
        openInTerminal?: (targetPath: string) => Promise<{ opened: boolean }>;
        openWithCode?: (targetPath: string) => Promise<{ opened: boolean }>;
        compressPaths?: (targetPaths: string[]) => Promise<{ path: string }>;
        createShortcut?: (targetPath: string, destinationDirectory?: string | null) => Promise<{ path: string }>;
        getMetadata?: (targetPath: string) => Promise<DesktopPathMetadata>;
        getPreview?: (targetPath: string) => Promise<DesktopPathPreview>;
        onPathChanged?: (callback: (payload: { path: string; fileName?: string | null }) => void) => () => void;
        onPathWatchError?: (callback: (payload: { path: string }) => void) => () => void;
      };
    };
  }).triadfsDesktop;
  const isDesktopFs = Boolean(desktopApi?.fileSystem?.listRoots && desktopApi?.fileSystem?.listDirectory);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const contentSurfaceRef = useRef<HTMLDivElement>(null);
  const newMenuButtonRef = useRef<HTMLButtonElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const itemElementRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const watchRefreshTimeoutsRef = useRef<Record<string, number>>({});
  const [nodes, setNodes] = useState<ExplorerNode[]>([]);
  const [location, setLocation] = useState<ExplorerLocation>({ mode: "folder", folderId: null });
  const currentFolderId = location.mode === "folder" ? location.folderId : null;
  const [backStack, setBackStack] = useState<ExplorerLocation[]>([]);
  const [forwardStack, setForwardStack] = useState<ExplorerLocation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"details" | "tiles">("details");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddressEditing, setIsAddressEditing] = useState(false);
  const [addressValue, setAddressValue] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [showDetailsPane, setShowDetailsPane] = useState(true);
  const [clipboardState, setClipboardState] = useState<ClipboardState | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dragHoverFolderId, setDragHoverFolderId] = useState<string | null>(null);
  const [contentDropActive, setContentDropActive] = useState(false);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [sharedIds, setSharedIds] = useState<string[]>([]);
  const [quickAccessIds, setQuickAccessIds] = useState<string[]>([]);
  const [showQuickAccessSection, setShowQuickAccessSection] = useState(true);
  const [showPinnedSection, setShowPinnedSection] = useState(true);
  const [moveDialogState, setMoveDialogState] = useState<MoveDialogState | null>(null);
  const [moveDialogExpandedFolders, setMoveDialogExpandedFolders] = useState<string[]>([]);
  const [explorerTabs, setExplorerTabs] = useState<ExplorerTab[]>([
    { id: "tab-home", location: { mode: "folder", folderId: null }, locked: true },
    { id: "tab-trash", location: { mode: "trash", folderId: null }, locked: true }
  ]);
  const [activeTabId, setActiveTabId] = useState("tab-home");
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [assignedTags, setAssignedTags] = useState<FileTag[]>([]);
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [activeSmartFolderId, setActiveSmartFolderId] = useState<string | null>(null);
  const [smartFolderItems, setSmartFolderItems] = useState<ExplorerNode[] | null>(null);
  const [desktopRootsLoaded, setDesktopRootsLoaded] = useState(false);
  const [desktopCapabilities, setDesktopCapabilities] = useState<DesktopCapabilities>({
    canOpenInTerminal: false,
    canOpenWithCode: false,
    canCreateArchive: false,
    canCreateShortcut: false,
    canPickDirectory: false
  });
  const [desktopSpecialPaths, setDesktopSpecialPaths] = useState<DesktopSpecialPaths>({
    home: null,
    desktop: null,
    documents: null,
    downloads: null
  });
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesMetadata, setPropertiesMetadata] = useState<DesktopPathMetadata | null>(null);
  const [propertiesPathLabel, setPropertiesPathLabel] = useState<string | null>(null);
  const [detailsMetadata, setDetailsMetadata] = useState<DesktopPathMetadata | null>(null);
  const [detailsPreview, setDetailsPreview] = useState<DesktopPathPreview | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [pendingDesktopSelectionId, setPendingDesktopSelectionId] = useState<string | null>(null);

  const treeQuery = useQuery({ queryKey: ["file-tree"], queryFn: fetchFileTree, retry: 0, enabled: !isDesktopFs });
  const tagsQuery = useQuery({ queryKey: ["file-tags"], queryFn: fetchTags, retry: 0, staleTime: 15_000, enabled: !isDesktopFs });
  const smartFoldersQuery = useQuery({
    queryKey: ["smart-folders"],
    queryFn: fetchSmartFolders,
    retry: 0,
    staleTime: 15_000,
    enabled: !isDesktopFs
  });
  const searchQuery = useQuery({
    queryKey: ["file-search", deferredSearchTerm],
    queryFn: () => searchNodes(deferredSearchTerm.trim()),
    enabled: !isDesktopFs && deferredSearchTerm.trim().length >= 2,
    staleTime: 10_000,
    retry: 0
  });

  useEffect(() => {
    try {
      setRecentIds(JSON.parse(localStorage.getItem("triadfs-recent") ?? "[]"));
      setFavoriteIds(JSON.parse(localStorage.getItem("triadfs-favorites") ?? "[]"));
      setSharedIds(JSON.parse(localStorage.getItem("triadfs-shared") ?? "[]"));
      setQuickAccessIds(JSON.parse(localStorage.getItem("triadfs-quick-access") ?? "[]"));
    } catch {
      setRecentIds([]);
      setFavoriteIds([]);
      setSharedIds([]);
      setQuickAccessIds([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("triadfs-recent", JSON.stringify(recentIds));
  }, [recentIds]);

  useEffect(() => {
    localStorage.setItem("triadfs-favorites", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    localStorage.setItem("triadfs-shared", JSON.stringify(sharedIds));
  }, [sharedIds]);

  useEffect(() => {
    localStorage.setItem("triadfs-quick-access", JSON.stringify(quickAccessIds));
  }, [quickAccessIds]);

  useEffect(() => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.getCapabilities) {
      return;
    }

    void desktopApi.fileSystem
      .getCapabilities()
      .then(setDesktopCapabilities)
      .catch(() =>
        setDesktopCapabilities({
          canOpenInTerminal: false,
          canOpenWithCode: false,
          canCreateArchive: false,
          canCreateShortcut: false,
          canPickDirectory: false
        })
      );
  }, [desktopApi, isDesktopFs]);

  useEffect(() => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.getSpecialPaths) {
      return;
    }

    void desktopApi.fileSystem
      .getSpecialPaths()
      .then(setDesktopSpecialPaths)
      .catch(() =>
        setDesktopSpecialPaths({
          home: null,
          desktop: null,
          documents: null,
          downloads: null
        })
      );
  }, [desktopApi, isDesktopFs]);

  useEffect(() => {
    if (isDesktopFs) {
      if (desktopRootsLoaded) {
        return;
      }

      void desktopApi!.fileSystem!.listRoots!()
        .then((entries) => {
          const desktopNodes: ExplorerNode[] = entries.map((entry) => ({
            id: entry.path,
            parentId: null,
            nodeType: "FOLDER",
            name: entry.name,
            updatedAt: entry.updatedAt,
            deleted: false,
            sizeBytes: 0,
            source: "desktop"
          }));
          setNodes(desktopNodes);
          setDesktopRootsLoaded(true);
          void refreshDesktopTrash();
        })
        .catch(() => {
          setNodes([]);
          setDesktopRootsLoaded(true);
        });
      return;
    }

    setDesktopRootsLoaded(false);

    if (treeQuery.data) {
      setNodes(normalizeTree(treeQuery.data));
      return;
    }
    if (!treeQuery.isLoading && nodes.length === 0) {
      setNodes(normalizeTree(demoTree));
    }
  }, [desktopRootsLoaded, isDesktopFs, treeQuery.data, treeQuery.isLoading]);

  useEffect(() => {
    if (!isDesktopFs) {
      return;
    }

    void refreshDesktopTrash();
  }, [isDesktopFs]);

  useEffect(() => {
    if (!isDesktopFs || location.mode !== "folder" || !location.folderId) {
      return;
    }

    void desktopApi!.fileSystem!.listDirectory!(location.folderId)
      .then((entries) => {
        const children = entries.map((entry) => ({
          id: entry.path,
          parentId: location.folderId,
          nodeType: entry.nodeType,
          name: entry.name,
          updatedAt: entry.updatedAt,
          deleted: false,
          sizeBytes: entry.sizeBytes,
          source: "desktop" as const
        }));
        setNodes((prev) => replaceChildren(prev, location.folderId!, children));
      })
      .catch(() => {
        pushNotice(`Could not read ${location.folderId}`, "error");
      });
  }, [desktopApi, isDesktopFs, location.folderId, location.mode]);

  useEffect(() => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.watchPath || !desktopApi.fileSystem.unwatchPath || !desktopApi.fileSystem.onPathChanged) {
      return;
    }

    const watchedPaths = new Set<string>();
    const scheduleRefresh = (targetPath: string) => {
      const existing = watchRefreshTimeoutsRef.current[targetPath];
      if (existing) {
        window.clearTimeout(existing);
      }

      watchRefreshTimeoutsRef.current[targetPath] = window.setTimeout(() => {
        delete watchRefreshTimeoutsRef.current[targetPath];
        void refreshDesktopLocation(targetPath);
      }, 120);
    };

    const subscribe = async (targetPath: string | null) => {
      if (!targetPath || watchedPaths.has(targetPath)) {
        return;
      }
      try {
        await desktopApi.fileSystem!.watchPath!(targetPath);
        watchedPaths.add(targetPath);
      } catch {
        // ignore non-watchable paths
      }
    };

    void subscribe(currentFolderId);
    if (!currentFolderId) {
      void subscribe(desktopSpecialPaths.home);
    }

    const removeChangeListener = desktopApi.fileSystem.onPathChanged((payload) => {
      if (!payload.path || !watchedPaths.has(payload.path)) {
        return;
      }
      scheduleRefresh(payload.path);
    });

    const removeErrorListener = desktopApi.fileSystem.onPathWatchError?.((payload) => {
      if (payload.path) {
        pushNotice(`Live watch lost for ${payload.path}`, "info");
      }
    });

    return () => {
      removeChangeListener();
      removeErrorListener?.();
      for (const targetPath of watchedPaths) {
        void desktopApi.fileSystem!.unwatchPath!(targetPath);
      }
      for (const timeout of Object.values(watchRefreshTimeoutsRef.current)) {
        window.clearTimeout(timeout);
      }
      watchRefreshTimeoutsRef.current = {};
    };
  }, [currentFolderId, desktopApi, desktopSpecialPaths.home, isDesktopFs, location.mode]);

  useEffect(() => {
    if (isDesktopFs) {
      setSmartFolderItems(null);
      return;
    }

    if (!activeSmartFolderId) {
      setSmartFolderItems(null);
      return;
    }

    void resolveSmartFolder(activeSmartFolderId)
      .then((result) => setSmartFolderItems(normalizeTree(result)))
      .catch(() => {
        setSmartFolderItems(null);
        pushNotice("Smart folder resolution failed", "error");
      });
  }, [activeSmartFolderId, isDesktopFs]);

  const nodeById = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])) as Record<string, ExplorerNode>, [nodes]);
  const childrenByParent = useMemo(() => buildChildrenByParent(nodes), [nodes]);
  const pathById = useMemo(() => buildPathById(nodes), [nodes]);
  const pathToId = useMemo(() => Object.fromEntries(Object.entries(pathById).map(([id, path]) => [path, id])) as Record<string, string>, [pathById]);

  const isHomeView = location.mode === "folder" && currentFolderId === null;
  const currentAddressPath = useMemo(() => {
    if (location.mode === "trash") {
      return "Recycle Bin";
    }
    if (isDesktopFs) {
      return currentFolderId ?? desktopSpecialPaths.home ?? "Home";
    }
    return currentFolderId ? pathById[currentFolderId] ?? "/" : "/";
  }, [currentFolderId, desktopSpecialPaths.home, isDesktopFs, location.mode, pathById]);
  const quickAccessFolders = useMemo(
    () =>
      quickAccessIds
        .map((id) => {
          const existing = nodeById[id];
          if (existing && !existing.deleted && existing.nodeType === "FOLDER") {
            return existing;
          }

          return {
            id,
            parentId: null,
            nodeType: "FOLDER" as const,
            name: id.split(/[\\/]/).pop() ?? id,
            updatedAt: new Date().toISOString(),
            deleted: false,
            sizeBytes: 0,
            source: isDesktopFs ? ("desktop" as const) : ("remote" as const)
          };
        })
        .filter((node): node is ExplorerNode => Boolean(node)),
    [isDesktopFs, nodeById, quickAccessIds]
  );

  useEffect(() => {
    setExplorerTabs((prev) => prev.map((tab) => (tab.id === activeTabId ? { ...tab, location } : tab)));
  }, [activeTabId, location]);

  useEffect(() => {
    if (!currentFolderId || !nodeById[currentFolderId]) {
      return;
    }

    const ancestors: string[] = [];
    let cursor = nodeById[currentFolderId]?.parentId ?? null;
    while (cursor) {
      ancestors.push(cursor);
      cursor = nodeById[cursor]?.parentId ?? null;
    }

    if (ancestors.length === 0) {
      return;
    }

    setExpandedFolders((prev) => {
      const merged = new Set(prev);
      ancestors.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  }, [currentFolderId, nodeById]);

  useEffect(() => {
    if (!pendingDesktopSelectionId) {
      return;
    }

    const target = nodeById[pendingDesktopSelectionId];
    if (!target) {
      return;
    }

    setSelectedIds([pendingDesktopSelectionId]);
    setAnchorId(pendingDesktopSelectionId);
    setPendingDesktopSelectionId(null);
  }, [nodeById, pendingDesktopSelectionId]);

  useEffect(() => {
    if (!inlineEdit) {
      return;
    }

    const timeout = window.setTimeout(() => {
      inlineInputRef.current?.focus();
      inlineInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [inlineEdit]);

  useEffect(() => {
    setInlineEdit(null);
    setMarquee(null);
    setContentDropActive(false);
    setDragHoverFolderId(null);
  }, [location.mode, location.folderId, viewMode]);

  useEffect(() => {
    if (!isAddressEditing) {
      setAddressValue(currentAddressPath);
      return;
    }

    const timeout = window.setTimeout(() => {
      addressInputRef.current?.focus();
      addressInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [currentAddressPath, isAddressEditing]);

  const pushNotice = (message: string, tone: NotificationItem["tone"] = "info") => {
    const id = makeId();
    setNotifications((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  };

  const registerItemElement = (id: string) => (element: HTMLButtonElement | null) => {
    itemElementRefs.current[id] = element;
  };

  const clearDragState = () => {
    setDraggingId(null);
    setDraggingIds([]);
    setDragHoverFolderId(null);
    setContentDropActive(false);
  };

  const beginNodeDrag = (nodeId: string, event: React.DragEvent<HTMLElement>) => {
    const dragIds = dedupeSelectionRoots(selectedIds.includes(nodeId) ? selectedIds : [nodeId], nodeById);
    const label = dragIds.length > 1 ? `${dragIds.length} items` : nodeById[nodeId]?.name ?? "item";
    setDraggingId(nodeId);
    setDraggingIds(dragIds);
    setSelectedIds(dragIds);
    setAnchorId(nodeId);
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData("text/plain", label);
  };

  const beginInlineCreate = (mode: "new-folder" | "new-file") => {
    if (location.mode !== "folder") {
      pushNotice("Switch to a folder to create new items", "info");
      return;
    }

    setScopeFilter("all");
    setTypeFilter("all");
    setInlineEdit({
      mode,
      value: mode === "new-folder" ? "New Folder" : "New File.txt",
      targetId: null
    });
    setShowNewMenu(false);
  };

  const beginInlineRename = (node: ExplorerNode | null) => {
    if (!node || !canRenameNode(node)) {
      pushNotice(node ? "This location cannot be renamed" : "Select a single item to rename", "info");
      return;
    }
    const renameTarget = node;

    setInlineEdit({
      mode: "rename",
      value: renameTarget.name,
      targetId: renameTarget.id
    });
    setShowNewMenu(false);
  };

  const cancelInlineEdit = () => {
    setInlineEdit(null);
  };

  const resolveCreateParentId = () => {
    if (location.mode !== "folder") {
      return undefined;
    }
    if (isDesktopFs) {
      return currentFolderId ?? desktopSpecialPaths.home ?? undefined;
    }
    return currentFolderId ?? null;
  };

  const canCreateInCurrentLocation = useMemo(() => {
    if (location.mode !== "folder") {
      return false;
    }
    if (isDesktopFs) {
      return Boolean(currentFolderId ?? desktopSpecialPaths.home);
    }
    return true;
  }, [currentFolderId, desktopSpecialPaths.home, isDesktopFs, location.mode]);

  const handleContentDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (location.mode !== "folder") {
      return;
    }
    const droppedPaths = extractDroppedPaths(event.dataTransfer);
    const hasInternalDrag = draggingIds.length > 0 || draggingId !== null;
    if (!hasInternalDrag && droppedPaths.length === 0) {
      return;
    }
    event.preventDefault();
    setContentDropActive(true);
    event.dataTransfer.dropEffect = droppedPaths.length > 0 ? "copy" : "move";
  };

  const handleContentDrop = (event: React.DragEvent<HTMLElement>) => {
    if (location.mode !== "folder") {
      return;
    }
    event.preventDefault();
    const destinationFolderId = currentFolderId ?? desktopSpecialPaths.home ?? null;
    setContentDropActive(false);
    setDragHoverFolderId(null);
    if (!destinationFolderId) {
      clearDragState();
      pushNotice("Open a folder before dropping items here", "info");
      return;
    }

    const droppedPaths = extractDroppedPaths(event.dataTransfer);
    if (droppedPaths.length > 0) {
      clearDragState();
      void importDroppedPaths(droppedPaths, destinationFolderId);
      return;
    }

    moveDraggedNode(destinationFolderId);
  };

  const resolveLocationLabel = (entry: ExplorerLocation): string => {
    if (entry.mode === "trash") {
      return "Recycle Bin";
    }
    if (!entry.folderId) {
      return "Home";
    }
    return nodeById[entry.folderId]?.name ?? pathById[entry.folderId]?.split(/[/\\]/).pop() ?? "Folder";
  };

  const activateTab = (tabId: string) => {
    const nextTab = explorerTabs.find((entry) => entry.id === tabId);
    if (!nextTab) {
      return;
    }

    setActiveTabId(tabId);
    setLocation(nextTab.location);
    setSelectedIds([]);
    setAnchorId(null);
  };

  const reorderTabs = (sourceTabId: string, targetTabId: string) => {
    if (sourceTabId === targetTabId) {
      return;
    }
    setExplorerTabs((prev) => {
      const fromIndex = prev.findIndex((entry) => entry.id === sourceTabId);
      const toIndex = prev.findIndex((entry) => entry.id === targetTabId);
      return moveArrayItem(prev, fromIndex, toIndex);
    });
  };

  const openLocationInNewTab = (next: ExplorerLocation) => {
    const matching = explorerTabs.find(
      (tab) => tab.location.mode === next.mode && tab.location.folderId === next.folderId
    );
    if (matching) {
      activateTab(matching.id);
      return;
    }

    const nextTabId = makeId();
    setExplorerTabs((prev) => [...prev, { id: nextTabId, location: next }]);
    setActiveTabId(nextTabId);
    setLocation(next);
    setSelectedIds([]);
    setAnchorId(null);
  };

  const closeTab = (tabId: string) => {
    const currentIndex = explorerTabs.findIndex((entry) => entry.id === tabId);
    const currentTab = explorerTabs[currentIndex];
    if (!currentTab || currentTab.locked) {
      return;
    }

    const nextTabs = explorerTabs.filter((entry) => entry.id !== tabId);
    setExplorerTabs(nextTabs);
    if (activeTabId !== tabId) {
      return;
    }

    const fallback = nextTabs[Math.max(0, currentIndex - 1)] ?? nextTabs[0];
    if (fallback) {
      setActiveTabId(fallback.id);
      setLocation(fallback.location);
      setSelectedIds([]);
      setAnchorId(null);
    }
  };

  const refreshDesktopLocation = async (folderId: string | null = currentFolderId) => {
    if (!isDesktopFs || !desktopApi?.fileSystem) {
      return;
    }

    if (!folderId) {
      const entries = await desktopApi.fileSystem.listRoots!();
      const desktopNodes: ExplorerNode[] = entries.map((entry) => ({
        id: entry.path,
        parentId: null,
        nodeType: "FOLDER",
        name: entry.name,
        updatedAt: entry.updatedAt,
        deleted: false,
        sizeBytes: 0,
        source: "desktop"
      }));
      setNodes(desktopNodes);
      setDesktopRootsLoaded(true);
      return;
    }

    const entries = await desktopApi.fileSystem.listDirectory!(folderId);
    const children: ExplorerNode[] = entries.map((entry) => ({
      id: entry.path,
      parentId: folderId,
      nodeType: entry.nodeType,
      name: entry.name,
      updatedAt: entry.updatedAt,
      deleted: false,
      sizeBytes: entry.sizeBytes,
      source: "desktop"
    }));
    setNodes((prev) => replaceChildren(prev, folderId, children));
  };

  const refreshDesktopTrash = async () => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.listTrash) {
      return;
    }

    const entries = await desktopApi.fileSystem.listTrash();
    const trashNodes: ExplorerNode[] = entries.map((entry) => ({
      id: entry.trashedPath,
      parentId: DESKTOP_TRASH_PARENT_KEY,
      nodeType: entry.nodeType,
      name: entry.name,
      updatedAt: entry.updatedAt,
      deleted: true,
      sizeBytes: entry.sizeBytes,
      source: "desktop",
      originalPath: entry.originalPath,
      deletedAt: entry.deletedAt
    }));

    setNodes((prev) => [
      ...prev.filter((node) => node.parentId !== DESKTOP_TRASH_PARENT_KEY),
      ...trashNodes
    ]);
  };

  const navigateToDesktopFolder = (folderPath: string | null) => {
    if (!isDesktopFs || !folderPath) {
      return false;
    }

    navigateTo({ mode: "folder", folderId: folderPath });
    void refreshDesktopLocation(folderPath);
    return true;
  };

  useEffect(() => {
    if (!isDesktopFs || !desktopApi?.explorer?.onOpenPathRequest || !desktopApi.fileSystem?.getMetadata) {
      return;
    }

    return desktopApi.explorer.onOpenPathRequest(async (targetPath) => {
      try {
        const metadata = await desktopApi.fileSystem!.getMetadata!(targetPath);
        if (metadata.kind === "FOLDER") {
          openLocationInNewTab({ mode: "folder", folderId: targetPath });
          await refreshDesktopLocation(targetPath);
          return;
        }

        openLocationInNewTab({ mode: "folder", folderId: metadata.parentPath });
        setPendingDesktopSelectionId(targetPath);
        await refreshDesktopLocation(metadata.parentPath);
      } catch {
        pushNotice("Could not open requested path", "error");
      }
    });
  }, [desktopApi, isDesktopFs, nodeById]);

  const resolveFolderItems = useMemo(() => {
    if (activeSmartFolderId) {
      const filtered = smartFolderItems ?? [];
      return filtered.filter((node) => (location.mode === "trash" ? node.deleted : !node.deleted));
    }

    if (location.mode === "trash") {
      if (isDesktopFs) {
        return childrenByParent[DESKTOP_TRASH_PARENT_KEY] ?? [];
      }
      return nodes.filter((node) => node.deleted);
    }
    const key = currentFolderId ?? ROOT_KEY;
    return (childrenByParent[key] ?? []).filter((node) => !node.deleted);
  }, [activeSmartFolderId, childrenByParent, currentFolderId, isDesktopFs, location.mode, nodes, smartFolderItems]);
  const scopedItems = useMemo(() => {
    let items = resolveFolderItems;
    if (scopeFilter === "recent") {
      const recent = new Set(recentIds);
      items = items.filter((node) => recent.has(node.id));
    } else if (scopeFilter === "favorites") {
      const favorites = new Set(favoriteIds);
      items = items.filter((node) => favorites.has(node.id));
    } else if (scopeFilter === "shared") {
      const shared = new Set(sharedIds);
      items = items.filter((node) => shared.has(node.id));
    }

    if (typeFilter === "folder") {
      items = items.filter((node) => node.nodeType === "FOLDER");
    } else if (typeFilter === "file") {
      items = items.filter((node) => node.nodeType === "FILE");
    }

    const query = deferredSearchTerm.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((node) => {
      const path = pathById[node.id] ?? "";
      return node.name.toLowerCase().includes(query) || path.toLowerCase().includes(query);
    });
  }, [deferredSearchTerm, favoriteIds, pathById, recentIds, resolveFolderItems, scopeFilter, sharedIds, typeFilter]);

  const visibleItems = useMemo(() => {
    const sorted = [...scopedItems].sort((a, b) => {
      const typeOrder = a.nodeType === b.nodeType ? 0 : a.nodeType === "FOLDER" ? -1 : 1;
      if (sortKey === "type" && typeOrder !== 0) {
        return typeOrder;
      }

      let comparison = 0;
      if (sortKey === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === "modified") {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else if (sortKey === "size") {
        comparison = a.sizeBytes - b.sizeBytes;
      } else {
        comparison = a.nodeType.localeCompare(b.nodeType);
      }

      if (comparison === 0) {
        comparison = a.name.localeCompare(b.name);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [scopedItems, sortDirection, sortKey]);

  const visibleIds = useMemo(() => visibleItems.map((node) => node.id), [visibleItems]);
  const selectedNodes = useMemo(() => selectedIds.map((id) => nodeById[id]).filter(Boolean), [nodeById, selectedIds]);
  const primarySelected = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const activeSmartFolder = useMemo(
    () => smartFoldersQuery.data?.find((folder) => folder.id === activeSmartFolderId) ?? null,
    [activeSmartFolderId, smartFoldersQuery.data]
  );

  useEffect(() => {
    if (isDesktopFs || !primarySelected || !isUuid(primarySelected.id)) {
      setAssignedTags([]);
      setPermissions([]);
      return;
    }

    void Promise.all([fetchNodeTags(primarySelected.id), fetchPermissions(primarySelected.id)])
      .then(([nextTags, nextPermissions]) => {
        setAssignedTags(nextTags);
        setPermissions(nextPermissions);
      })
      .catch(() => {
        setAssignedTags([]);
        setPermissions([]);
      });
  }, [isDesktopFs, primarySelected?.id]);

  const versionsQuery = useQuery({
    queryKey: ["file-versions", primarySelected?.id],
    queryFn: () => fetchFileVersions(primarySelected!.id),
    enabled: Boolean(!isDesktopFs && primarySelected && primarySelected.nodeType === "FILE" && isUuid(primarySelected.id)),
    retry: 0
  });

  useEffect(() => {
    if (!primarySelected) {
      setDetailsMetadata(null);
      setDetailsPreview(null);
      setDetailsLoading(false);
      return;
    }

    if (!isDesktopFs || !desktopApi?.fileSystem?.getMetadata) {
      setDetailsMetadata(null);
      setDetailsPreview(null);
      setDetailsLoading(false);
      return;
    }

    let cancelled = false;
    setDetailsLoading(true);

    void Promise.all([
      desktopApi.fileSystem.getMetadata(primarySelected.id),
      desktopApi.fileSystem.getPreview?.(primarySelected.id) ?? Promise.resolve(null)
    ])
      .then(([metadata, preview]) => {
        if (cancelled) {
          return;
        }
        setDetailsMetadata(metadata);
        setDetailsPreview(preview);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setDetailsMetadata(null);
        setDetailsPreview(null);
      })
      .finally(() => {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [desktopApi, isDesktopFs, primarySelected]);

  const recommendedFiles = useMemo(() => {
    const recents = [...recentIds]
      .map((id) => nodeById[id])
      .filter((node): node is ExplorerNode => Boolean(node && node.nodeType === "FILE" && !node.deleted));

    const fallback = nodes.filter((node) => node.nodeType === "FILE" && !node.deleted).slice(0, 8);
    const merged = [...recents, ...fallback];
    const seen = new Set<string>();
    return merged
      .filter((node) => {
        if (seen.has(node.id)) {
          return false;
        }
        seen.add(node.id);
        return true;
      })
      .slice(0, 6);
  }, [nodeById, nodes, recentIds]);
  const quickStats = useMemo(() => {
    const files = visibleItems.filter((node) => node.nodeType === "FILE");
    const folders = visibleItems.length - files.length;
    const totalBytes = files.reduce((sum, node) => sum + node.sizeBytes, 0);
    const indexed = nodes.length;

    return [
      { label: "Visible Files", value: files.length.toString(), icon: BarChart3, tone: "text-zinc-300" },
      { label: "Folders", value: folders.toString(), icon: Layers3, tone: "text-zinc-400" },
      { label: "Indexed Nodes", value: indexed.toString(), icon: Sparkles, tone: "text-stone-300" },
      { label: "Payload", value: formatBytes(totalBytes), icon: MemoryStick, tone: "text-zinc-500" }
    ];
  }, [nodes.length, visibleItems]);

  const breadcrumbs = useMemo(() => {
    if (location.mode === "trash") {
      return [{ label: "Recycle Bin", folderId: null as string | null }];
    }

    const trail: Array<{ label: string; folderId: string | null }> = [{ label: "Home", folderId: null }];
    if (!currentFolderId) {
      return trail;
    }

    const chain: string[] = [];
    let cursor: string | null = currentFolderId;
    while (cursor) {
      chain.push(cursor);
      cursor = nodeById[cursor]?.parentId ?? null;
    }

    chain.reverse().forEach((id) => {
      const node = nodeById[id];
      if (node) {
        trail.push({ label: node.name, folderId: id });
      }
    });

    return trail;
  }, [currentFolderId, location.mode, nodeById]);

  const inlineCreateActive = Boolean(inlineEdit && inlineEdit.targetId === null && location.mode === "folder" && currentFolderId);
  const marqueeBox = marquee
    ? {
        left: Math.min(marquee.originX, marquee.currentX),
        top: Math.min(marquee.originY, marquee.currentY),
        width: Math.abs(marquee.currentX - marquee.originX),
        height: Math.abs(marquee.currentY - marquee.originY)
      }
    : null;

  const activeDetailsMetadata = useMemo<DesktopPathMetadata | null>(() => {
    if (!primarySelected) {
      return null;
    }

    if (detailsMetadata) {
      return detailsMetadata;
    }

    return {
      name: primarySelected.name,
      path: pathById[primarySelected.id] ?? primarySelected.id,
      parentPath: primarySelected.parentId ? pathById[primarySelected.parentId] ?? primarySelected.parentId : "/",
      kind: primarySelected.nodeType,
      extension: extensionOf(primarySelected.name),
      mimeType: primarySelected.nodeType === "FOLDER" ? "inode/directory" : "application/octet-stream",
      sizeBytes: primarySelected.sizeBytes,
      createdAt: primarySelected.updatedAt,
      updatedAt: primarySelected.updatedAt,
      accessedAt: primarySelected.updatedAt,
      hidden: primarySelected.name.startsWith("."),
      writable: true,
      symlink: false,
      sha256: null,
      folderCount: primarySelected.nodeType === "FOLDER" ? (childrenByParent[primarySelected.id] ?? []).filter((entry) => entry.nodeType === "FOLDER").length : 0,
      fileCount: primarySelected.nodeType === "FILE" ? 1 : (childrenByParent[primarySelected.id] ?? []).filter((entry) => entry.nodeType === "FILE").length,
      itemCount: primarySelected.nodeType === "FILE" ? 1 : (childrenByParent[primarySelected.id] ?? []).length
    };
  }, [childrenByParent, detailsMetadata, pathById, primarySelected]);

  const navigateTo = (next: ExplorerLocation, pushHistory = true) => {
    if (next.mode === location.mode && next.folderId === location.folderId) {
      return;
    }

    if (pushHistory) {
      setBackStack((prev) => [...prev, location]);
      setForwardStack([]);
    }

    setLocation(next);
    setSelectedIds([]);
    setAnchorId(null);
  };

  const startAddressEditing = () => {
    setAddressValue(currentAddressPath);
    setIsAddressEditing(true);
  };

  const cancelAddressEditing = () => {
    setAddressValue(currentAddressPath);
    setIsAddressEditing(false);
  };

  const submitAddressNavigation = async () => {
    const rawValue = addressValue.trim();
    if (!rawValue) {
      cancelAddressEditing();
      return;
    }

    if (rawValue === "Recycle Bin") {
      navigateTo({ mode: "trash", folderId: null });
      setIsAddressEditing(false);
      return;
    }

    if (isDesktopFs) {
      const normalized = normalizeLookupPath(rawValue);
      if (normalized === currentAddressPath) {
        setIsAddressEditing(false);
        return;
      }

      try {
        const metadata = await desktopApi?.fileSystem?.getMetadata?.(normalized);
        if (!metadata) {
          throw new Error("Path not found");
        }

        const destinationFolder = metadata.kind === "FOLDER" ? metadata.path : metadata.parentPath;
        navigateTo({ mode: "folder", folderId: destinationFolder });
        await refreshDesktopLocation(destinationFolder);
        if (metadata.kind === "FILE") {
          setPendingDesktopSelectionId(metadata.path);
        }
        setIsAddressEditing(false);
      } catch {
        pushNotice("Path not found or inaccessible", "error");
      }
      return;
    }

    const normalized = normalizeLookupPath(rawValue);
    const resolvedId = pathToId[normalized] ?? pathToId[normalized.replace(/\\/g, "/")];
    if (!resolvedId) {
      pushNotice("Path not found", "error");
      return;
    }

    const targetNode = nodeById[resolvedId];
    if (!targetNode) {
      pushNotice("Path not found", "error");
      return;
    }

    if (targetNode.nodeType === "FOLDER") {
      navigateTo({ mode: "folder", folderId: targetNode.id });
    } else {
      navigateTo({ mode: "folder", folderId: targetNode.parentId });
      setSelectedIds([targetNode.id]);
      setAnchorId(targetNode.id);
    }
    setIsAddressEditing(false);
  };

  const openNode = (node: ExplorerNode) => {
    setRecentIds((prev) => [node.id, ...prev.filter((id) => id !== node.id)].slice(0, 60));

    if (node.nodeType === "FOLDER") {
      navigateTo({ mode: "folder", folderId: node.id });
      return;
    }

    if (node.source === "desktop" && desktopApi?.fileSystem?.openPath) {
      void desktopApi.fileSystem.openPath(node.id).then((result) => {
        if (result.ok) {
          pushNotice(`Opened ${node.name}`, "success");
        } else {
          pushNotice(`Could not open ${node.name}`, "error");
        }
      });
      return;
    }

    pushNotice(`Opened ${node.name}`, "success");
  };

  const copyPathsToClipboard = async (ids: string[]) => {
    if (ids.length === 0) {
      pushNotice("No paths selected", "info");
      return;
    }

    const payload = ids.map((id) => pathById[id] ?? id).join("\r\n");
    try {
      if (isDesktopFs && desktopApi?.fileSystem?.copyText) {
        await desktopApi.fileSystem.copyText(payload);
      } else {
        await navigator.clipboard.writeText(payload);
      }
      pushNotice("Path copied to clipboard", "success");
    } catch {
      pushNotice("Could not copy path", "error");
    }
  };

  const toggleQuickAccess = (node: ExplorerNode) => {
    if (node.nodeType !== "FOLDER") {
      pushNotice("Quick access is available for folders", "info");
      return;
    }

    const alreadyPinned = quickAccessIds.includes(node.id);
    setQuickAccessIds((prev) => (prev.includes(node.id) ? prev.filter((entry) => entry !== node.id) : [...prev, node.id]));
    pushNotice(alreadyPinned ? `${node.name} removed from Quick access` : `${node.name} pinned to Quick access`, "success");
  };

  const pinToQuickAccess = (node: ExplorerNode) => {
    if (node.nodeType !== "FOLDER") {
      pushNotice("Only folders can be pinned to Quick access", "info");
      return;
    }
    if (quickAccessIds.includes(node.id)) {
      pushNotice(`${node.name} is already pinned`, "info");
      return;
    }
    setQuickAccessIds((prev) => [...prev, node.id]);
    pushNotice(`${node.name} pinned to Quick access`, "success");
  };

  const openNodeInNewTab = async (node: ExplorerNode) => {
    if (node.nodeType === "FOLDER") {
      openLocationInNewTab({ mode: "folder", folderId: node.id });
      if (isDesktopFs) {
        await refreshDesktopLocation(node.id);
      }
      return;
    }

    const parentFolderId = node.parentId;
    openLocationInNewTab({ mode: "folder", folderId: parentFolderId });
    if (node.source === "desktop" && parentFolderId) {
      setPendingDesktopSelectionId(node.id);
      await refreshDesktopLocation(parentFolderId);
    } else {
      setSelectedIds([node.id]);
      setAnchorId(node.id);
    }
  };

  const openNodeInNewWindow = async (node: ExplorerNode) => {
    if (!isDesktopFs || !desktopApi?.windowControls?.newExplorerWindow) {
      pushNotice("New window is available in desktop mode", "info");
      return;
    }

    try {
      await desktopApi.windowControls.newExplorerWindow(node.id);
      pushNotice(`Opened ${node.name} in new window`, "success");
    } catch {
      pushNotice("Could not open a new window", "error");
    }
  };

  const openInTerminal = async (node: ExplorerNode) => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.openInTerminal) {
      pushNotice("Terminal integration is not available here", "info");
      return;
    }

    try {
      await desktopApi.fileSystem.openInTerminal(node.nodeType === "FOLDER" ? node.id : node.parentId ?? node.id);
      pushNotice("Terminal opened", "success");
    } catch {
      pushNotice("Could not open terminal", "error");
    }
  };

  const openWithCodeAction = async (node: ExplorerNode) => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.openWithCode) {
      pushNotice("VS Code integration is not available here", "info");
      return;
    }

    try {
      await desktopApi.fileSystem.openWithCode(node.id);
      pushNotice("Opened with Visual Studio Code", "success");
    } catch {
      pushNotice("Visual Studio Code is not available", "error");
    }
  };

  const compressSelection = async (ids: string[]) => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.compressPaths) {
      pushNotice("Compression is available in desktop mode", "info");
      return;
    }

    try {
      const result = await desktopApi.fileSystem.compressPaths(ids);
      await refreshDesktopLocation(currentFolderId);
      pushNotice(`Archive created: ${result.path.split(/[\\/]/).pop() ?? result.path}`, "success");
    } catch {
      pushNotice("Could not create archive", "error");
    }
  };

  const refreshDesktopFolders = async (folderIds: Array<string | null>) => {
    const uniqueFolders = Array.from(new Set(folderIds));
    for (const folderId of uniqueFolders) {
      await refreshDesktopLocation(folderId);
    }
  };

  const importDroppedPaths = async (sourcePaths: string[], destinationPath: string) => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.copyPath) {
      pushNotice("External file drops are available in desktop mode", "info");
      return;
    }
    if (sourcePaths.length === 0) {
      return;
    }

    try {
      await Promise.all(sourcePaths.map((sourcePath) => desktopApi.fileSystem!.copyPath!(sourcePath, destinationPath)));
      await refreshDesktopFolders([destinationPath]);
      pushNotice(`Imported ${sourcePaths.length} item(s)`, "success");
    } catch {
      await refreshDesktopFolders([destinationPath]);
      pushNotice("Could not import dropped item(s)", "error");
    }
  };

  const performDesktopMove = async (ids: string[], destinationPath: string) => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.movePath) {
      pushNotice("Move is available in desktop mode", "info");
      return;
    }

    const invalid = ids.some((id) => isDescendant(destinationPath, id, nodeById));
    if (invalid) {
      pushNotice("Cannot move a folder inside itself", "error");
      return;
    }

    const sourceParents = ids.map((id) => nodeById[id]?.parentId ?? null);
    if (sourceParents.every((parentId) => parentId === destinationPath)) {
      pushNotice("Items are already in that folder", "info");
      return;
    }

    try {
      setNodes((prev) => ids.reduce((working, id) => moveDesktopNodeBranch(working, id, destinationPath), prev));
      await Promise.all(ids.map((id) => desktopApi.fileSystem!.movePath!(id, destinationPath)));
      setSelectedIds([]);
      setMoveDialogState(null);
      await refreshDesktopFolders([...sourceParents, destinationPath]);
      pushNotice(`Moved ${ids.length} item(s)`, "success");
    } catch {
      await refreshDesktopFolders([...sourceParents, destinationPath]);
      pushNotice("Could not move item(s)", "error");
    }
  };

  const performDesktopCopy = async (ids: string[], destinationPath: string) => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.copyPath) {
      pushNotice("Copy is available in desktop mode", "info");
      return;
    }

    try {
      await Promise.all(ids.map((id) => desktopApi.fileSystem!.copyPath!(id, destinationPath)));
      setMoveDialogState(null);
      await refreshDesktopFolders([destinationPath]);
      pushNotice(`Copied ${ids.length} item(s)`, "success");
    } catch {
      await refreshDesktopFolders([destinationPath]);
      pushNotice("Could not copy item(s)", "error");
    }
  };

  const duplicateSelection = async (overrideIds: string[] = selectedIds) => {
    if (overrideIds.length === 0) {
      pushNotice("Select items to duplicate", "info");
      return;
    }

    const ids = dedupeSelectionRoots(overrideIds, nodeById);
    if (isDesktopFs && desktopApi?.fileSystem?.duplicatePath) {
      try {
        const sourceParents = ids.map((id) => nodeById[id]?.parentId ?? null);
        await Promise.all(ids.map((id) => desktopApi.fileSystem!.duplicatePath!(id)));
        await refreshDesktopFolders(sourceParents);
        pushNotice(`Duplicated ${ids.length} item(s)`, "success");
      } catch {
        pushNotice("Could not duplicate item(s)", "error");
      }
      return;
    }

    setNodes((prev) => {
      const snapshot = prev.filter((node) => !node.deleted);
      const working = [...prev];
      const byParent = buildChildrenByParent(snapshot);

      const cloneBranch = (sourceId: string, targetParentId: string | null, isRoot: boolean) => {
        const sourceNode = snapshot.find((node) => node.id === sourceId);
        if (!sourceNode) {
          return;
        }

        const cloneId = makeId();
        const clonedName = isRoot ? uniqueName(working, targetParentId, `${sourceNode.name} Copy`) : sourceNode.name;

        working.push({
          ...sourceNode,
          id: cloneId,
          parentId: targetParentId,
          name: clonedName,
          updatedAt: new Date().toISOString(),
          source: "local"
        });

        const childKey = sourceNode.id;
        const children = byParent[childKey] ?? [];
        children.forEach((child) => cloneBranch(child.id, cloneId, false));
      };

      ids.forEach((rootId) => cloneBranch(rootId, nodeById[rootId]?.parentId ?? null, true));
      return working;
    });
    pushNotice(`Duplicated ${ids.length} item(s) locally`, "success");
  };

  const moveSelectionToDirectory = async (overrideIds: string[] = selectedIds) => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.movePath) {
      pushNotice("Move to... is available in desktop mode", "info");
      return;
    }
    if (overrideIds.length === 0) {
      pushNotice("Select items to move", "info");
      return;
    }

    const ids = dedupeSelectionRoots(overrideIds, nodeById);
    const initialDestination = currentFolderId ?? desktopSpecialPaths.home ?? nodeById[ids[0]]?.parentId ?? null;
    setMoveDialogState({ mode: "move", ids, destinationId: initialDestination });
    setMoveDialogExpandedFolders(collectAncestorChain(initialDestination, nodeById));
    if (initialDestination) {
      void refreshDesktopLocation(initialDestination);
    }
  };

  const copySelectionToDirectory = async (overrideIds: string[] = selectedIds) => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.copyPath) {
      pushNotice("Copy to... is available in desktop mode", "info");
      return;
    }
    if (overrideIds.length === 0) {
      pushNotice("Select items to copy", "info");
      return;
    }

    const ids = dedupeSelectionRoots(overrideIds, nodeById);
    const initialDestination = currentFolderId ?? desktopSpecialPaths.home ?? nodeById[ids[0]]?.parentId ?? null;
    setMoveDialogState({ mode: "copy", ids, destinationId: initialDestination });
    setMoveDialogExpandedFolders(collectAncestorChain(initialDestination, nodeById));
    if (initialDestination) {
      void refreshDesktopLocation(initialDestination);
    }
  };

  const createShortcutSelection = async (overrideIds: string[] = selectedIds) => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.createShortcut) {
      pushNotice("Create shortcut is available in desktop mode", "info");
      return;
    }
    if (overrideIds.length === 0) {
      pushNotice("Select items to create shortcut", "info");
      return;
    }

    const ids = dedupeSelectionRoots(overrideIds, nodeById);
    try {
      const sourceParents = ids.map((id) => nodeById[id]?.parentId ?? null);
      await Promise.all(ids.map((id) => desktopApi.fileSystem!.createShortcut!(id, nodeById[id]?.parentId ?? currentFolderId ?? undefined)));
      await refreshDesktopFolders(sourceParents);
      pushNotice(`Shortcut created for ${ids.length} item(s)`, "success");
    } catch {
      pushNotice("Could not create shortcut", "error");
    }
  };

  const revealSelection = async (node: ExplorerNode) => {
    if (!isDesktopFs || !desktopApi?.fileSystem?.revealPath) {
      pushNotice("Reveal is available in desktop mode", "info");
      return;
    }

    try {
      await desktopApi.fileSystem.revealPath(node.id);
      pushNotice("Revealed in system explorer", "success");
    } catch {
      pushNotice("Could not reveal item", "error");
    }
  };

  const showProperties = async (node: ExplorerNode) => {
    setPropertiesOpen(true);
    setPropertiesLoading(true);
    setPropertiesMetadata(null);
    setPropertiesPathLabel(pathById[node.id] ?? node.id);

    try {
      if (isDesktopFs && desktopApi?.fileSystem?.getMetadata) {
        const metadata = await desktopApi.fileSystem.getMetadata(node.id);
        setPropertiesMetadata(metadata);
      } else {
        setPropertiesMetadata({
          name: node.name,
          path: pathById[node.id] ?? "/",
          parentPath: node.parentId ? pathById[node.parentId] ?? "/" : "/",
          kind: node.nodeType,
          extension: extensionOf(node.name),
          mimeType: node.nodeType === "FOLDER" ? "inode/directory" : "application/octet-stream",
          sizeBytes: node.sizeBytes,
          createdAt: node.updatedAt,
          updatedAt: node.updatedAt,
          accessedAt: node.updatedAt,
          hidden: node.name.startsWith("."),
          writable: true,
          symlink: false,
          sha256: null,
          folderCount: 0,
          fileCount: node.nodeType === "FILE" ? 1 : (childrenByParent[node.id] ?? []).filter((entry) => entry.nodeType === "FILE").length,
          itemCount: (childrenByParent[node.id] ?? []).length || 1
        });
      }
    } catch {
      pushNotice("Could not load properties", "error");
      setPropertiesOpen(false);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const refreshFromServer = async () => {
    if (isDesktopFs) {
      try {
        await refreshDesktopLocation();
        pushNotice("Explorer refreshed", "success");
      } catch {
        pushNotice("Refresh failed", "error");
      }
      return;
    }

    await treeQuery.refetch();
    pushNotice("Explorer refreshed", "success");
  };

  const handleGoBack = () => {
    setBackStack((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const next = [...prev];
      const target = next.pop()!;
      setForwardStack((stack) => [location, ...stack]);
      setLocation(target);
      setSelectedIds([]);
      setAnchorId(null);
      return next;
    });
  };

  const handleGoForward = () => {
    setForwardStack((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const [target, ...rest] = prev;
      setBackStack((stack) => [...stack, location]);
      setLocation(target);
      setSelectedIds([]);
      setAnchorId(null);
      return rest;
    });
  };

  const handleGoUp = () => {
    if (location.mode !== "folder") {
      navigateTo({ mode: "folder", folderId: null });
      return;
    }

    if (!currentFolderId) {
      return;
    }

    const parentId = nodeById[currentFolderId]?.parentId ?? null;
    navigateTo({ mode: "folder", folderId: parentId });
  };

  const selectEntry = (id: string, event: React.MouseEvent) => {
    if (event.shiftKey && anchorId && visibleIds.includes(anchorId)) {
      const start = visibleIds.indexOf(anchorId);
      const end = visibleIds.indexOf(id);
      const from = Math.min(start, end);
      const to = Math.max(start, end);
      setSelectedIds(visibleIds.slice(from, to + 1));
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
      setAnchorId(id);
      return;
    }

    setSelectedIds([id]);
    setAnchorId(id);
  };

  const handleSelectionSurfacePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (
      target.closest("[data-node-entry='true']") ||
      target.closest("[data-inline-edit='true']") ||
      target.closest("input, button, textarea, [role='button']")
    ) {
      return;
    }

    setSelectedIds([]);
    setAnchorId(null);
    setMarquee({
      originX: event.clientX,
      originY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY
    });
  };

  const deleteSelection = async (overrideIds: string[] = selectedIds) => {
    if (overrideIds.length === 0) {
      pushNotice("Select items to delete", "info");
      return;
    }

    const ids = [...overrideIds];
    if (isDesktopFs && desktopApi?.fileSystem?.moveToTrash) {
      if (location.mode === "trash") {
        if (!desktopApi.fileSystem.deleteTrashedPath) {
          pushNotice("Permanent delete is not available here", "info");
          return;
        }

        await Promise.allSettled(ids.map((id) => desktopApi.fileSystem!.deleteTrashedPath!(id)));
        setSelectedIds([]);
        await refreshDesktopTrash();
        pushNotice(`Deleted ${ids.length} item(s) permanently`, "success");
        return;
      }

      const sourceParents = ids.map((id) => nodeById[id]?.parentId ?? null);
      await Promise.allSettled(ids.map((id) => desktopApi.fileSystem!.moveToTrash!(id)));
      setSelectedIds([]);
      try {
        await refreshDesktopFolders(sourceParents);
        await refreshDesktopTrash();
      } catch {
        // no-op
      }
      pushNotice(`Moved ${ids.length} item(s) to recycle bin`, "success");
      return;
    }

    if (location.mode === "trash") {
      setNodes((prev) => prev.filter((node) => !ids.includes(node.id)));
      setSelectedIds([]);
      pushNotice("Removed permanently from recycle bin", "success");

      const apiTargets = ids.filter(isUuid);
      if (apiTargets.length > 0) {
        await Promise.allSettled(apiTargets.map((id) => hardDeleteNode(id)));
        await treeQuery.refetch();
      }
      return;
    }

    setNodes((prev) =>
      prev.map((node) => (ids.includes(node.id) ? { ...node, deleted: true, updatedAt: new Date().toISOString() } : node))
    );
    setSelectedIds([]);
    pushNotice(`Moved ${ids.length} item(s) to recycle bin`, "success");

    const apiTargets = ids.filter(isUuid);
    if (apiTargets.length > 0) {
      await Promise.allSettled(apiTargets.map((id) => softDeleteNode(id)));
      await treeQuery.refetch();
    }
  };
  const restoreSelection = async () => {
    if (isDesktopFs) {
      if (selectedIds.length === 0 || !desktopApi?.fileSystem?.restoreTrashPath) {
        pushNotice("Select items to restore", "info");
        return;
      }

      const restored = await Promise.allSettled(selectedIds.map((id) => desktopApi.fileSystem!.restoreTrashPath!(id)));
      const restoredParents = restored
        .filter((result): result is PromiseFulfilledResult<{ path: string; originalPath: string }> => result.status === "fulfilled")
        .map((result) => parentDirectoryOf(result.value.path))
        .filter((entry): entry is string => Boolean(entry));

      setSelectedIds([]);
      await refreshDesktopTrash();
      await refreshDesktopFolders(restoredParents);
      pushNotice(`Restored ${restoredParents.length} item(s)`, restoredParents.length > 0 ? "success" : "error");
      return;
    }

    if (selectedIds.length === 0) {
      pushNotice("Select items to restore", "info");
      return;
    }

    const ids = [...selectedIds];
    setNodes((prev) =>
      prev.map((node) => (ids.includes(node.id) ? { ...node, deleted: false, updatedAt: new Date().toISOString() } : node))
    );
    setSelectedIds([]);
    pushNotice(`Restored ${ids.length} item(s)`, "success");

    const apiTargets = ids.filter(isUuid);
    if (apiTargets.length > 0) {
      await Promise.allSettled(apiTargets.map((id) => restoreNode(id)));
      await treeQuery.refetch();
    }
  };

  const openDialog = (mode: DialogState["mode"]) => {
    const initial =
      mode === "rename" && primarySelected ? primarySelected.name : mode === "new-folder" ? "New Folder" : "New File.txt";
    setDialogState({ mode, value: initial });
    setShowNewMenu(false);
  };

  const applyDialog = async (pendingState: DialogState | null = dialogState) => {
    if (!pendingState) {
      return;
    }

    const rawValue = pendingState.value.trim();
    if (!rawValue) {
      pushNotice("Name cannot be empty", "error");
      return;
    }

    if (pendingState.mode === "rename") {
      if (!primarySelected || !canRenameNode(primarySelected)) {
        pushNotice("Select a single item to rename", "info");
        setDialogState(null);
        setInlineEdit(null);
        return;
      }
      const renameTarget = primarySelected;

      if (rawValue === renameTarget.name) {
        setDialogState(null);
        setInlineEdit(null);
        return;
      }

      const normalized = uniqueName(nodes, renameTarget.parentId, rawValue, renameTarget.id);
      setNodes((prev) =>
        prev.map((node) => (node.id === renameTarget.id ? { ...node, name: normalized, updatedAt: new Date().toISOString() } : node))
      );
      if (isDesktopFs && desktopApi?.fileSystem?.renamePath) {
        try {
          const result = await desktopApi.fileSystem.renamePath(renameTarget.id, rawValue);
          if (currentFolderId === renameTarget.id) {
            navigateTo({ mode: "folder", folderId: result.path });
          }
          await refreshDesktopLocation(renameTarget.parentId);
          if (currentFolderId === result.path) {
            await refreshDesktopLocation(result.path);
          }
          pushNotice("Renamed", "success");
        } catch {
          await refreshDesktopLocation(renameTarget.parentId);
          pushNotice("Rename failed", "error");
        }
        setDialogState(null);
        setInlineEdit(null);
        return;
      }

      if (isUuid(renameTarget.id)) {
        try {
          await renameNode(renameTarget.id, rawValue);
          await treeQuery.refetch();
          pushNotice("Renamed", "success");
        } catch {
          pushNotice("Rename applied locally (backend rename failed)", "info");
        }
      } else {
        pushNotice("Renamed locally", "success");
      }
      setDialogState(null);
      setInlineEdit(null);
      return;
    }

    if (location.mode !== "folder") {
      pushNotice("Switch to a folder to create new items", "info");
      setDialogState(null);
      setInlineEdit(null);
      return;
    }

    const nextType = pendingState.mode === "new-folder" ? "FOLDER" : "FILE";
    const parentId = resolveCreateParentId();

    if (isDesktopFs && desktopApi?.fileSystem) {
      const fileSystem = desktopApi.fileSystem;
      if (typeof parentId !== "string" || parentId.length === 0) {
        pushNotice("Open a writable folder before creating new items", "info");
        setDialogState(null);
        setInlineEdit(null);
        return;
      }

      const tryCreateAt = async (targetPath: string) => {
        if (nextType === "FOLDER") {
          return (await fileSystem.createFolder!(targetPath, rawValue)).path;
        }
        return (await fileSystem.createFile!(targetPath, rawValue)).path;
      };

      try {
        const createdPath = await tryCreateAt(parentId);
        await refreshDesktopLocation(parentId);
        if (createdPath) {
          setPendingDesktopSelectionId(createdPath);
        }
        pushNotice(`${nextType === "FOLDER" ? "Folder" : "File"} created`, "success");
      } catch (error) {
        if (isPermissionError(error)) {
          pushNotice(`${parentId} is not writable. Choose a writable folder.`, "error");
        } else {
          pushNotice(`Could not create ${nextType === "FOLDER" ? "folder" : "file"}`, "error");
        }
      }
      setDialogState(null);
      setInlineEdit(null);
      return;
    }

    const localParentId = parentId ?? null;
    const resolvedName = uniqueName(nodes, localParentId, rawValue);
    const localNode: ExplorerNode = {
      id: makeId(),
      parentId: localParentId,
      nodeType: nextType,
      name: resolvedName,
      updatedAt: new Date().toISOString(),
      deleted: false,
      sizeBytes: inferSizeBytes(resolvedName + Date.now().toString(), nextType),
      source: "local"
    };

    setNodes((prev) => [...prev, localNode]);
    setSelectedIds([localNode.id]);
    setAnchorId(localNode.id);
    setDialogState(null);
    setInlineEdit(null);

    try {
      if (nextType === "FOLDER") {
        await createFolder(localParentId, resolvedName);
      } else {
        await initUploadNode(localParentId, resolvedName);
      }
      await treeQuery.refetch();
      pushNotice(`${nextType === "FOLDER" ? "Folder" : "File"} created`, "success");
    } catch {
      pushNotice(`${nextType === "FOLDER" ? "Folder" : "File"} created in local mode (API unavailable)`, "info");
    }
  };

  const commitInlineEdit = async () => {
    if (!inlineEdit) {
      return;
    }

    if (inlineEdit.mode === "rename") {
      const target = inlineEdit.targetId ? nodeById[inlineEdit.targetId] ?? null : null;
      if (!target) {
        setInlineEdit(null);
        return;
      }

      setSelectedIds([target.id]);
      setAnchorId(target.id);
      await applyDialog({ mode: "rename", value: inlineEdit.value });
      return;
    }

    await applyDialog({ mode: inlineEdit.mode, value: inlineEdit.value });
  };

  const copyCutSelection = (mode: "copy" | "cut", overrideIds: string[] = selectedIds) => {
    if (overrideIds.length === 0) {
      pushNotice("Select items first", "info");
      return;
    }
    setClipboardState({ mode, ids: [...overrideIds] });
    pushNotice(`${mode === "copy" ? "Copied" : "Cut"} ${overrideIds.length} item(s)`, "success");
  };

  const pasteClipboard = async () => {
    if (!clipboardState) {
      pushNotice("Clipboard is empty", "info");
      return;
    }

    if (location.mode !== "folder") {
      pushNotice("Open a folder to paste", "info");
      return;
    }

    const destinationParentId = currentFolderId;
    if (isDesktopFs && desktopApi?.fileSystem) {
      if (!destinationParentId) {
        pushNotice("Open a folder to paste", "info");
        return;
      }

      const roots = dedupeSelectionRoots(clipboardState.ids, nodeById);
      if (clipboardState.mode === "cut") {
        const invalid = roots.some((id) => isDescendant(destinationParentId, id, nodeById));
        if (invalid) {
          pushNotice("Cannot move a folder inside itself", "error");
          return;
        }

        await Promise.allSettled(roots.map((id) => desktopApi.fileSystem!.movePath!(id, destinationParentId)));
        setClipboardState(null);
        await refreshDesktopLocation(destinationParentId);
        pushNotice(`Moved ${roots.length} item(s)`, "success");
        return;
      }

      await Promise.allSettled(roots.map((id) => desktopApi.fileSystem!.copyPath!(id, destinationParentId)));
      await refreshDesktopLocation(destinationParentId);
      pushNotice(`Copied ${roots.length} item(s)`, "success");
      return;
    }

    if (clipboardState.mode === "cut") {
      const roots = dedupeSelectionRoots(clipboardState.ids, nodeById);
      const invalid = roots.some((id) => isDescendant(destinationParentId, id, nodeById));
      if (invalid) {
        pushNotice("Cannot move a folder inside itself", "error");
        return;
      }

      setNodes((prev) => {
        const working = [...prev];
        for (const rootId of roots) {
          const root = working.find((node) => node.id === rootId);
          if (!root || root.deleted) {
            continue;
          }
          const name = uniqueName(working, destinationParentId, root.name, root.id);
          root.parentId = destinationParentId;
          root.name = name;
          root.updatedAt = new Date().toISOString();
        }
        return [...working];
      });

      setClipboardState(null);
      pushNotice(`Moved ${roots.length} item(s)`, "success");

      const apiTargets = roots.filter(isUuid);
      if (apiTargets.length > 0) {
        void Promise.allSettled(apiTargets.map((id) => moveNode(id, destinationParentId ?? null))).then(() => treeQuery.refetch());
      }
      return;
    }

    const roots = dedupeSelectionRoots(clipboardState.ids, nodeById);

    setNodes((prev) => {
      const snapshot = prev.filter((node) => !node.deleted);
      const working = [...prev];
      const byParent = buildChildrenByParent(snapshot);

      const cloneBranch = (sourceId: string, targetParentId: string | null, isRoot: boolean) => {
        const sourceNode = snapshot.find((node) => node.id === sourceId);
        if (!sourceNode) {
          return;
        }

        const cloneId = makeId();
        const clonedName = isRoot ? uniqueName(working, targetParentId, sourceNode.name) : sourceNode.name;

        working.push({
          ...sourceNode,
          id: cloneId,
          parentId: targetParentId,
          name: clonedName,
          updatedAt: new Date().toISOString(),
          source: "local"
        });

        const childKey = sourceNode.id;
        const children = byParent[childKey] ?? [];
        children.forEach((child) => cloneBranch(child.id, cloneId, false));
      };

      roots.forEach((rootId) => cloneBranch(rootId, destinationParentId, true));
      return working;
    });

    pushNotice(`Pasted ${roots.length} item(s)`, "success");
  };

  const shareSelection = async (overrideIds: string[] = selectedIds) => {
    if (overrideIds.length === 0) {
      pushNotice("Select items to share", "info");
      return;
    }

    setSharedIds((prev) => Array.from(new Set([...prev, ...overrideIds])));

    const firstPath = pathById[overrideIds[0]];
    if (firstPath) {
      try {
        await navigator.clipboard.writeText(firstPath);
        pushNotice(`Path copied: ${firstPath}`, "success");
      } catch {
        pushNotice("Shared marker added", "success");
      }
    }
  };

  const contextTargetForCurrentFolder = currentFolderId ? nodeById[currentFolderId] ?? null : null;

  const renderExplorerContextMenu = (targetNode?: ExplorerNode | null, scope: "node" | "background" = "node") => {
    const derivedIds =
      scope === "node"
        ? targetNode
          ? selectedIds.includes(targetNode.id)
            ? selectedIds
            : [targetNode.id]
          : selectedIds
        : [];
    const ids = derivedIds.length > 0 ? dedupeSelectionRoots(derivedIds, nodeById) : [];
    const singleNode = scope === "node" ? targetNode ?? (ids.length === 1 ? nodeById[ids[0]] ?? null : null) : contextTargetForCurrentFolder;
    const canOpenSingle = ids.length === 1 && Boolean(singleNode);
    const renameTarget = ids.length === 1 && singleNode && canRenameNode(singleNode) ? singleNode : null;
    const trashScope = location.mode === "trash" && scope === "node";
    const singleFolder = singleNode?.nodeType === "FOLDER" ? singleNode : null;
    const singleFile = singleNode?.nodeType === "FILE" ? singleNode : null;
    const terminalTarget =
      scope === "background"
        ? contextTargetForCurrentFolder
        : singleNode
          ? singleNode.nodeType === "FOLDER"
            ? singleNode
            : nodeById[singleNode.parentId ?? ""]
          : null;
    const canPinQuickAccess = Boolean(singleNode && singleNode.nodeType === "FOLDER");
    const quickAccessPinned = Boolean(singleNode && quickAccessIds.includes(singleNode.id));
    const topActionTileClass =
      "h-[68px] flex-col justify-center gap-2 rounded-none bg-[#1f1f1f] px-2 py-3 text-center focus:bg-[#2a2d31]";
    const renderMenuIconLabel = (icon: React.ReactNode, label: string, tone = "text-zinc-100", emphasis = false) => (
      <span className="flex items-center gap-3">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-300">{icon}</span>
        <span className={cn("text-[13px]", tone, emphasis && "font-medium")}>{label}</span>
      </span>
    );

    return (
      <ContextMenuContent className="w-[280px]">
        {scope === "node" ? (
          trashScope ? (
            <>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-[#31343a]">
                <ContextMenuItem
                  disabled={ids.length === 0}
                  className="h-[72px] flex-col justify-center gap-2 rounded-none bg-[#1f1f1f] px-2 py-3 text-center focus:bg-[#2a2d31]"
                  onSelect={() => void restoreSelection()}
                >
                  <span className="flex w-full flex-col items-center gap-2">
                    <RefreshCw className="h-4.5 w-4.5 text-sky-300" />
                    <span className="text-sm font-medium text-zinc-100">Restore</span>
                  </span>
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={ids.length === 0}
                  className="h-[72px] flex-col justify-center gap-2 rounded-none bg-[#1f1f1f] px-2 py-3 text-center focus:bg-[#3a1f20]"
                  onSelect={() => void deleteSelection(ids)}
                >
                  <span className="flex w-full flex-col items-center gap-2">
                    <Trash2 className="h-4.5 w-4.5 text-red-300" />
                    <span className="text-sm font-medium text-zinc-100">Delete permanently</span>
                  </span>
                </ContextMenuItem>
              </div>
              <ContextMenuSeparator />
              <ContextMenuItem disabled={ids.length === 0} shortcut="Ctrl+Shift+C" onSelect={() => void copyPathsToClipboard(ids)}>
                {renderMenuIconLabel(<Copy className="h-4 w-4" />, "Copy as path")}
              </ContextMenuItem>
              <ContextMenuItem disabled={!singleNode} onSelect={() => singleNode && void showProperties(singleNode)} shortcut="Alt+Enter">
                {renderMenuIconLabel(<Info className="h-4 w-4" />, "Properties", "text-zinc-100", true)}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger className="rounded-md px-3 py-2 text-[13px] font-medium text-zinc-100 focus:bg-[#2a2d31] data-[state=open]:bg-[#2a2d31]">
                  <span className="flex items-center gap-3">
                    <LayoutList className="h-4 w-4 text-zinc-300" />
                    <span>Show more options</span>
                  </span>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="min-w-[210px] rounded-xl border-[#34373d] bg-[#232323] p-0.5">
                  <ContextMenuItem disabled={ids.length === 0} onSelect={() => void restoreSelection()}>
                    {renderMenuIconLabel(<RefreshCw className="h-4 w-4" />, "Restore", "text-zinc-100", true)}
                  </ContextMenuItem>
                  <ContextMenuItem disabled={ids.length === 0} shortcut="Ctrl+Shift+C" onSelect={() => void copyPathsToClipboard(ids)}>
                    {renderMenuIconLabel(<Copy className="h-4 w-4" />, "Copy as path")}
                  </ContextMenuItem>
                  <ContextMenuItem disabled={!singleNode} onSelect={() => singleNode && void showProperties(singleNode)} shortcut="Alt+Enter">
                    {renderMenuIconLabel(<Info className="h-4 w-4" />, "Properties", "text-zinc-100", true)}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem disabled={ids.length === 0} className="text-red-300" shortcut="Del" onSelect={() => void deleteSelection(ids)}>
                    {renderMenuIconLabel(<Trash2 className="h-4 w-4" />, "Delete permanently", "text-red-300", true)}
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg bg-[#31343a]">
                {singleFolder ? (
                  <>
                    <ContextMenuItem
                      disabled={!canOpenSingle}
                      className={topActionTileClass}
                      onSelect={() => singleFolder && openNode(singleFolder)}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Folder className="h-4.5 w-4.5 text-zinc-200" />
                        <span className="text-[13px] font-medium text-zinc-100">Open</span>
                      </span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={!canOpenSingle}
                      className={topActionTileClass}
                      onSelect={() => singleFolder && void openNodeInNewTab(singleFolder)}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <ExternalLink className="h-4.5 w-4.5 text-zinc-200" />
                        <span className="text-[13px] font-medium text-zinc-100">New tab</span>
                      </span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={!renameTarget}
                      className={topActionTileClass}
                      onSelect={() => {
                        if (!renameTarget) {
                          return;
                        }
                        setSelectedIds([renameTarget.id]);
                        setAnchorId(renameTarget.id);
                        beginInlineRename(renameTarget);
                      }}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Pencil className="h-4.5 w-4.5 text-zinc-200" />
                        <span className="text-[13px] font-medium text-zinc-100">Rename</span>
                      </span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={ids.length === 0}
                      className={cn(topActionTileClass, "focus:bg-[#3a1f20]")}
                      onSelect={() => void deleteSelection(ids)}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Trash2 className="h-4.5 w-4.5 text-red-300" />
                        <span className="text-[13px] font-medium text-zinc-100">Delete</span>
                      </span>
                    </ContextMenuItem>
                  </>
                ) : singleFile ? (
                  <>
                    <ContextMenuItem
                      disabled={ids.length === 0}
                      className={topActionTileClass}
                      onSelect={() => copyCutSelection("cut", ids)}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Scissors className="h-4.5 w-4.5 text-zinc-200" />
                        <span className="text-[13px] font-medium text-zinc-100">Cut</span>
                      </span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={ids.length === 0}
                      className={topActionTileClass}
                      onSelect={() => copyCutSelection("copy", ids)}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Copy className="h-4.5 w-4.5 text-zinc-200" />
                        <span className="text-[13px] font-medium text-zinc-100">Copy</span>
                      </span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={!renameTarget}
                      className={topActionTileClass}
                      onSelect={() => {
                        if (!renameTarget) {
                          return;
                        }
                        setSelectedIds([renameTarget.id]);
                        setAnchorId(renameTarget.id);
                        beginInlineRename(renameTarget);
                      }}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Pencil className="h-4.5 w-4.5 text-zinc-200" />
                        <span className="text-[13px] font-medium text-zinc-100">Rename</span>
                      </span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={ids.length === 0}
                      className={cn(topActionTileClass, "focus:bg-[#3a1f20]")}
                      onSelect={() => void deleteSelection(ids)}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Trash2 className="h-4.5 w-4.5 text-red-300" />
                        <span className="text-[13px] font-medium text-zinc-100">Delete</span>
                      </span>
                    </ContextMenuItem>
                  </>
                ) : (
                  <>
                    <ContextMenuItem
                      disabled={ids.length === 0}
                      className={topActionTileClass}
                      onSelect={() => copyCutSelection("cut", ids)}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Scissors className="h-4.5 w-4.5 text-zinc-200" />
                        <span className="text-[13px] font-medium text-zinc-100">Cut</span>
                      </span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={ids.length === 0}
                      className={topActionTileClass}
                      onSelect={() => copyCutSelection("copy", ids)}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Copy className="h-4.5 w-4.5 text-zinc-200" />
                        <span className="text-[13px] font-medium text-zinc-100">Copy</span>
                      </span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={!renameTarget}
                      className={topActionTileClass}
                      onSelect={() => {
                        if (!renameTarget) {
                          return;
                        }
                        setSelectedIds([renameTarget.id]);
                        setAnchorId(renameTarget.id);
                        beginInlineRename(renameTarget);
                      }}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Pencil className="h-4.5 w-4.5 text-zinc-200" />
                        <span className="text-[13px] font-medium text-zinc-100">Rename</span>
                      </span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={ids.length === 0}
                      className={cn(topActionTileClass, "focus:bg-[#3a1f20]")}
                      onSelect={() => void deleteSelection(ids)}
                    >
                      <span className="flex w-full flex-col items-center gap-2">
                        <Trash2 className="h-4.5 w-4.5 text-red-300" />
                        <span className="text-[13px] font-medium text-zinc-100">Delete</span>
                      </span>
                    </ContextMenuItem>
                  </>
                )}
              </div>
              <ContextMenuSeparator />
              <ContextMenuItem disabled={!canOpenSingle || !singleNode} shortcut="Enter" onSelect={() => singleNode && openNode(singleNode)}>
                {renderMenuIconLabel(<ExternalLink className="h-4 w-4" />, "Open", "text-zinc-100", true)}
              </ContextMenuItem>
              <ContextMenuItem disabled={!canOpenSingle || !singleNode} onSelect={() => singleNode && void openNodeInNewTab(singleNode)}>
                {renderMenuIconLabel(<Plus className="h-4 w-4" />, "Open in new tab")}
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!canOpenSingle || !singleNode || !isDesktopFs}
                onSelect={() => singleNode && void openNodeInNewWindow(singleNode)}
              >
                {renderMenuIconLabel(<LayoutGrid className="h-4 w-4" />, "Open in new window")}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem disabled={!canPinQuickAccess} onSelect={() => singleNode && toggleQuickAccess(singleNode)}>
                {renderMenuIconLabel(<Star className="h-4 w-4" />, quickAccessPinned ? "Unpin from Quick access" : "Pin to Quick access")}
              </ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger disabled={!desktopCapabilities.canCreateArchive || ids.length === 0} className="text-zinc-100">
                  <span className="flex items-center gap-3">
                    <Archive className="h-4 w-4 text-zinc-300" />
                    <span>Compress to...</span>
                  </span>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="min-w-[210px] rounded-xl border-[#34373d] bg-[#232323] p-0.5">
                  <ContextMenuItem onSelect={() => void compressSelection(ids)}>
                    {renderMenuIconLabel(<Archive className="h-4 w-4" />, "ZIP archive")}
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuItem disabled={ids.length === 0} shortcut="Ctrl+Shift+C" onSelect={() => void copyPathsToClipboard(ids)}>
                {renderMenuIconLabel(<Copy className="h-4 w-4" />, "Copy as path")}
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!singleNode}
                onSelect={() => singleNode && void showProperties(singleNode)}
                shortcut="Alt+Enter"
                className="font-medium text-zinc-100"
              >
                {renderMenuIconLabel(<Info className="h-4 w-4" />, "Properties", "text-zinc-100", true)}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                disabled={!terminalTarget || !desktopCapabilities.canOpenInTerminal}
                onSelect={() => terminalTarget && void openInTerminal(terminalTarget)}
              >
                {renderMenuIconLabel(<SquareTerminal className="h-4 w-4" />, "Open in Terminal")}
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!singleNode || !desktopCapabilities.canOpenWithCode}
                onSelect={() => singleNode && void openWithCodeAction(singleNode)}
              >
                {renderMenuIconLabel(<FileText className="h-4 w-4" />, "Open with Code")}
              </ContextMenuItem>
              <ContextMenuItem disabled={!singleNode || !isDesktopFs} onSelect={() => singleNode && void revealSelection(singleNode)}>
                {renderMenuIconLabel(<ExternalLink className="h-4 w-4" />, "Reveal in Explorer")}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem disabled={!isDesktopFs || ids.length === 0} onSelect={() => void copySelectionToDirectory(ids)}>
                {renderMenuIconLabel(<Copy className="h-4 w-4" />, "Copy to...")}
              </ContextMenuItem>
              <ContextMenuItem disabled={ids.length === 0} onSelect={() => void duplicateSelection(ids)}>
                {renderMenuIconLabel(<Copy className="h-4 w-4" />, "Duplicate")}
              </ContextMenuItem>
              <ContextMenuItem disabled={!isDesktopFs || ids.length === 0} onSelect={() => void moveSelectionToDirectory(ids)}>
                {renderMenuIconLabel(<ExternalLink className="h-4 w-4" />, "Move to...")}
              </ContextMenuItem>
              <ContextMenuItem disabled={!isDesktopFs || ids.length === 0 || !desktopCapabilities.canCreateShortcut} onSelect={() => void createShortcutSelection(ids)}>
                {renderMenuIconLabel(<Share2 className="h-4 w-4" />, "Create shortcut")}
              </ContextMenuItem>
              <ContextMenuItem disabled={ids.length === 0} onSelect={() => ids.forEach((id) => toggleFavorite(id))}>
                {renderMenuIconLabel(<Star className="h-4 w-4" />, ids.every((id) => favoriteIds.includes(id)) ? "Remove from favorites" : "Add to favorites")}
              </ContextMenuItem>
              <ContextMenuItem disabled={ids.length === 0} className="font-medium text-red-300" shortcut="Del" onSelect={() => void deleteSelection(ids)}>
                {renderMenuIconLabel(<Trash2 className="h-4 w-4" />, "Delete", "text-red-300", true)}
              </ContextMenuItem>
            </>
          )
        ) : (
          <>
            <ContextMenuItem disabled={!canCreateInCurrentLocation} onSelect={() => openDialog("new-folder")}>
              New folder
            </ContextMenuItem>
            <ContextMenuItem disabled={!canCreateInCurrentLocation} onSelect={() => openDialog("new-file")}>
              New file
            </ContextMenuItem>
            <ContextMenuItem disabled={!clipboardState || location.mode !== "folder"} onSelect={() => void pasteClipboard()}>
              Paste
            </ContextMenuItem>
            <ContextMenuItem disabled={location.mode !== "folder"} onSelect={() => void refreshFromServer()}>
              Refresh
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!contextTargetForCurrentFolder || !desktopCapabilities.canOpenInTerminal} onSelect={() => contextTargetForCurrentFolder && void openInTerminal(contextTargetForCurrentFolder)}>
              Open in Terminal
            </ContextMenuItem>
            <ContextMenuItem disabled={!contextTargetForCurrentFolder || !desktopCapabilities.canOpenWithCode} onSelect={() => contextTargetForCurrentFolder && void openWithCodeAction(contextTargetForCurrentFolder)}>
              Open with Code
            </ContextMenuItem>
            <ContextMenuItem disabled={!contextTargetForCurrentFolder} onSelect={() => contextTargetForCurrentFolder && void showProperties(contextTargetForCurrentFolder)}>
              Properties
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    );
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const cycleSort = () => {
    const keys: SortKey[] = ["name", "modified", "size", "type"];
    const idx = keys.indexOf(sortKey);
    const next = keys[(idx + 1) % keys.length];
    setSortKey(next);
    pushNotice(`Sort by ${next}`, "info");
  };

  const cycleFilter = () => {
    const values: TypeFilter[] = ["all", "folder", "file"];
    const idx = values.indexOf(typeFilter);
    const next = values[(idx + 1) % values.length];
    setTypeFilter(next);
    pushNotice(`Filter: ${next}`, "info");
  };

  const setFolderExpanded = (id: string, expanded: boolean) => {
    setExpandedFolders((prev) => {
      const hasId = prev.includes(id);
      if (expanded) {
        return hasId ? prev : [...prev, id];
      }

      return hasId ? prev.filter((item) => item !== id) : prev;
    });
  };

  const setMoveDialogFolderExpanded = (id: string, expanded: boolean) => {
    setMoveDialogExpandedFolders((prev) => {
      const hasId = prev.includes(id);
      if (expanded) {
        return hasId ? prev : [...prev, id];
      }

      return hasId ? prev.filter((item) => item !== id) : prev;
    });
  };

  const renderInlineNameInput = (className?: string) => (
    <Input
      ref={inlineInputRef}
      data-inline-edit="true"
      value={inlineEdit?.value ?? ""}
      onChange={(event) => setInlineEdit((state) => (state ? { ...state, value: event.target.value } : state))}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void commitInlineEdit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancelInlineEdit();
        }
      }}
      onBlur={() => {
        if (inlineEdit) {
          void commitInlineEdit();
        }
      }}
      className={cn("h-8 border-[#31343b] bg-[#0f1114] text-sm text-zinc-100", className)}
    />
  );

  const renderFolderTree = (parentId: string | null, depth: number): JSX.Element[] => {
    const key = parentId ?? ROOT_KEY;
    const children = (childrenByParent[key] ?? []).filter((node) => !node.deleted && node.nodeType === "FOLDER");

    return children.map((node) => {
      const childFolders = (childrenByParent[node.id] ?? []).filter((child) => !child.deleted && child.nodeType === "FOLDER");
      const expanded = expandedFolders.includes(node.id);
      const hasExpandableChildren = isDesktopFs || childFolders.length > 0;

      return (
        <div key={node.id} className="select-none">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  "group flex w-full items-center gap-1 rounded-md py-0.5",
                  location.mode === "folder" && currentFolderId === node.id ? "bg-[#24272d]" : "hover:bg-[#181b20]",
                  dragHoverFolderId === node.id && "bg-sky-500/14 ring-1 ring-inset ring-sky-400/60"
                )}
                style={{ paddingLeft: `${6 + depth * 14}px`, paddingRight: "6px" }}
                onContextMenu={() => {
                  setSelectedIds([node.id]);
                  setAnchorId(node.id);
                }}
                onDragOver={(event) => handleFolderDragOver(node.id, event)}
                onDragLeave={() => {
                  if (dragHoverFolderId === node.id) {
                    setDragHoverFolderId(null);
                  }
                }}
                onDrop={(event) => handleFolderDrop(node.id, event)}
              >
                <button
                  type="button"
                  aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  aria-expanded={expanded}
                  disabled={!hasExpandableChildren}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!hasExpandableChildren) {
                      return;
                    }

                    const nextExpanded = !expanded;
                    setFolderExpanded(node.id, nextExpanded);

                    if (nextExpanded && isDesktopFs) {
                      void refreshDesktopLocation(node.id);
                    }
                  }}
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-all duration-150 ease-out",
                    hasExpandableChildren
                      ? "cursor-pointer hover:bg-[#23262c] hover:text-zinc-200 active:scale-95"
                      : "pointer-events-none cursor-default opacity-0"
                  )}
                >
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200 ease-out",
                      expanded && "rotate-90 text-zinc-200"
                    )}
                  />
                </button>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => beginNodeDrag(node.id, event)}
                  onDragEnd={clearDragState}
                  onClick={() => {
                    navigateTo({ mode: "folder", folderId: node.id });
                    setSelectedIds([node.id]);
                    setAnchorId(node.id);
                    if (isDesktopFs) {
                      void refreshDesktopLocation(node.id);
                    }
                  }}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm transition-colors duration-150 ease-out",
                    location.mode === "folder" && currentFolderId === node.id ? "text-white" : "text-zinc-300 group-hover:text-zinc-100"
                  )}
                >
                  {expanded ? <Folder className="h-4 w-4 shrink-0 text-amber-300" /> : <FolderClosed className="h-4 w-4 shrink-0 text-amber-300" />}
                  <span className="truncate">{node.name}</span>
                </button>
              </div>
            </ContextMenuTrigger>
            {renderExplorerContextMenu(node)}
          </ContextMenu>

          {expanded && childFolders.length > 0 ? <div>{renderFolderTree(node.id, depth + 1)}</div> : null}
        </div>
      );
    });
  };

  const renderMoveDestinationTree = (parentId: string | null, depth: number): JSX.Element[] => {
    const key = parentId ?? ROOT_KEY;
    const children = (childrenByParent[key] ?? []).filter((node) => !node.deleted && node.nodeType === "FOLDER");

    return children.map((node) => {
      const childFolders = (childrenByParent[node.id] ?? []).filter((child) => !child.deleted && child.nodeType === "FOLDER");
      const expanded = moveDialogExpandedFolders.includes(node.id);
      const hasExpandableChildren = isDesktopFs || childFolders.length > 0;
      const selected = moveDialogState?.destinationId === node.id;
      const invalidTarget = Boolean(moveDialogState?.ids.some((id) => isDescendant(node.id, id, nodeById)));

      return (
        <div key={`move-destination-${node.id}`} className="select-none">
          <div
            className={cn(
              "group flex w-full items-center gap-1 rounded-md py-0.5",
              selected ? "bg-[#24272d]" : "hover:bg-[#181b20]",
              invalidTarget && "opacity-55"
            )}
            style={{ paddingLeft: `${6 + depth * 14}px`, paddingRight: "6px" }}
          >
            <button
              type="button"
              aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              aria-expanded={expanded}
              disabled={!hasExpandableChildren}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!hasExpandableChildren) {
                  return;
                }

                const nextExpanded = !expanded;
                setMoveDialogFolderExpanded(node.id, nextExpanded);

                if (nextExpanded && isDesktopFs) {
                  void refreshDesktopLocation(node.id);
                }
              }}
              className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-all duration-150 ease-out",
                hasExpandableChildren
                  ? "cursor-pointer hover:bg-[#23262c] hover:text-zinc-200 active:scale-95"
                  : "pointer-events-none cursor-default opacity-0"
              )}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200 ease-out",
                  expanded && "rotate-90 text-zinc-200"
                )}
              />
            </button>
            <button
              type="button"
              disabled={invalidTarget}
              onClick={() => {
                setMoveDialogState((state) => (state ? { ...state, destinationId: node.id } : state));
                if (!expanded && hasExpandableChildren && isDesktopFs) {
                  setMoveDialogFolderExpanded(node.id, true);
                  void refreshDesktopLocation(node.id);
                }
              }}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm transition-colors duration-150 ease-out",
                selected ? "text-white" : "text-zinc-300 group-hover:text-zinc-100",
                invalidTarget && "cursor-not-allowed text-zinc-600 group-hover:text-zinc-600"
              )}
            >
              {expanded ? <Folder className="h-4 w-4 shrink-0 text-amber-300" /> : <FolderClosed className="h-4 w-4 shrink-0 text-amber-300" />}
              <span className="truncate">{node.name}</span>
              {selected ? <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-zinc-500">Target</span> : null}
            </button>
          </div>

          {expanded && childFolders.length > 0 ? <div>{renderMoveDestinationTree(node.id, depth + 1)}</div> : null}
        </div>
      );
    });
  };
  const openSearchResult = (id: string, path?: string) => {
    const resolvedId = nodeById[id] ? id : path ? pathToId[path] : undefined;
    if (!resolvedId) {
      pushNotice("Result is not in current local cache", "info");
      return;
    }

    const node = nodeById[resolvedId];
    if (!node || node.deleted) {
      return;
    }

    if (node.nodeType === "FOLDER") {
      navigateTo({ mode: "folder", folderId: node.id });
      setSelectedIds([node.id]);
      setAnchorId(node.id);
      return;
    }

    navigateTo({ mode: "folder", folderId: node.parentId });
    setSelectedIds([node.id]);
    setAnchorId(node.id);
  };

  const downloadVersion = async (version: FileVersion) => {
    if (!primarySelected || !isUuid(primarySelected.id)) {
      pushNotice("Download requires backend-backed file id", "error");
      return;
    }

    try {
      const payload = await downloadFileVersion(primarySelected.id, version.id);
      const binary = atob(payload.payloadBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = primarySelected.name;
      anchor.click();
      URL.revokeObjectURL(href);
      pushNotice(`Downloaded ${primarySelected.name}`, "success");
    } catch {
      pushNotice("Download failed", "error");
    }
  };

  const moveDraggedNode = (targetFolderId: string) => {
    const draggedNodeIds = dedupeSelectionRoots(
      draggingIds.length > 0 ? draggingIds : draggingId ? [draggingId] : [],
      nodeById
    );
    if (draggedNodeIds.length === 0 || draggedNodeIds.includes(targetFolderId)) {
      clearDragState();
      return;
    }

    if (draggedNodeIds.some((id) => isDescendant(targetFolderId, id, nodeById))) {
      pushNotice("Cannot move folder into itself", "error");
      clearDragState();
      return;
    }

    if (isDesktopFs && desktopApi?.fileSystem?.movePath) {
      void performDesktopMove(draggedNodeIds, targetFolderId).finally(clearDragState);
      return;
    }

    const draggedItems = draggedNodeIds.map((id) => nodeById[id]).filter(Boolean);
    setNodes((prev) => {
      const next = [...prev];
      for (const id of draggedNodeIds) {
        const item = next.find((node) => node.id === id);
        if (!item) {
          continue;
        }
        item.parentId = targetFolderId;
        item.name = uniqueName(next, targetFolderId, item.name, item.id);
        item.updatedAt = new Date().toISOString();
      }
      return next;
    });

    pushNotice(`Moved ${draggedItems.length} item(s)`, "success");
    const backendIds = draggedItems.filter((item) => isUuid(item.id)).map((item) => item.id);
    if (backendIds.length > 0) {
      void Promise.all(backendIds.map((id) => moveNode(id, targetFolderId)))
        .then(() => treeQuery.refetch())
        .catch(() => pushNotice("Backend move failed, kept local position", "info"));
    }
    clearDragState();
  };

  const handleFolderDragOver = (targetFolderId: string, event: React.DragEvent<HTMLElement>) => {
    const droppedPaths = extractDroppedPaths(event.dataTransfer);
    const hasInternalDrag = draggingIds.length > 0 || draggingId !== null;
    if (!hasInternalDrag && droppedPaths.length === 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setDragHoverFolderId(targetFolderId);
    event.dataTransfer.dropEffect = droppedPaths.length > 0 ? "copy" : "move";
  };

  const handleFolderDrop = (targetFolderId: string, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragHoverFolderId(null);
    const droppedPaths = extractDroppedPaths(event.dataTransfer);
    if (droppedPaths.length > 0) {
      clearDragState();
      void importDroppedPaths(droppedPaths, targetFolderId);
      return;
    }
    moveDraggedNode(targetFolderId);
  };

  const handleCreateTag = async (name: string, colorHex: string) => {
    try {
      await createTag(name, colorHex);
      await tagsQuery.refetch();
      pushNotice("Tag created", "success");
    } catch {
      pushNotice("Could not create tag", "error");
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag(tagId);
      await tagsQuery.refetch();
      if (primarySelected && isUuid(primarySelected.id)) {
        const next = await fetchNodeTags(primarySelected.id);
        setAssignedTags(next);
      }
      pushNotice("Tag deleted", "success");
    } catch {
      pushNotice("Could not delete tag", "error");
    }
  };

  const handleAssignTag = async (tagId: string) => {
    if (!primarySelected || !isUuid(primarySelected.id)) {
      pushNotice("Select a backend-backed item first", "info");
      return;
    }

    try {
      await assignTagToNode(primarySelected.id, tagId);
      const next = await fetchNodeTags(primarySelected.id);
      setAssignedTags(next);
      await tagsQuery.refetch();
      pushNotice("Tag attached", "success");
    } catch {
      pushNotice("Could not attach tag", "error");
    }
  };

  const handleUnassignTag = async (tagId: string) => {
    if (!primarySelected || !isUuid(primarySelected.id)) {
      pushNotice("Select a backend-backed item first", "info");
      return;
    }

    try {
      await unassignTagFromNode(primarySelected.id, tagId);
      const next = await fetchNodeTags(primarySelected.id);
      setAssignedTags(next);
      await tagsQuery.refetch();
      pushNotice("Tag detached", "success");
    } catch {
      pushNotice("Could not detach tag", "error");
    }
  };

  const handleCreateSmartFolder = async (payload: {
    name: string;
    nameContains?: string;
    nodeType?: "FILE" | "FOLDER" | null;
    extensions: string[];
    requiredTagIds: string[];
    updatedWithinDays?: number | null;
    includeDeleted: boolean;
  }) => {
    try {
      await createSmartFolder(payload);
      await smartFoldersQuery.refetch();
      pushNotice("Smart folder saved", "success");
    } catch {
      pushNotice("Smart folder creation failed", "error");
    }
  };

  const handleDeleteSmartFolder = async (smartFolderId: string) => {
    try {
      await deleteSmartFolder(smartFolderId);
      if (activeSmartFolderId === smartFolderId) {
        setActiveSmartFolderId(null);
        setSmartFolderItems(null);
      }
      await smartFoldersQuery.refetch();
      pushNotice("Smart folder deleted", "success");
    } catch {
      pushNotice("Could not delete smart folder", "error");
    }
  };

  const handleSelectSmartFolder = (smartFolderId: string | null) => {
    setActiveSmartFolderId(smartFolderId);
    if (!smartFolderId) {
      setSmartFolderItems(null);
      pushNotice("Smart filter cleared", "info");
    } else {
      pushNotice("Smart folder applied", "success");
    }
  };

  const handleGrantUserPermission = async (userId: string, permissionType: "READ" | "WRITE" | "ADMIN") => {
    if (!primarySelected || !isUuid(primarySelected.id)) {
      pushNotice("Select a backend-backed item first", "info");
      return;
    }
    try {
      await grantUserPermission(primarySelected.id, userId, permissionType);
      setPermissions(await fetchPermissions(primarySelected.id));
      pushNotice("User permission granted", "success");
    } catch {
      pushNotice("Could not grant user permission", "error");
    }
  };

  const handleGrantRolePermission = async (roleName: string, permissionType: "READ" | "WRITE" | "ADMIN") => {
    if (!primarySelected || !isUuid(primarySelected.id)) {
      pushNotice("Select a backend-backed item first", "info");
      return;
    }
    try {
      await grantRolePermission(primarySelected.id, roleName, permissionType);
      setPermissions(await fetchPermissions(primarySelected.id));
      pushNotice("Role permission granted", "success");
    } catch {
      pushNotice("Could not grant role permission", "error");
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    if (!primarySelected || !isUuid(primarySelected.id)) {
      pushNotice("Select a backend-backed item first", "info");
      return;
    }
    try {
      await revokePermission(primarySelected.id, permissionId);
      setPermissions(await fetchPermissions(primarySelected.id));
      pushNotice("Permission revoked", "success");
    } catch {
      pushNotice("Could not revoke permission", "error");
    }
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        (newMenuButtonRef.current && target && newMenuButtonRef.current.contains(target)) ||
        (newMenuRef.current && target && newMenuRef.current.contains(target))
      ) {
        return;
      }

      setShowNewMenu(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable));

      if (event.key === "Escape") {
        setDialogState(null);
        setInlineEdit(null);
        setIsAddressEditing(false);
        return;
      }

      if (isTyping) {
        return;
      }

      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        handleGoBack();
        return;
      }

      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        handleGoForward();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        handleGoUp();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(visibleIds);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyCutSelection("copy");
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
        event.preventDefault();
        copyCutSelection("cut");
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        void duplicateSelection();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openDialog("new-folder");
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
        event.preventDefault();
        startAddressEditing();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        void copyPathsToClipboard(selectedIds);
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
        void deleteSelection();
        return;
      }

      if (event.key === "F2") {
        event.preventDefault();
        if (canRenameNode(primarySelected)) {
          beginInlineRename(primarySelected);
        }
        return;
      }

      if (event.altKey && event.key === "Enter" && primarySelected) {
        event.preventDefault();
        void showProperties(primarySelected);
        return;
      }

      if (event.key === "Enter" && primarySelected) {
        event.preventDefault();
        openNode(primarySelected);
        return;
      }

      if (event.key === "F5") {
        event.preventDefault();
        void refreshFromServer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (!marquee) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      setMarquee((state) => (state ? { ...state, currentX: event.clientX, currentY: event.clientY } : state));

      const selectionRect = new DOMRect(
        Math.min(marquee.originX, event.clientX),
        Math.min(marquee.originY, event.clientY),
        Math.abs(event.clientX - marquee.originX),
        Math.abs(event.clientY - marquee.originY)
      );

      const matched = visibleItems
        .filter((node) => {
          const element = itemElementRefs.current[node.id];
          if (!element) {
            return false;
          }
          return intersectsRect(element.getBoundingClientRect(), selectionRect);
        })
        .map((node) => node.id);

      setSelectedIds(matched);
      setAnchorId(matched[0] ?? null);
    };

    const onPointerUp = () => {
      setMarquee(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [marquee, visibleItems]);

  const moveDialogDestinationNode = moveDialogState?.destinationId ? nodeById[moveDialogState.destinationId] ?? null : null;
  const moveDialogInvalidTarget = Boolean(
    moveDialogState?.destinationId && moveDialogState.ids.some((id) => isDescendant(moveDialogState.destinationId, id, nodeById))
  );
  const activeLocationLabel = location.mode === "trash" ? "Recycle Bin" : breadcrumbs.at(-1)?.label ?? "Home";
  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.025),transparent_18%),linear-gradient(180deg,#050607_0%,#090a0c_52%,#050607_100%)] text-zinc-100">
      <div className="explorer-glow mx-auto flex h-screen max-w-[1900px] flex-col overflow-hidden border-x border-[#1a1c20] bg-[#0d0f11]/96 backdrop-blur">
        <div className="sticky top-0 z-40 shrink-0 bg-[#0c0d10]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0c0d10]/86">
        <header className="flex h-12 items-end justify-between border-b border-[#242424] bg-[#1c1c1c] px-1.5 pt-1.5" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
          <div className="flex min-w-0 items-end gap-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-300">
              <img src={logoSrc} alt="TriadFS" className="h-5 w-5 object-contain" />
            </div>
            <div className="flex min-w-0 items-end gap-1">
              {explorerTabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    className={cn(
                      "group flex h-10 min-w-[120px] max-w-[240px] items-center gap-2 rounded-t-xl border border-b-0 px-3 text-sm transition-colors",
                      isActive
                        ? "border-[#303030] bg-[#262626] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                        : "border-transparent bg-[#1c1c1c] text-zinc-400 hover:bg-[#232323] hover:text-zinc-200",
                      draggingTabId === tab.id && "opacity-60",
                      draggingTabId && draggingTabId !== tab.id && "data-[tab-drop=true]:border-sky-400/60 data-[tab-drop=true]:bg-sky-500/10"
                    )}
                    data-tab-drop={draggingTabId && draggingTabId !== tab.id ? "true" : "false"}
                    style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                    draggable
                    onDragStart={(event) => {
                      setDraggingTabId(tab.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", resolveLocationLabel(tab.location));
                    }}
                    onDragEnd={() => setDraggingTabId(null)}
                    onDragOver={(event) => {
                      if (!draggingTabId || draggingTabId === tab.id) {
                        return;
                      }
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggingTabId && draggingTabId !== tab.id) {
                        reorderTabs(draggingTabId, tab.id);
                      }
                      setDraggingTabId(null);
                    }}
                  >
                    {tab.location.mode === "trash" ? <Trash2 className="h-4 w-4 shrink-0" /> : <Home className="h-4 w-4 shrink-0" />}
                    <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => activateTab(tab.id)}>
                      {resolveLocationLabel(tab.location)}
                    </button>
                    {!tab.locked ? (
                      <button
                        type="button"
                        className="ml-2 rounded p-0.5 text-zinc-500 transition hover:bg-[#22252b] hover:text-zinc-200"
                        onClick={() => closeTab(tab.id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-t-xl border border-b-0 border-transparent text-zinc-400 transition hover:bg-[#232323] hover:text-zinc-100"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                onClick={() => openLocationInNewTab(location)}
                aria-label="Open current location in new tab"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-stretch self-start" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <Button type="button" size="sm" variant="ghost" className="h-9 w-12 rounded-none p-0 text-zinc-300 hover:bg-[#2a2a2a]" onClick={() => desktopApi?.windowControls?.minimize?.()}>
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-9 w-12 rounded-none p-0 text-zinc-300 hover:bg-[#2a2a2a]" onClick={() => desktopApi?.windowControls?.maximizeToggle?.()}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-9 w-12 rounded-none p-0 text-zinc-300 hover:bg-[#c42b1c] hover:text-white" onClick={() => desktopApi?.windowControls?.close?.()}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>

        <div className="flex h-[52px] items-center gap-2 border-b border-[#242424] bg-[#202020] px-3">
          <Button type="button" size="sm" variant="ghost" onClick={handleGoBack} disabled={backStack.length === 0} className="h-9 w-9 rounded-full p-0 text-zinc-300 hover:bg-[#2c2c2c]">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handleGoForward} disabled={forwardStack.length === 0} className="h-9 w-9 rounded-full p-0 text-zinc-300 hover:bg-[#2c2c2c]">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handleGoUp} className="h-9 w-9 rounded-full p-0 text-zinc-300 hover:bg-[#2c2c2c]">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => void refreshFromServer()} className="h-9 w-9 rounded-full p-0 text-zinc-300 hover:bg-[#2c2c2c]">
            <RefreshCw className={cn("h-4 w-4", treeQuery.isFetching && "animate-spin")} />
          </Button>

          <div
            className="ml-1 flex h-10 min-w-0 flex-1 items-center rounded-md border border-[#404040] bg-[#343434] px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
          >
            {isAddressEditing ? (
              <Input
                ref={addressInputRef}
                value={addressValue}
                onChange={(event) => setAddressValue(event.target.value)}
                onBlur={() => void submitAddressNavigation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitAddressNavigation();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    cancelAddressEditing();
                  }
                }}
                className="h-8 border-0 bg-transparent px-1 text-zinc-100 shadow-none outline-none focus-visible:ring-0"
              />
            ) : (
              <button
                type="button"
                onClick={startAddressEditing}
                className="flex h-full min-w-0 flex-1 cursor-text items-center rounded text-left"
                title="Click to type a path or press Ctrl+L"
              >
                <Home className="mr-2 h-4 w-4 shrink-0 text-zinc-200" />
                {breadcrumbs.map((crumb, index) => (
                  <div key={`${crumb.label}-${index}`} className="flex items-center">
                    {index > 0 && <ChevronRight className="mx-1 h-3.5 w-3.5 text-zinc-400" />}
                    <span
                      className="rounded px-1.5 py-0.5 text-sm text-zinc-100 hover:bg-[#454545]"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigateTo({ mode: "folder", folderId: crumb.folderId });
                      }}
                    >
                      {crumb.label}
                    </span>
                  </div>
                ))}
                <span className="min-w-[32px] flex-1" />
              </button>
            )}
          </div>

          <div className="relative w-[320px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-300" />
            <Input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={`Search ${activeLocationLabel}`}
              className="h-10 rounded-md border-[#404040] bg-[#343434] pl-4 pr-10 text-zinc-100 placeholder:text-zinc-300/70 focus-visible:ring-0"
            />
            <AnimatePresence>
              {(searchTerm !== deferredSearchTerm || treeQuery.isFetching) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <LoaderCircle className="h-4 w-4 animate-spin text-zinc-300" />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
            {searchTerm.trim().length >= 2 && searchQuery.data && searchQuery.data.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute top-10 z-40 w-full rounded-md border border-[#26292f] bg-[#121417] p-1 shadow-2xl"
              >
                {searchQuery.data.slice(0, 8).map((result) => (
                  <button
                    key={`${result.id}-${result.path}`}
                    type="button"
                    onClick={() => openSearchResult(result.id, result.path)}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-[#1d2127]"
                  >
                    <span className="truncate">{result.name}</span>
                    <span className="truncate pl-2 text-xs text-zinc-500">{result.path}</span>
                  </button>
                ))}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex h-12 items-center justify-between border-b border-[#1b1d21] px-3">
          <div className="flex items-center gap-1">
            <div className="relative">
              <Button
                ref={newMenuButtonRef}
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white"
                onClick={() => setShowNewMenu((value) => !value)}
                disabled={!canCreateInCurrentLocation}
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
              {showNewMenu && (
                <div ref={newMenuRef} className="absolute left-0 top-9 z-40 min-w-[160px] rounded-md border border-[#26292f] bg-[#121417] p-1 shadow-xl">
                  <button type="button" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[#1d2127]" onClick={() => openDialog("new-folder")}>New Folder</button>
                  <button type="button" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[#1d2127]" onClick={() => openDialog("new-file")}>New File Node</button>
                </div>
              )}
            </div>

            <Button type="button" size="sm" variant="ghost" className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white" onClick={() => copyCutSelection("cut")}>
              <Scissors className="h-4 w-4" />
              Cut
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white" onClick={() => copyCutSelection("copy")}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white"
              onClick={() => void copySelectionToDirectory()}
              disabled={!isDesktopFs || selectedIds.length === 0}
            >
              <ExternalLink className="h-4 w-4" />
              Copy to
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white" onClick={() => void duplicateSelection()} disabled={selectedIds.length === 0}>
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white" onClick={pasteClipboard}>
              <LayoutGrid className="h-4 w-4" />
              Paste
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white" onClick={() => void shareSelection()}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            {location.mode === "trash" ? (
              <Button type="button" size="sm" variant="ghost" className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white" onClick={() => void restoreSelection()}>
                <RefreshCw className="h-4 w-4" />
                Restore
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white" onClick={() => void deleteSelection()}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white"
              onClick={() => beginInlineRename(primarySelected)}
              disabled={!canRenameNode(primarySelected)}
            >
              <Pencil className="h-4 w-4" />
              Rename
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white"
              onClick={() => void moveSelectionToDirectory()}
              disabled={!isDesktopFs || selectedIds.length === 0}
            >
              <ExternalLink className="h-4 w-4" />
              Move to
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white" onClick={cycleSort}>
              <ArrowDownAZ className="h-4 w-4" />
              Sort: {sortKey}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white"
              onClick={() => setSortDirection((value) => (value === "asc" ? "desc" : "asc"))}
            >
              {sortDirection === "asc" ? "Asc" : "Desc"}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white" onClick={cycleFilter}>
              <Filter className="h-4 w-4" />
              Filter: {typeFilter}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white"
              onClick={() => setViewMode((mode) => (mode === "details" ? "tiles" : "details"))}
            >
              {viewMode === "details" ? <Grid2x2 className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              {viewMode === "details" ? "Tiles" : "Details"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowDetailsPane((value) => !value)}
              className="h-8 gap-2 text-zinc-300 hover:bg-[#1b1e23] hover:text-white"
            >
              <LayoutList className="h-4 w-4" />
              Details
            </Button>
          </div>
        </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="explorer-panel w-[278px] shrink-0 overflow-y-auto border-r border-[#1b1d21] px-2 py-3">
            <button
              type="button"
              onClick={() => setShowQuickAccessSection((value) => !value)}
              className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-xs uppercase tracking-[0.15em] text-zinc-500 transition-colors duration-150 hover:bg-[#181b20] hover:text-zinc-300"
            >
              <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out", showQuickAccessSection && "rotate-90")} />
              <span>Quick Access</span>
            </button>
            {showQuickAccessSection ? (
              <div
                className={cn("mt-2 space-y-1 rounded-lg transition-colors", dragHoverFolderId === "__quick-access__" && "bg-sky-500/8 ring-1 ring-inset ring-sky-400/50")}
                onDragOver={(event) => {
                  const dragIds = draggingIds.length > 0 ? draggingIds : draggingId ? [draggingId] : [];
                  const firstFolder = dragIds.map((id) => nodeById[id]).find((node) => node?.nodeType === "FOLDER");
                  if (!firstFolder) {
                    return;
                  }
                  event.preventDefault();
                  setDragHoverFolderId("__quick-access__");
                  event.dataTransfer.dropEffect = "copy";
                }}
                onDragLeave={() => {
                  if (dragHoverFolderId === "__quick-access__") {
                    setDragHoverFolderId(null);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragHoverFolderId(null);
                  const dragIds = draggingIds.length > 0 ? draggingIds : draggingId ? [draggingId] : [];
                  const firstFolder = dragIds.map((id) => nodeById[id]).find((node) => node?.nodeType === "FOLDER");
                  if (firstFolder) {
                    pinToQuickAccess(firstFolder);
                  }
                  clearDragState();
                }}
              >
                {[
                  { key: "home", label: "Home", icon: Home, action: () => navigateTo({ mode: "folder", folderId: null }) },
                  {
                    key: "desktop",
                    label: "Desktop",
                    icon: FolderClosed,
                    action: () => {
                      if (navigateToDesktopFolder(desktopSpecialPaths.desktop)) {
                        return;
                      }
                      navigateTo({ mode: "folder", folderId: null });
                    }
                  },
                  {
                    key: "downloads",
                    label: "Downloads",
                    icon: HardDriveDownload,
                    action: () => {
                      if (navigateToDesktopFolder(desktopSpecialPaths.downloads)) {
                        return;
                      }
                      navigateTo({ mode: "folder", folderId: null });
                    }
                  },
                  {
                    key: "documents",
                    label: "Documents",
                    icon: FolderClosed,
                    action: () => {
                      if (navigateToDesktopFolder(desktopSpecialPaths.documents)) {
                        return;
                      }
                      navigateTo({ mode: "folder", folderId: null });
                    }
                  },
                  { key: "recent", label: "Recent", icon: Clock3, action: () => setScopeFilter("recent") },
                  { key: "favorites", label: "Favorites", icon: Star, action: () => setScopeFilter("favorites") },
                  { key: "shared", label: "Shared", icon: Share2, action: () => setScopeFilter("shared") },
                  { key: "trash", label: "Recycle Bin", icon: Trash2, action: () => navigateTo({ mode: "trash", folderId: null }) }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={item.action}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-[#181b20]",
                        (item.key === "desktop" && currentFolderId === desktopSpecialPaths.desktop) ||
                          (item.key === "downloads" && currentFolderId === desktopSpecialPaths.downloads) ||
                          (item.key === "documents" && currentFolderId === desktopSpecialPaths.documents) ||
                          (item.key === "recent" && scopeFilter === "recent") ||
                          (item.key === "favorites" && scopeFilter === "favorites") ||
                          (item.key === "shared" && scopeFilter === "shared") ||
                          (item.key === "trash" && location.mode === "trash")
                          ? "bg-[#24272d] text-white"
                          : ""
                      )}
                    >
                      <Icon className="h-4 w-4 text-zinc-400" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {quickAccessFolders.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowPinnedSection((value) => !value)}
                  className="mt-4 flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-xs uppercase tracking-[0.15em] text-zinc-500 transition-colors duration-150 hover:bg-[#181b20] hover:text-zinc-300"
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out", showPinnedSection && "rotate-90")} />
                  <span>Pinned</span>
                </button>
                {showPinnedSection ? (
                  <div className="mt-2 space-y-1">
                    {quickAccessFolders.map((node) => (
                      <ContextMenu key={node.id}>
                        <ContextMenuTrigger asChild>
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) => beginNodeDrag(node.id, event)}
                            onDragEnd={clearDragState}
                            onClick={() => {
                              navigateTo({ mode: "folder", folderId: node.id });
                              setSelectedIds([node.id]);
                              setAnchorId(node.id);
                              if (isDesktopFs) {
                                void refreshDesktopLocation(node.id);
                              }
                            }}
                            onContextMenu={() => {
                              setSelectedIds([node.id]);
                              setAnchorId(node.id);
                            }}
                            onDragOver={(event) => handleFolderDragOver(node.id, event)}
                            onDragLeave={() => {
                              if (dragHoverFolderId === node.id) {
                                setDragHoverFolderId(null);
                              }
                            }}
                            onDrop={(event) => handleFolderDrop(node.id, event)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-[#181b20]",
                              dragHoverFolderId === node.id && "bg-sky-500/12 ring-1 ring-inset ring-sky-400/55"
                            )}
                          >
                            <Folder className="h-4 w-4 text-amber-300" />
                            <span className="truncate">{node.name}</span>
                          </button>
                        </ContextMenuTrigger>
                        {renderExplorerContextMenu(node)}
                      </ContextMenu>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            <p className="mt-4 px-2 text-xs uppercase tracking-[0.15em] text-zinc-500">Folders</p>
            <div className="mt-2 max-h-[calc(100vh-330px)] overflow-y-auto pr-1">{renderFolderTree(null, 0)}</div>
          </aside>

          <ContextMenu>
          <ContextMenuTrigger asChild>
          <main
            ref={contentSurfaceRef}
            onPointerDown={handleSelectionSurfacePointerDown}
            onDragOver={handleContentDragOver}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setContentDropActive(false);
              }
            }}
            onDrop={handleContentDrop}
            className={cn(
              "relative min-w-0 flex-1 overflow-y-auto bg-[#090b0d] px-5 py-4 transition-colors",
              contentDropActive && "bg-sky-500/6"
            )}
          >
            {contentDropActive ? (
              <div className="pointer-events-none sticky top-3 z-20 mb-4 rounded-xl border border-dashed border-sky-400/70 bg-sky-500/10 px-4 py-3 text-sm text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]">
                Drop here to move or import into {activeLocationLabel}
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-100">
                  {location.mode === "trash" ? "Recycle Bin" : breadcrumbs.at(-1)?.label ?? "Home"}
                </h2>
                {activeSmartFolder ? (
                    <p className="mt-1 text-xs text-zinc-300">Smart Folder: {activeSmartFolder.name}</p>
                ) : null}
              </div>
              <div className="text-sm text-zinc-500">
                {visibleItems.length} item(s) {selectedIds.length > 0 ? `- ${selectedIds.length} selected` : ""}
              </div>
            </div>

            {isHomeView ? (
              <>
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4"
                >
                  {quickStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="rounded-xl border border-[#1f2227] bg-[linear-gradient(180deg,#121417_0%,#0c0d10_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition duration-200 hover:border-[#30343a]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{stat.label}</span>
                          <Icon className={cn("h-4 w-4", stat.tone)} />
                        </div>
                        <div className="mt-3 text-xl font-semibold tracking-tight text-zinc-100">{stat.value}</div>
                      </div>
                    );
                  })}
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut", delay: 0.04 }}
                  className="mt-5"
                >
                  <h3 className="text-lg font-medium text-zinc-200">Recommended</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {recommendedFiles.map((file) => (
                      <ContextMenu key={file.id}>
                        <ContextMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIds([file.id]);
                              setAnchorId(file.id);
                            }}
                            onContextMenu={() => {
                              setSelectedIds([file.id]);
                              setAnchorId(file.id);
                            }}
                            onDoubleClick={() => openNode(file)}
                            className={cn(
                              "rounded-xl border border-[#24272d] bg-[#14161a] p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#343841] hover:bg-[#191c21]",
                              selectedIds.includes(file.id) && "border-[#5c6571] bg-[#1b1e24]"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <FileText className="h-8 w-8 text-zinc-300" />
                              <span className="rounded bg-[#22252b] px-2 py-0.5 text-xs text-zinc-300">Open</span>
                            </div>
                            <p className="mt-4 truncate text-sm font-medium text-zinc-100">{file.name}</p>
                            <p className="mt-1 truncate text-xs text-zinc-500">{pathById[file.id] ?? "/"}</p>
                          </button>
                        </ContextMenuTrigger>
                        {renderExplorerContextMenu(file)}
                      </ContextMenu>
                    ))}
                  </div>
                </motion.section>
              </>
            ) : null}

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut", delay: 0.08 }}
              className="mt-6"
            >
              <ExplorerScopeTabs
                value={scopeFilter}
                onChange={(value) => setScopeFilter(value)}
                smartFolders={smartFoldersQuery.data ?? []}
                activeSmartFolderId={activeSmartFolderId}
                onSelectSmartFolder={handleSelectSmartFolder}
              />

              {viewMode === "tiles" ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                  {inlineCreateActive ? (
                    <div className="rounded-lg border border-dashed border-[#3a3f47] bg-[#111317] p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1a1d22]">
                        {inlineEdit?.mode === "new-folder" ? <Folder className="h-6 w-6 text-amber-300" /> : <FileText className="h-6 w-6 text-zinc-300" />}
                      </div>
                      <div className="mt-3">{renderInlineNameInput()}</div>
                    </div>
                  ) : null}
                  <AnimatePresence initial={false}>
                    {visibleItems.map((node) => (
                      <motion.div
                        key={node.id}
                        layout
                        initial={{ opacity: 0, scale: 0.985, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.985, y: -6 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                      >
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <button
                              type="button"
                              ref={registerItemElement(node.id)}
                              data-node-entry="true"
                              draggable
                              onDragStart={(event) => beginNodeDrag(node.id, event)}
                              onDragEnd={clearDragState}
                              onClick={(event) => selectEntry(node.id, event)}
                              onDoubleClick={() => openNode(node)}
                              onContextMenu={() => {
                                setSelectedIds((prev) => (prev.includes(node.id) ? prev : [node.id]));
                                setAnchorId(node.id);
                              }}
                              onDrop={(event) => {
                                if (node.nodeType === "FOLDER") {
                                  handleFolderDrop(node.id, event);
                                }
                              }}
                              onDragOver={(event) => {
                                if (node.nodeType === "FOLDER") {
                                  handleFolderDragOver(node.id, event);
                                }
                              }}
                              onDragLeave={() => {
                                if (dragHoverFolderId === node.id) {
                                  setDragHoverFolderId(null);
                                }
                              }}
                              className={cn(
                                "w-full rounded-lg border border-[#24272d] bg-[#131519] p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#343841] hover:bg-[#191c21]",
                                selectedIds.includes(node.id) && "border-[#5c6571] bg-[#1b1e24]",
                                dragHoverFolderId === node.id && "border-sky-400/70 bg-sky-500/12 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                              )}
                            >
                              {node.nodeType === "FOLDER" ? <Folder className="h-9 w-9 text-amber-300" /> : <FileText className="h-9 w-9 text-zinc-300" />}
                              <div className="mt-3">
                                {inlineEdit?.mode === "rename" && inlineEdit.targetId === node.id ? renderInlineNameInput() : <p className="truncate text-sm">{node.name}</p>}
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">{node.nodeType === "FOLDER" ? "Folder" : extensionOf(node.name).toUpperCase() || "File"}</p>
                            </button>
                          </ContextMenuTrigger>
                          {renderExplorerContextMenu(node)}
                        </ContextMenu>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[#24272d]">
                  <div className="grid grid-cols-[2fr_1fr_0.7fr] bg-[#131519] px-4 py-2 text-xs uppercase tracking-[0.08em] text-zinc-500">
                    <button type="button" className="text-left" onClick={() => setSortKey("name")}>Name</button>
                    <button type="button" className="text-left" onClick={() => setSortKey("modified")}>Date modified</button>
                    <button type="button" className="text-right" onClick={() => setSortKey("size")}>Size</button>
                  </div>
                  <div className="divide-y divide-[#1c1f24] bg-[#0f1114]">
                    {inlineCreateActive ? (
                      <div className="grid grid-cols-[2fr_1fr_0.7fr] items-center px-4 py-2.5">
                        <span className="flex min-w-0 items-center gap-2">
                          {inlineEdit?.mode === "new-folder" ? <Folder className="h-4 w-4 shrink-0 text-amber-300" /> : <FileText className="h-4 w-4 shrink-0 text-zinc-300" />}
                          {renderInlineNameInput("max-w-[320px]")}
                        </span>
                        <span className="truncate text-zinc-500">Pending</span>
                        <span className="text-right text-zinc-500">-</span>
                      </div>
                    ) : null}
                    <AnimatePresence initial={false}>
                      {visibleItems.map((node) => (
                        <motion.div
                          key={node.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.14, ease: "easeOut" }}
                        >
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <button
                                type="button"
                                ref={registerItemElement(node.id)}
                                data-node-entry="true"
                                draggable
                                onDragStart={(event) => beginNodeDrag(node.id, event)}
                                onDragEnd={clearDragState}
                                onClick={(event) => selectEntry(node.id, event)}
                                onDoubleClick={() => openNode(node)}
                                onContextMenu={() => {
                                  setSelectedIds((prev) => (prev.includes(node.id) ? prev : [node.id]));
                                  setAnchorId(node.id);
                                }}
                                onDrop={(event) => {
                                  if (node.nodeType === "FOLDER") {
                                    handleFolderDrop(node.id, event);
                                  }
                                }}
                                onDragOver={(event) => {
                                  if (node.nodeType === "FOLDER") {
                                    handleFolderDragOver(node.id, event);
                                  }
                                }}
                                onDragLeave={() => {
                                  if (dragHoverFolderId === node.id) {
                                    setDragHoverFolderId(null);
                                  }
                                }}
                                className={cn(
                                  "grid w-full grid-cols-[2fr_1fr_0.7fr] items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-[#171a1f]",
                                  selectedIds.includes(node.id) && "bg-[#1d2128]",
                                  dragHoverFolderId === node.id && "bg-sky-500/12 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]"
                                )}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  {node.nodeType === "FOLDER" ? <Folder className="h-4 w-4 shrink-0 text-amber-300" /> : <FileText className="h-4 w-4 shrink-0 text-zinc-300" />}
                                  {inlineEdit?.mode === "rename" && inlineEdit.targetId === node.id ? renderInlineNameInput("max-w-[320px]") : <span className="truncate">{node.name}</span>}
                                </span>
                                <span className="truncate text-zinc-400">{formatDate(node.updatedAt)}</span>
                                <span className="text-right text-zinc-400">{formatBytes(node.sizeBytes)}</span>
                              </button>
                            </ContextMenuTrigger>
                            {renderExplorerContextMenu(node)}
                          </ContextMenu>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.section>
            {marqueeBox ? (
              <div
                className="pointer-events-none fixed z-30 rounded-sm border border-sky-400/70 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]"
                style={{
                  left: marqueeBox.left,
                  top: marqueeBox.top,
                  width: marqueeBox.width,
                  height: marqueeBox.height
                }}
              />
            ) : null}
          </main>
          </ContextMenuTrigger>
          {renderExplorerContextMenu(null, "background")}
          </ContextMenu>

          <AnimatePresence initial={false}>
          {showDetailsPane && (
            <motion.aside
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="explorer-panel w-[322px] shrink-0 overflow-y-auto border-l border-[#1b1d21] px-4 py-4"
            >
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">Details</h3>
              <Tabs defaultValue="meta" className="mt-3">
                <TabsList className="grid h-9 w-full grid-cols-4 bg-[#15171a]">
                  <TabsTrigger value="meta" className="text-xs data-[state=active]:bg-[#2b2f36] data-[state=active]:text-zinc-100">Meta</TabsTrigger>
                  <TabsTrigger value="tags" className="text-xs data-[state=active]:bg-[#2b2f36] data-[state=active]:text-zinc-100">Tags</TabsTrigger>
                  <TabsTrigger value="acl" className="text-xs data-[state=active]:bg-[#2b2f36] data-[state=active]:text-zinc-100">ACL</TabsTrigger>
                  <TabsTrigger value="smart" className="text-xs data-[state=active]:bg-[#2b2f36] data-[state=active]:text-zinc-100">Smart</TabsTrigger>
                </TabsList>

                <TabsContent value="meta" className="space-y-3 text-sm">
                  {primarySelected ? (
                    <>
                      <div className="rounded-lg border border-[#24272d] bg-[#15171a] p-3">
                        <div className="flex items-center gap-2">
                          {primarySelected.nodeType === "FOLDER" ? <Folder className="h-5 w-5 text-amber-300" /> : <FileText className="h-5 w-5 text-[#8ec7ff]" />}
                          <p className="truncate font-medium">{primarySelected.name}</p>
                        </div>
                        <p className="mt-2 break-all text-xs text-zinc-500">{pathById[primarySelected.id] ?? "/"}</p>
                      </div>

                      {detailsLoading ? (
                        <div className="space-y-3 rounded-lg border border-[#24272d] bg-[#121417] p-3">
                          <Skeleton className="h-4 w-28 bg-[#22262c]" />
                          <Skeleton className="h-4 w-40 bg-[#22262c]" />
                          <Skeleton className="h-24 w-full bg-[#22262c]" />
                        </div>
                      ) : null}

                      {activeDetailsMetadata ? (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-[#2b3138] bg-[#111317] text-zinc-200">
                              {activeDetailsMetadata.kind === "FOLDER" ? "Folder" : "File"}
                            </Badge>
                            <Badge variant="outline" className="border-[#2b3138] bg-[#111317] text-zinc-300">
                              {activeDetailsMetadata.mimeType}
                            </Badge>
                            {activeDetailsMetadata.hidden ? (
                              <Badge variant="outline" className="border-[#2b3138] bg-[#111317] text-zinc-300">
                                Hidden
                              </Badge>
                            ) : null}
                            {!activeDetailsMetadata.writable ? (
                              <Badge variant="outline" className="border-[#473229] bg-[#1a1310] text-amber-200">
                                Read only
                              </Badge>
                            ) : null}
                            {activeDetailsMetadata.symlink ? (
                              <Badge variant="outline" className="border-[#2f3145] bg-[#13131a] text-violet-200">
                                Symlink
                              </Badge>
                            ) : null}
                          </div>

                          {detailsPreview && detailsPreview.kind !== "none" ? (
                            <div className="overflow-hidden rounded-lg border border-[#24272d] bg-[#101214]">
                              <div className="flex items-center justify-between border-b border-[#20242a] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                <span>Preview</span>
                                <span>{detailsPreview.kind}</span>
                              </div>
                              {detailsPreview.kind === "image" && detailsPreview.fileUrl ? (
                                <img src={detailsPreview.fileUrl} alt={primarySelected.name} className="max-h-64 w-full object-contain bg-[#0c0d10]" />
                              ) : null}
                              {detailsPreview.kind === "audio" && detailsPreview.fileUrl ? (
                                <div className="p-3">
                                  <audio controls className="w-full" src={detailsPreview.fileUrl} />
                                </div>
                              ) : null}
                              {detailsPreview.kind === "video" && detailsPreview.fileUrl ? (
                                <div className="p-3">
                                  <video controls className="max-h-64 w-full rounded-md bg-black" src={detailsPreview.fileUrl} />
                                </div>
                              ) : null}
                              {detailsPreview.kind === "pdf" && detailsPreview.fileUrl ? (
                                <div className="p-3 text-sm text-zinc-300">
                                  PDF preview is available through your system viewer.
                                  <div className="mt-3">
                                    <Button type="button" size="sm" variant="outline" className="h-8 text-zinc-200" onClick={() => openNode(primarySelected)}>
                                      Open PDF
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                              {detailsPreview.kind === "text" ? (
                                <div className="max-h-64 overflow-auto p-3">
                                  <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-zinc-300">
                                    {detailsPreview.textContent || "No previewable text content"}
                                  </pre>
                                  {detailsPreview.truncated ? (
                                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500">Preview truncated</p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-[#24272d] bg-[#121417] px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Modified</p>
                              <p className="mt-1 text-sm text-zinc-200">{formatDate(activeDetailsMetadata.updatedAt)}</p>
                            </div>
                            <div className="rounded-lg border border-[#24272d] bg-[#121417] px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Size</p>
                              <p className="mt-1 text-sm text-zinc-200">{formatBytes(activeDetailsMetadata.sizeBytes)}</p>
                            </div>
                            <div className="rounded-lg border border-[#24272d] bg-[#121417] px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Items</p>
                              <p className="mt-1 text-sm text-zinc-200">{activeDetailsMetadata.itemCount}</p>
                            </div>
                            <div className="rounded-lg border border-[#24272d] bg-[#121417] px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Extension</p>
                              <p className="mt-1 text-sm text-zinc-200">{activeDetailsMetadata.extension || "-"}</p>
                            </div>
                          </div>

                          <div className="rounded-lg border border-[#24272d] bg-[#121417] p-3">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Integrity</p>
                            <p className="mt-2 text-xs text-zinc-400">
                              SHA-256:{" "}
                              <span className="break-all text-zinc-200">
                                {activeDetailsMetadata.sha256 ?? (activeDetailsMetadata.kind === "FILE" ? "Not computed for large files" : "Folder")}
                              </span>
                            </p>
                          </div>
                        </>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="outline" className="h-8 text-zinc-200" onClick={() => toggleFavorite(primarySelected.id)}>
                          <Star className={cn("mr-2 h-4 w-4", favoriteIds.includes(primarySelected.id) && "fill-current text-yellow-400")} />
                          {favoriteIds.includes(primarySelected.id) ? "Unfavorite" : "Favorite"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-zinc-200" onClick={() => openNode(primarySelected)}>
                          Open
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-zinc-200" onClick={() => void copyPathsToClipboard([primarySelected.id])}>
                          Copy path
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-zinc-200" onClick={() => void showProperties(primarySelected)}>
                          Properties
                        </Button>
                        {isDesktopFs ? (
                          <Button type="button" size="sm" variant="outline" className="h-8 text-zinc-200" onClick={() => void revealSelection(primarySelected)}>
                            Reveal
                          </Button>
                        ) : null}
                      </div>

                      {primarySelected.nodeType === "FILE" && (
                        <div className="rounded-md border border-[#24272d] bg-[#121417] p-3">
                          <p className="mb-2 text-xs uppercase tracking-[0.1em] text-zinc-500">Version History</p>
                          {versionsQuery.isLoading ? (
                            <p className="text-xs text-zinc-500">Loading versions...</p>
                          ) : versionsQuery.data && versionsQuery.data.length > 0 ? (
                            <div className="space-y-2">
                              {versionsQuery.data.slice(0, 4).map((version) => (
                                <div key={version.id} className="rounded border border-[#282b31] bg-[#17191d] p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold">v{version.versionNo}</span>
                                    <button type="button" className="text-xs text-zinc-300 hover:text-zinc-100" onClick={() => void downloadVersion(version)}>
                                      Download
                                    </button>
                                  </div>
                                  <p className="mt-1 text-xs text-zinc-400">{formatBytes(version.totalSizeBytes)} - {formatDate(version.createdAt)}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500">No persisted versions yet.</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500">Select a file or folder to see metadata, versions, and actions.</p>
                  )}
                </TabsContent>

                <TabsContent value="tags">
                  <TagManagerPanel
                    selectedNodeId={primarySelected?.id ?? null}
                    allTags={tagsQuery.data ?? []}
                    assignedTags={assignedTags}
                    onCreateTag={handleCreateTag}
                    onAssignTag={handleAssignTag}
                    onUnassignTag={handleUnassignTag}
                    onDeleteTag={handleDeleteTag}
                  />
                </TabsContent>

                <TabsContent value="acl">
                  <PermissionEditorPanel
                    selectedNodeId={primarySelected?.id ?? null}
                    permissions={permissions}
                    onGrantUser={handleGrantUserPermission}
                    onGrantRole={handleGrantRolePermission}
                    onRevoke={handleRevokePermission}
                  />
                </TabsContent>

                <TabsContent value="smart">
                  <SmartFoldersPanel
                    smartFolders={smartFoldersQuery.data ?? []}
                    allTags={tagsQuery.data ?? []}
                    activeSmartFolderId={activeSmartFolderId}
                    onCreate={handleCreateSmartFolder}
                    onDelete={handleDeleteSmartFolder}
                    onActivate={handleSelectSmartFolder}
                  />
                </TabsContent>
              </Tabs>
            </motion.aside>
          )}
          </AnimatePresence>
        </div>

        <footer className="flex h-8 items-center justify-between border-t border-[#1b1d21] bg-[#0d0f11] px-3 text-xs text-zinc-400">
          <span>{visibleItems.length} items</span>
          <span>{selectedIds.length} selected</span>
          <span>{clipboardState ? `${clipboardState.mode.toUpperCase()} ${clipboardState.ids.length} item(s)` : "Clipboard empty"}</span>
          <span>Shortcuts: Ctrl+C/X/V, Ctrl+D, F2, Delete, Alt+Enter, Alt+Left/Right, Ctrl+F</span>
        </footer>
      </div>

      <PropertiesDialog
        open={propertiesOpen}
        onOpenChange={setPropertiesOpen}
        metadata={propertiesMetadata}
        loading={propertiesLoading}
        pathLabel={propertiesPathLabel}
        formatBytes={formatBytes}
        formatDate={formatDate}
      />

      <Dialog open={Boolean(dialogState)} onOpenChange={(open) => !open && setDialogState(null)}>
        {dialogState ? (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {dialogState.mode === "new-folder" && "Create Folder"}
                {dialogState.mode === "new-file" && "Create File Node"}
                {dialogState.mode === "rename" && "Rename Item"}
              </DialogTitle>
              <DialogDescription>
                {dialogState.mode === "rename"
                  ? "Rename updates the explorer and desktop state immediately."
                  : "The item will be created in the current folder."}
              </DialogDescription>
            </DialogHeader>
            <Input
              className="mt-3 border-[#2a2d33] bg-[#0d0f12]"
              value={dialogState.value}
              onChange={(event) => setDialogState((state) => (state ? { ...state, value: event.target.value } : state))}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="ghost" className="h-9" onClick={() => setDialogState(null)}>
                Cancel
              </Button>
              <Button type="button" className="h-9" onClick={() => void applyDialog()}>
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(moveDialogState)} onOpenChange={(open) => !open && setMoveDialogState(null)}>
        {moveDialogState ? (
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{moveDialogState.mode === "copy" ? "Copy To" : "Move To"}</DialogTitle>
              <DialogDescription>
                {moveDialogState.mode === "copy"
                  ? "Select the TriadFS destination folder for the copied items."
                  : "Select the TriadFS destination folder for the selected items."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid min-h-[460px] grid-cols-[320px_1fr] gap-4">
              <div className="rounded-xl border border-[#24272d] bg-[#0c0e11]">
                <div className="border-b border-[#1a1d22] px-3 py-2 text-xs uppercase tracking-[0.14em] text-zinc-500">Folders</div>
                <div className="max-h-[400px] overflow-y-auto px-2 py-2">
                  {renderMoveDestinationTree(null, 0)}
                </div>
              </div>

              <div className="flex flex-col rounded-xl border border-[#24272d] bg-[#0c0e11]">
                <div className="border-b border-[#1a1d22] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Destination</p>
                  <p className="mt-2 truncate text-sm font-medium text-zinc-100">
                    {moveDialogDestinationNode?.name ?? moveDialogState.destinationId ?? "Select a folder"}
                  </p>
                  <p className="mt-1 break-all text-xs text-zinc-500">
                    {moveDialogState.destinationId ?? "Choose a folder from the left tree"}
                  </p>
                </div>

                <div className="flex-1 px-4 py-4">
                  <div className="rounded-lg border border-[#20242a] bg-[#101216] p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Selection</p>
                    <div className="mt-3 space-y-2">
                      {moveDialogState.ids.map((id) => (
                        <div key={id} className="flex items-center gap-2 rounded-md bg-[#16191e] px-3 py-2 text-sm text-zinc-200">
                          {nodeById[id]?.nodeType === "FOLDER" ? (
                            <Folder className="h-4 w-4 text-zinc-400" />
                          ) : (
                            <FileText className="h-4 w-4 text-zinc-400" />
                          )}
                          <span className="truncate">{nodeById[id]?.name ?? id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {moveDialogInvalidTarget ? (
                    <div className="mt-4 rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
                      Cannot move a folder inside itself.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" className="h-9" onClick={() => setMoveDialogState(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="h-9"
                disabled={!moveDialogState.destinationId || moveDialogInvalidTarget}
                onClick={() => {
                  if (!moveDialogState.destinationId) {
                    return;
                  }

                  if (moveDialogState.mode === "copy") {
                    void performDesktopCopy(moveDialogState.ids, moveDialogState.destinationId);
                    return;
                  }

                  void performDesktopMove(moveDialogState.ids, moveDialogState.destinationId);
                }}
              >
                {moveDialogState.mode === "copy" ? "Copy Here" : "Move Here"}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[120] space-y-2">
        <AnimatePresence>
        {notifications.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={cn(
              "min-w-[280px] rounded-md border px-3 py-2 text-sm shadow-lg",
              item.tone === "success" && "border-emerald-400/40 bg-emerald-950/70 text-emerald-100",
              item.tone === "error" && "border-red-400/40 bg-red-950/70 text-red-100",
              item.tone === "info" && "border-sky-400/40 bg-sky-950/70 text-sky-100"
            )}
          >
            {item.message}
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
