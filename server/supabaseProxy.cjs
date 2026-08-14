const fs = require('fs');
const path = require('path');
const https = require('https');
const dns = require('dns');
const { execFile } = require('child_process');

// Prefer IPv4 on Windows because some local Node/Undici setups resolve an
// unreachable IPv6 route even though curl/PowerShell can reach Supabase.
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

const FALLBACK_SUPABASE_URL = 'https://ubypzxuykhbonquvucxl.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_fBUzuVQ6hAiBEnt_FU4b_g_jVo6yg3m';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function getSupabaseConfig() {
  loadEnvFile();
  const url =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    FALLBACK_SUPABASE_URL;
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  return { url: url.replace(/\/$/, ''), key };
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length > 0) {
    return JSON.parse(req.body);
  }

  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function httpsRequest(urlString, { method, headers, body }) {
  return new Promise((resolve, reject) => {
    const target = new URL(urlString);
    const requestHeaders = { ...headers };
    if (body != null) {
      requestHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method,
        headers: requestHeaders,
        family: 4,
        timeout: 15000,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode || 500, text });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error('Supabase HTTPS request timed out'));
    });
    req.on('error', reject);
    if (body != null) req.write(body);
    req.end();
  });
}

function curlRequest(urlString, { method, headers, body }) {
  return new Promise((resolve, reject) => {
    const args = [
      '--silent',
      '--show-error',
      '--location',
      '--request',
      method,
      urlString,
    ];

    for (const [name, value] of Object.entries(headers || {})) {
      args.push('--header', `${name}: ${value}`);
    }
    if (body != null) {
      args.push('--data-raw', body);
    }
    args.push('--write-out', '\n__PLANNER_HTTP_STATUS__:%{http_code}');

    execFile('curl.exe', args, { windowsHide: true, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        const message = stderr?.trim() || error.message || 'curl.exe failed';
        reject(new Error(message));
        return;
      }

      const marker = '\n__PLANNER_HTTP_STATUS__:';
      const idx = stdout.lastIndexOf(marker);
      if (idx < 0) {
        reject(new Error(stderr?.trim() || 'Could not read Supabase HTTP status'));
        return;
      }

      const text = stdout.slice(0, idx);
      const status = Number(stdout.slice(idx + marker.length).trim()) || 500;
      resolve({ status, text });
    });
  });
}

async function requestSupabase(urlString, options) {
  try {
    return await httpsRequest(urlString, options);
  } catch (httpsError) {
    // On the user's Windows machine curl.exe is known to reach Supabase even
    // when Node networking fails. Use it only as a local fallback.
    if (process.platform === 'win32') {
      try {
        return await curlRequest(urlString, options);
      } catch (curlError) {
        const error = new Error(
          `Supabase network error. Node HTTPS: ${httpsError.message}. curl.exe: ${curlError.message}`,
        );
        error.cause = httpsError;
        throw error;
      }
    }

    const error = new Error(`Supabase network error: ${httpsError.message}`);
    error.cause = httpsError;
    throw error;
  }
}

async function proxyTasksRequest({ method, id, body }) {
  const { url, key } = getSupabaseConfig();
  const base = `${url}/rest/v1/content_tasks`;
  const headers = {
    apikey: key,
    Accept: 'application/json',
  };

  let target = base;
  let requestBody;

  if (method === 'GET') {
    target += '?select=id,date,type,title,notes,status,created_at,updated_at&order=date.asc,created_at.asc';
  } else if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    headers.Prefer = 'return=representation';
    requestBody = JSON.stringify(body || {});
  } else if (method === 'PATCH') {
    if (!id) throw Object.assign(new Error('Missing task id'), { status: 400 });
    target += `?id=eq.${encodeURIComponent(id)}`;
    headers['Content-Type'] = 'application/json';
    headers.Prefer = 'return=representation';
    requestBody = JSON.stringify(body || {});
  } else if (method === 'DELETE') {
    if (!id) throw Object.assign(new Error('Missing task id'), { status: 400 });
    target += `?id=eq.${encodeURIComponent(id)}`;
    headers.Prefer = 'return=representation';
  } else {
    throw Object.assign(new Error(`Unsupported method: ${method}`), { status: 405 });
  }

  const response = await requestSupabase(target, {
    method,
    headers,
    body: requestBody,
  });

  if (response.status < 200 || response.status >= 300) {
    const error = new Error(
      response.text || `Supabase request failed (${response.status})`,
    );
    error.status = response.status;
    throw error;
  }

  if (!response.text) return null;
  try {
    return JSON.parse(response.text);
  } catch {
    return response.text;
  }
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function handleTasks(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const requestUrl = new URL(req.url, 'http://localhost');
    const id = requestUrl.searchParams.get('id');
    const body = ['POST', 'PATCH'].includes(req.method)
      ? await readJsonBody(req)
      : undefined;

    const data = await proxyTasksRequest({
      method: req.method,
      id,
      body,
    });

    res.statusCode = req.method === 'POST' ? 201 : 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data ?? null));
  } catch (error) {
    const status = Number(error.status) || 500;
    console.error('[planner-api]', error);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown server error',
      }),
    );
  }
}

module.exports = {
  getSupabaseConfig,
  handleTasks,
  proxyTasksRequest,
  requestSupabase,
};
