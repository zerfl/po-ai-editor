const API_BASE = '/api';

import type { PoFile } from '@po-ai-editor/shared';
import type { TranslateRequest, TranslateResponse } from '@po-ai-editor/shared';
import type { ExportRequest } from '@po-ai-editor/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

async function readApiError(response: Response): Promise<ApiError> {
  const raw = await response.text();

  try {
    const payload: unknown = JSON.parse(raw);
    if (typeof payload === 'object' && payload !== null) {
      const message =
        'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : `API error ${String(response.status)}`;
      const code = 'code' in payload && typeof payload.code === 'string' ? payload.code : undefined;
      const details = 'details' in payload ? payload.details : undefined;
      return new ApiError(message, response.status, { code, details });
    }
  } catch {
    // Fall back to the raw response body below.
  }

  return new ApiError(raw || `API error ${String(response.status)}`, response.status);
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw await readApiError(res);
  }
  return res.json() as Promise<T>;
}

export async function healthCheck(): Promise<{ ok: boolean }> {
  return fetchJson('/health');
}

export async function getModels(): Promise<{
  defaultModel: string;
  models: Array<{ id: string; label: string }>;
}> {
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
  if (!res.ok) throw await readApiError(res);
  return res.blob();
}

export async function exportMo(request: ExportRequest): Promise<Blob> {
  const res = await fetch(`${API_BASE}/export/mo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw await readApiError(res);
  return res.blob();
}
