export type StrategyType =
  | "WHOLE_FILE"
  | "STREAMING"
  | "SEQUENTIAL_CHUNK"
  | "PARALLEL_CHUNK"
  | "COMPRESSED"
  | "ENCRYPTED";

export interface BenchmarkSummary {
  runId: string;
  scenarioName: string;
  strategyType: StrategyType;
  transferTimeMs: number;
  throughputMbps: number;
  peakMemoryMb: number;
  cpuUsagePercent: number;
  bytesTransferred: number;
  compressionRatio: number;
  dedupSavingsPercent: number;
  costEstimateUsd: number;
  startedAt: string;
  finishedAt: string;
}

export interface FileNode {
  id: string;
  parentId?: string;
  nodeType: "FILE" | "FOLDER";
  name: string;
  path: string;
  updatedAt?: string;
  deleted?: boolean;
  children: FileNode[];
}

export interface SearchResult {
  id: string;
  path: string;
  name: string;
  nodeType: "FILE" | "FOLDER";
}

export interface FileVersion {
  id: string;
  versionNo: number;
  totalSizeBytes: number;
  contentHash: string;
  compressionAlgorithm?: string | null;
  encryptionAlgorithm?: string | null;
  createdAt: string;
}

export interface FileTag {
  id: string;
  name: string;
  colorHex: string;
  usageCount: number;
}

export interface SmartFolder {
  id: string;
  name: string;
  nameContains?: string | null;
  nodeType?: "FILE" | "FOLDER" | null;
  extensions: string[];
  requiredTagIds: string[];
  updatedWithinDays?: number | null;
  includeDeleted: boolean;
}

export interface PermissionEntry {
  id: string;
  permissionType: "READ" | "WRITE" | "ADMIN";
  granteeUserId?: string | null;
  granteeUserEmail?: string | null;
  granteeUserDisplayName?: string | null;
  granteeRoleId?: string | null;
  granteeRoleName?: string | null;
  createdAt: string;
}

export interface DesktopCapabilities {
  canOpenInTerminal: boolean;
  canOpenWithCode: boolean;
  canCreateArchive: boolean;
  canCreateShortcut?: boolean;
  canPickDirectory?: boolean;
}

export interface DesktopSpecialPaths {
  home: string | null;
  desktop: string | null;
  documents: string | null;
  downloads: string | null;
}

export interface DesktopPathMetadata {
  name: string;
  path: string;
  parentPath: string;
  kind: "FILE" | "FOLDER";
  extension: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  accessedAt: string;
  hidden: boolean;
  writable: boolean;
  symlink: boolean;
  sha256: string | null;
  folderCount: number;
  fileCount: number;
  itemCount: number;
}

export interface DesktopPathPreview {
  kind: "image" | "text" | "audio" | "video" | "pdf" | "none";
  fileUrl: string | null;
  textContent: string | null;
  truncated: boolean;
}

export interface DesktopTrashEntry {
  trashedPath: string;
  originalPath: string;
  name: string;
  nodeType: "FILE" | "FOLDER";
  sizeBytes: number;
  updatedAt: string;
  deletedAt: string;
}
