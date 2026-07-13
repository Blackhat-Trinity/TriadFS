import { http } from "./http";

interface Envelope<T> {
  data: T;
}

export async function getStrategySettings() {
  const response = await http.get<Envelope<Record<string, unknown>>>("/settings/strategies");
  return response.data.data;
}

export async function updateStrategySettings(payload: {
  defaultChunkSize: number;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
}) {
  const response = await http.put<Envelope<Record<string, unknown>>>("/settings/strategies/default", payload);
  return response.data.data;
}

export async function getSecuritySettings() {
  const response = await http.get<Envelope<Record<string, unknown>>>("/settings/security");
  return response.data.data;
}

export async function updateSecuritySettings(payload: {
  checksumValidation: boolean;
  aesOptional: boolean;
}) {
  const response = await http.put<Envelope<Record<string, unknown>>>("/settings/security", payload);
  return response.data.data;
}