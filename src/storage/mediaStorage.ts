import { Platform } from 'react-native';

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '../lib/supabase';
import type { MediaFile, MediaSection, MediaWorkspaceType } from '../types';

const MEDIA_BUCKET = 'planner-media';

interface MediaSectionRow {
  id: string;
  task_id: string;
  workspace: MediaWorkspaceType;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface MediaFileRow {
  id: string;
  task_id: string;
  section_id: string;
  workspace: MediaWorkspaceType;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number | string;
  created_at: string;
}

const createId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const apiHeaders = (hasBody = false): HeadersInit => ({
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Accept: 'application/json',
  ...(SUPABASE_PUBLISHABLE_KEY.startsWith('eyJ')
    ? { Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` }
    : {}),
  ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
});

const parseError = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return `Request failed (${response.status})`;
  try {
    const parsed = JSON.parse(text) as { message?: string; error?: string };
    return parsed.message || parsed.error || text;
  } catch {
    return text;
  }
};

async function rest<T>(
  table: string,
  query: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}${query}`,
    {
      ...init,
      headers: {
        ...apiHeaders(Boolean(init.body)),
        ...(init.headers ?? {}),
      },
    },
  );

  if (!response.ok) throw new Error(await parseError(response));
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const sectionFromRow = (row: MediaSectionRow): MediaSection => ({
  id: row.id,
  taskId: row.task_id,
  workspace: row.workspace,
  name: row.name,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const fileFromRow = (row: MediaFileRow): MediaFile => ({
  id: row.id,
  taskId: row.task_id,
  sectionId: row.section_id,
  workspace: row.workspace,
  originalName: row.original_name,
  storagePath: row.storage_path,
  mimeType: row.mime_type,
  sizeBytes: Number(row.size_bytes) || 0,
  createdAt: row.created_at,
});

export async function loadMediaWorkspace(
  taskId: string,
  workspace: MediaWorkspaceType,
): Promise<{ sections: MediaSection[]; files: MediaFile[] }> {
  const task = encodeURIComponent(taskId);
  const space = encodeURIComponent(workspace);
  const [sectionRows, fileRows] = await Promise.all([
    rest<MediaSectionRow[]>(
      'media_sections',
      `?select=*&task_id=eq.${task}&workspace=eq.${space}&order=sort_order.asc,created_at.asc`,
    ),
    rest<MediaFileRow[]>(
      'media_files',
      `?select=*&task_id=eq.${task}&workspace=eq.${space}&order=created_at.asc`,
    ),
  ]);

  return {
    sections: (sectionRows ?? []).map(sectionFromRow),
    files: (fileRows ?? []).map(fileFromRow),
  };
}

export async function createMediaSection(
  taskId: string,
  workspace: MediaWorkspaceType,
  name: string,
  sortOrder: number,
): Promise<MediaSection> {
  const now = new Date().toISOString();
  const payload = {
    id: createId(),
    task_id: taskId,
    workspace,
    name: name.trim() || 'Untitled partition',
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  };
  const rows = await rest<MediaSectionRow[]>('media_sections', '', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });
  const row = rows?.[0];
  if (!row) throw new Error('Supabase did not return the new partition.');
  return sectionFromRow(row);
}

export async function renameMediaSection(
  sectionId: string,
  name: string,
): Promise<void> {
  await rest<MediaSectionRow[]>(
    'media_sections',
    `?id=eq.${encodeURIComponent(sectionId)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        name: name.trim() || 'Untitled partition',
        updated_at: new Date().toISOString(),
      }),
    },
  );
}

const encodeStoragePath = (storagePath: string): string =>
  storagePath.split('/').map(encodeURIComponent).join('/');

export const getPublicMediaUrl = (storagePath: string): string =>
  `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/${encodeStoragePath(storagePath)}`;

async function deleteStorageObject(storagePath: string): Promise<void> {
  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${MEDIA_BUCKET}/${encodeStoragePath(storagePath)}`,
    {
      method: 'DELETE',
      headers: apiHeaders(false),
    },
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(await parseError(response));
  }
}

export async function deleteMediaFile(file: MediaFile): Promise<void> {
  await deleteStorageObject(file.storagePath);
  await rest<MediaFileRow[]>(
    'media_files',
    `?id=eq.${encodeURIComponent(file.id)}`,
    { method: 'DELETE', headers: { Prefer: 'return=representation' } },
  );
}

export async function deleteMediaSection(
  section: MediaSection,
  files: MediaFile[],
): Promise<void> {
  const sectionFiles = files.filter((file) => file.sectionId === section.id);
  for (const file of sectionFiles) {
    await deleteStorageObject(file.storagePath);
  }
  await rest<MediaSectionRow[]>(
    'media_sections',
    `?id=eq.${encodeURIComponent(section.id)}`,
    { method: 'DELETE', headers: { Prefer: 'return=representation' } },
  );
}

export async function cleanupTaskMedia(taskId: string): Promise<void> {
  const rows = await rest<MediaFileRow[]>(
    'media_files',
    `?select=*&task_id=eq.${encodeURIComponent(taskId)}`,
  );
  for (const row of rows ?? []) {
    await deleteStorageObject(row.storage_path);
  }
}

const sanitizeName = (name: string): string => {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  const cleanBase = base
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'file';
  const cleanExt = ext.replace(/[^.a-zA-Z0-9]/g, '').slice(0, 16);
  return `${cleanBase}${cleanExt}`;
};

export function pickFilesFromBrowser(): Promise<File[]> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.reject(
      new Error('Media upload is currently available in the Vercel web app.'),
    );
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '*/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener(
      'change',
      () => {
        const files = Array.from(input.files ?? []);
        input.remove();
        resolve(files);
      },
      { once: true },
    );
    input.click();
  });
}

export async function uploadMediaFile(
  taskId: string,
  workspace: MediaWorkspaceType,
  sectionId: string,
  file: File,
): Promise<MediaFile> {
  if (Platform.OS !== 'web') {
    throw new Error('Media upload is currently available in the Vercel web app.');
  }

  const id = createId();
  const safeName = sanitizeName(file.name);
  const storagePath = `${taskId}/${workspace}/${sectionId}/${id}-${safeName}`;
  const formData = new FormData();
  formData.append('', file, file.name);

  const uploadResponse = await fetch(
    `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${MEDIA_BUCKET}/${encodeStoragePath(storagePath)}`,
    {
      method: 'POST',
      headers: {
        ...apiHeaders(false),
        'x-upsert': 'false',
        'cache-control': '3600',
      },
      body: formData,
    },
  );

  if (!uploadResponse.ok) {
    throw new Error(await parseError(uploadResponse));
  }

  try {
    const rows = await rest<MediaFileRow[]>('media_files', '', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        id,
        task_id: taskId,
        section_id: sectionId,
        workspace,
        original_name: file.name,
        storage_path: storagePath,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        created_at: new Date().toISOString(),
      }),
    });
    const row = rows?.[0];
    if (!row) throw new Error('Supabase did not return the uploaded file metadata.');
    return fileFromRow(row);
  } catch (error) {
    await deleteStorageObject(storagePath).catch(() => undefined);
    throw error;
  }
}

const triggerBlobDownload = (blob: Blob, filename: string) => {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

async function fetchOriginalBlob(file: MediaFile): Promise<Blob> {
  const response = await fetch(getPublicMediaUrl(file.storagePath), {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.blob();
}

export async function downloadOriginal(file: MediaFile): Promise<void> {
  if (Platform.OS !== 'web') {
    throw new Error('Downloads are currently available in the Vercel web app.');
  }
  const blob = await fetchOriginalBlob(file);
  triggerBlobDownload(blob, file.originalName);
}

export type ImageConversion = 'png' | 'jpeg' | 'webp';

const conversionMime: Record<ImageConversion, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function canConvertImage(file: MediaFile): boolean {
  return file.mimeType.startsWith('image/') && file.mimeType !== 'image/gif';
}

export async function downloadConvertedImage(
  file: MediaFile,
  format: ImageConversion,
): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error('Image conversion is currently available in the Vercel web app.');
  }
  if (!canConvertImage(file)) {
    throw new Error('This file type cannot be converted by the browser.');
  }

  const sourceBlob = await fetchOriginalBlob(file);
  const objectUrl = URL.createObjectURL(sourceBlob);

  try {
    const image = document.createElement('img');
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser does not support image conversion.');
    context.drawImage(image, 0, 0);

    const mime = conversionMime[format];
    const converted = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Conversion failed.'))),
        mime,
        1,
      );
    });

    const baseName = file.originalName.replace(/\.[^.]+$/, '') || 'converted-image';
    const extension = format === 'jpeg' ? 'jpg' : format;
    triggerBlobDownload(converted, `${baseName}.${extension}`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}
