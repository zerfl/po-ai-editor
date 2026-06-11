const API_BASE = '/api';

import type { PoFile } from '@po-ai-editor/shared';
import type { TranslateRequest, TranslateResponse } from '@po-ai-editor/shared';
import type { ExportRequest } from '@po-ai-editor/shared';

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }
  return res.json() as Promise<T>;
}

export async function healthCheck(): Promise<{ ok: boolean }> {
  return fetchJson('/health');
}

export async function getModels(): Promise<{ defaultModel: string; models: Array<{ id: string; label: string }> }> {
  return fetchJson('/models');
}

export async function parseFile(content: string, filename: string): Promise<PoFile> {
  return fetchJson('/parse', {
    method: 'POST',
    body: JSON.stringify({ content, filename }),
  });
}

export async function translate(request: TranslateRequest): Promise<TranslateResponse> {
  return fetchJson('/translate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function exportPo(request: ExportRequest): Promise<Blob> {
  const res = await fetch(`${API_BASE}/export/po`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}

export async function exportMo(request: ExportRequest): Promise<Blob> {
  const res = await fetch(`${API_BASE}/export/mo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}
