import { NextRequest, NextResponse } from 'next/server';

const STANDARD_PROJECT_FOLDERS = [
  'Bodemonderzoek',
  'Bodemopbouw dino',
  'Boorprofiel',
  'dag rapport',
  'EED',
  "Foto's",
  'ITge',
  'Klic',
  'Mail',
  'Offerte',
  'OLO',
  'Ontwerp',
  'Oplever rapportage',
  'Plan van aanpak',
  'SPF verklaring',
  'Tekening',
  'Werkbeschrijving 2100',
  'WKO Tool'
];

const PROJECT_BASE = '/werkmap/Offerte map';

function normalizePath(path: string) {
  const clean = String(path || '').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
  return clean.startsWith('/') ? (clean || '/') : `/${clean}`;
}

function joinPath(...parts: string[]) {
  return normalizePath(parts.join('/'));
}

function normalizeName(value: string) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function projectKey(name: string) {
  return normalizeName(String(name || '').split(/\s+-\s+/)[0] || name);
}

async function dropboxApi(accessToken: string, endpoint: string, body: unknown) {
  const response = await fetch(`https://api.dropboxapi.com/2${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error: any = new Error(data?.error_summary || text || `Dropbox ${response.status}`);
    error.status = response.status;
    error.body = data;
    throw error;
  }
  return data;
}

async function getMetadata(accessToken: string, path: string) {
  try {
    return await dropboxApi(accessToken, '/files/get_metadata', { path: normalizePath(path) });
  } catch (error: any) {
    if (/not_found/i.test(error.message || '')) return null;
    throw error;
  }
}

async function listFolders(accessToken: string, path: string) {
  try {
    const data = await dropboxApi(accessToken, '/files/list_folder', { path: normalizePath(path), recursive: false, include_deleted: false });
    return (data.entries || []).filter((entry: any) => entry['.tag'] === 'folder');
  } catch (error: any) {
    if (/not_found/i.test(error.message || '')) return [];
    throw error;
  }
}

async function createFolder(accessToken: string, folderPath: string) {
  const dropboxPath = normalizePath(folderPath);
  if (!dropboxPath || dropboxPath === '/') return { path: dropboxPath, existed: true };
  try {
    const result = await dropboxApi(accessToken, '/files/create_folder_v2', { path: dropboxPath, autorename: false });
    return { path: result.metadata?.path_display || dropboxPath, existed: false };
  } catch (error: any) {
    if (/conflict|already_exists|path\/conflict\/folder/i.test(error.message || JSON.stringify(error.body || {}))) {
      return { path: dropboxPath, existed: true };
    }
    throw new Error(`Map aanmaken mislukt: ${error.message || error}`);
  }
}

async function ensureFolder(accessToken: string, folderPath: string) {
  const segments = normalizePath(folderPath).split('/').filter(Boolean);
  let current = '';
  let last = { path: '/', existed: true };
  for (const segment of segments) {
    current += `/${segment}`;
    last = await createFolder(accessToken, current);
  }
  return last;
}

function findMatchingFolder(folders: any[], wantedName: string, projectMode = false) {
  const wantedNorm = normalizeName(wantedName);
  const wantedKey = projectKey(wantedName);
  return folders.find((folder: any) => {
    const nameNorm = normalizeName(folder.name);
    if (nameNorm === wantedNorm) return true;
    if (!projectMode) return nameNorm.startsWith(`${wantedNorm} `) || wantedNorm.startsWith(`${nameNorm} `);
    const key = projectKey(folder.name);
    return key === wantedKey || key.startsWith(`${wantedKey} `) || wantedKey.startsWith(`${key} `);
  });
}

async function resolveProjectRoot(accessToken: string, requestedRoot: string) {
  const parts = normalizePath(requestedRoot).split('/').filter(Boolean);
  const baseParts = PROJECT_BASE.split('/').filter(Boolean);
  const isProjectPath = parts.length >= baseParts.length + 2 && baseParts.every((part, i) => normalizeName(part) === normalizeName(parts[i]));
  if (!isProjectPath) {
    await ensureFolder(accessToken, requestedRoot);
    return normalizePath(requestedRoot);
  }

  await ensureFolder(accessToken, PROJECT_BASE);
  const customerName = parts[baseParts.length];
  const projectName = parts[baseParts.length + 1];

  const customerFolders = await listFolders(accessToken, PROJECT_BASE);
  const customerMatch = findMatchingFolder(customerFolders, customerName, false);
  const customerPath = customerMatch?.path_display || customerMatch?.path_lower || joinPath(PROJECT_BASE, customerName);
  if (!customerMatch) await ensureFolder(accessToken, customerPath);

  const projectFolders = await listFolders(accessToken, customerPath);
  const projectMatch = findMatchingFolder(projectFolders, projectName, true);
  const projectPath = projectMatch?.path_display || projectMatch?.path_lower || joinPath(customerPath, projectName);
  if (!projectMatch) await ensureFolder(accessToken, projectPath);
  return normalizePath(projectPath);
}

async function ensureStandardProjectFolders(accessToken: string, projectRoot: string) {
  const resolvedRoot = await resolveProjectRoot(accessToken, projectRoot);
  for (const folder of STANDARD_PROJECT_FOLDERS) {
    await createFolder(accessToken, joinPath(resolvedRoot, folder));
  }
  return resolvedRoot;
}

async function getVersionedFilePath(accessToken: string, requestedPath: string) {
  const path = normalizePath(requestedPath);
  if (!(await getMetadata(accessToken, path))) return path;
  const slash = path.lastIndexOf('/');
  const dir = slash >= 0 ? path.slice(0, slash) : '';
  const filename = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = filename.lastIndexOf('.');
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';
  for (let version = 2; version < 100; version++) {
    const candidate = joinPath(dir, `${base} - v${version}${ext}`);
    if (!(await getMetadata(accessToken, candidate))) return candidate;
  }
  return joinPath(dir, `${base} - v${Date.now()}${ext}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, fileContent, projectRoot } = body;

    if (!filePath || !fileContent) {
      return NextResponse.json({ error: 'filePath en fileContent zijn verplicht' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    if (!accessToken) return NextResponse.json({ error: 'Geen Dropbox access token geconfigureerd' }, { status: 500 });

    const requestedProjectRoot = projectRoot ? normalizePath(projectRoot) : null;
    const resolvedProjectRoot = requestedProjectRoot ? await ensureStandardProjectFolders(accessToken, requestedProjectRoot) : null;

    let dropboxPath = normalizePath(filePath);
    if (requestedProjectRoot && resolvedProjectRoot && dropboxPath.startsWith(requestedProjectRoot + '/')) {
      dropboxPath = joinPath(resolvedProjectRoot, dropboxPath.slice(requestedProjectRoot.length));
    }

    const parentPath = dropboxPath.substring(0, dropboxPath.lastIndexOf('/'));
    if (parentPath) await ensureFolder(accessToken, parentPath);
    const finalPath = await getVersionedFilePath(accessToken, dropboxPath);

    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: finalPath, mode: 'add', autorename: false, mute: false, strict_conflict: true }),
        'Content-Type': 'application/octet-stream',
      },
      body: Buffer.from(fileContent, 'base64'),
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('Dropbox upload error:', errorData);
      return NextResponse.json({ error: `Dropbox upload mislukt: ${errorData}` }, { status: uploadResponse.status });
    }

    const result = await uploadResponse.json();
    return NextResponse.json({
      success: true,
      path: result.path_display,
      size: result.size,
      versioned: finalPath !== dropboxPath,
      message: `Opgeslagen in Dropbox: ${result.path_display}`,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Onbekende fout bij uploaden' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { folderPath, createProjectStructure } = body;
    if (!folderPath) return NextResponse.json({ error: 'folderPath is verplicht' }, { status: 400 });

    const accessToken = await getAccessToken();
    if (!accessToken) return NextResponse.json({ error: 'Geen Dropbox access token geconfigureerd' }, { status: 500 });

    const path = createProjectStructure ? await ensureStandardProjectFolders(accessToken, folderPath) : (await ensureFolder(accessToken, folderPath)).path;
    return NextResponse.json({
      success: true,
      path,
      message: createProjectStructure ? 'Projectmapstructuur klaar' : `Map klaar: ${path}`,
      folders: createProjectStructure ? STANDARD_PROJECT_FOLDERS : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Onbekende fout' }, { status: 500 });
  }
}

let cachedAccessToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken && Date.now() < tokenExpiry) return cachedAccessToken;
  if (process.env.DROPBOX_REFRESH_TOKEN) {
    const newToken = await refreshAccessToken();
    if (newToken) return newToken;
  }
  return process.env.DROPBOX_ACCESS_TOKEN?.trim() || null;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN?.trim();
  const appKey = process.env.DROPBOX_APP_KEY?.trim();
  const appSecret = process.env.DROPBOX_APP_SECRET?.trim();
  if (!refreshToken || !appKey || !appSecret) return null;

  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: appKey, client_secret: appSecret }),
    });
    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }
    const data = await response.json();
    cachedAccessToken = data.access_token;
    tokenExpiry = Date.now() + ((data.expires_in || 14400) - 300) * 1000;
    return cachedAccessToken;
  } catch (error) {
    console.error('Refresh token error:', error);
    return null;
  }
}
