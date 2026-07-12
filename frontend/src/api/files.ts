import { http } from "./http";
import type { FileNode, FileTag, FileVersion, PermissionEntry, SearchResult, SmartFolder } from "@/types";

interface Envelope<T> {
  data: T;
}

export async function fetchFileTree(): Promise<FileNode[]> {
  const response = await http.get<Envelope<FileNode[]>>("/files/tree");
  return response.data.data;
}

export async function createFolder(parentId: string | null, name: string) {
  const response = await http.post<Envelope<unknown>>("/files/folders", { parentId, name });
  return response.data.data;
}

export async function initUploadNode(parentId: string | null, fileName: string) {
  const response = await http.post<Envelope<unknown>>("/files/init-upload", { parentId, fileName });
  return response.data.data;
}

export async function softDeleteNode(fileId: string) {
  const response = await http.delete<Envelope<{ deleted: boolean; fileId: string }>>(`/files/${fileId}`);
  return response.data.data;
}

export async function hardDeleteNode(fileId: string) {
  const response = await http.delete<Envelope<{ hardDeleted: boolean; fileId: string }>>(`/files/${fileId}/hard`);
  return response.data.data;
}

export async function restoreNode(fileId: string) {
  const response = await http.post<Envelope<{ restored: boolean; fileId: string }>>(`/files/${fileId}/restore`);
  return response.data.data;
}

export async function renameNode(fileId: string, name: string) {
  const response = await http.patch<Envelope<FileNode>>(`/files/${fileId}/rename`, { name });
  return response.data.data;
}

export async function moveNode(fileId: string, parentId: string | null) {
  const response = await http.patch<Envelope<FileNode>>(`/files/${fileId}/move`, { parentId });
  return response.data.data;
}

export async function fetchTrash(): Promise<FileNode[]> {
  const response = await http.get<Envelope<FileNode[]>>("/files/trash");
  return response.data.data;
}

export async function searchNodes(query: string): Promise<SearchResult[]> {
  const response = await http.get<Envelope<SearchResult[]>>("/search", { params: { query } });
  return response.data.data;
}

export async function fetchFileVersions(fileId: string): Promise<FileVersion[]> {
  const response = await http.get<Envelope<FileVersion[]>>(`/files/${fileId}/versions`);
  return response.data.data;
}

export async function downloadFileVersion(fileId: string, versionId: string) {
  const response = await http.get<Envelope<{ payloadBase64: string; bytes: number }>>(`/files/${fileId}/download`, {
    params: { version: versionId }
  });
  return response.data.data;
}

export async function fetchTags(): Promise<FileTag[]> {
  const response = await http.get<Envelope<FileTag[]>>("/tags");
  return response.data.data;
}

export async function createTag(name: string, colorHex: string) {
  const response = await http.post<Envelope<FileTag>>("/tags", { name, colorHex });
  return response.data.data;
}

export async function updateTag(tagId: string, payload: { name?: string; colorHex?: string }) {
  const response = await http.put<Envelope<FileTag>>(`/tags/${tagId}`, payload);
  return response.data.data;
}

export async function deleteTag(tagId: string) {
  const response = await http.delete<Envelope<{ deleted: boolean; tagId: string }>>(`/tags/${tagId}`);
  return response.data.data;
}

export async function fetchNodeTags(fileId: string): Promise<FileTag[]> {
  const response = await http.get<Envelope<FileTag[]>>(`/files/${fileId}/tags`);
  return response.data.data;
}

export async function assignTagToNode(fileId: string, tagId: string) {
  const response = await http.post<Envelope<{ assigned: boolean }>>(`/files/${fileId}/tags/${tagId}`);
  return response.data.data;
}

export async function unassignTagFromNode(fileId: string, tagId: string) {
  const response = await http.delete<Envelope<{ unassigned: boolean }>>(`/files/${fileId}/tags/${tagId}`);
  return response.data.data;
}

export interface SmartFolderPayload {
  name: string;
  nameContains?: string;
  nodeType?: "FILE" | "FOLDER" | null;
  extensions: string[];
  requiredTagIds: string[];
  updatedWithinDays?: number | null;
  includeDeleted: boolean;
}

export async function fetchSmartFolders(): Promise<SmartFolder[]> {
  const response = await http.get<Envelope<SmartFolder[]>>("/smart-folders");
  return response.data.data;
}

export async function createSmartFolder(payload: SmartFolderPayload) {
  const response = await http.post<Envelope<SmartFolder>>("/smart-folders", payload);
  return response.data.data;
}

export async function updateSmartFolder(smartFolderId: string, payload: SmartFolderPayload) {
  const response = await http.put<Envelope<SmartFolder>>(`/smart-folders/${smartFolderId}`, payload);
  return response.data.data;
}

export async function deleteSmartFolder(smartFolderId: string) {
  const response = await http.delete<Envelope<{ deleted: boolean; smartFolderId: string }>>(`/smart-folders/${smartFolderId}`);
  return response.data.data;
}

export async function resolveSmartFolder(smartFolderId: string): Promise<FileNode[]> {
  const response = await http.get<Envelope<FileNode[]>>(`/smart-folders/${smartFolderId}/resolve`);
  return response.data.data;
}

export async function fetchPermissions(fileId: string): Promise<PermissionEntry[]> {
  const response = await http.get<Envelope<PermissionEntry[]>>(`/files/${fileId}/permissions`);
  return response.data.data;
}

export async function grantUserPermission(fileId: string, granteeUserId: string, permissionType: "READ" | "WRITE" | "ADMIN") {
  const response = await http.post<Envelope<PermissionEntry>>(`/files/${fileId}/permissions/user`, {
    granteeUserId,
    permissionType
  });
  return response.data.data;
}

export async function grantRolePermission(fileId: string, roleName: string, permissionType: "READ" | "WRITE" | "ADMIN") {
  const response = await http.post<Envelope<PermissionEntry>>(`/files/${fileId}/permissions/role`, {
    roleName,
    permissionType
  });
  return response.data.data;
}

export async function revokePermission(fileId: string, permissionId: string) {
  const response = await http.delete<Envelope<{ revoked: boolean; permissionId: string }>>(`/files/${fileId}/permissions/${permissionId}`);
  return response.data.data;
}
