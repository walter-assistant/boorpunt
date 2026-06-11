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

function normalizePath(path: string) {
  const clean = String(path || '').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
  return clean.startsWith('/') ? (clean || '/') : `/${clean}`;
}

async function createFolder(accessToken: string, folderPath: string) {
  const dropboxPath = normalizePath(folderPath);
  if (!dropboxPath || dropboxPath === '/') return { path: dropboxPath, existed: true };

  const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: dropboxPath, autorename: false }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    if (/conflict|already_exists|path\/conflict\/folder/i.test(errorData)) {
      return { path: dropboxPath, existed: true };
    }
    throw new Error(`Map aanmaken mislukt: ${errorData}`);
  }

  const result = await response.json();
  return { path: result.metadata?.path_display || dropboxPath, existed: false };
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

async function ensureStandardProjectFolders(accessToken: string, projectRoot: string) {
  await ensureFolder(accessToken, projectRoot);
  for (const folder of STANDARD_PROJECT_FOLDERS) {
    await createFolder(accessToken, `${normalizePath(projectRoot)}/${folder}`);
  }
}

// Dropbox file upload API route
// Receives: base64 file content + path, uploads to Dropbox
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, fileContent, projectRoot } = body;

    if (!filePath || !fileContent) {
      return NextResponse.json(
        { error: 'filePath en fileContent zijn verplicht' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Geen Dropbox access token geconfigureerd' },
        { status: 500 }
      );
    }

    if (projectRoot) await ensureStandardProjectFolders(accessToken, projectRoot);

    const dropboxPath = normalizePath(filePath);
    const parentPath = dropboxPath.substring(0, dropboxPath.lastIndexOf('/'));
    if (parentPath) await ensureFolder(accessToken, parentPath);

    const fileBuffer = Buffer.from(fileContent, 'base64');
    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: dropboxPath,
          mode: 'overwrite',
          autorename: false,
          mute: false,
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('Dropbox upload error:', errorData);
      return NextResponse.json(
        { error: `Dropbox upload mislukt: ${errorData}` },
        { status: uploadResponse.status }
      );
    }

    const result = await uploadResponse.json();
    return NextResponse.json({
      success: true,
      path: result.path_display,
      size: result.size,
      message: `Opgeslagen in Dropbox: ${result.path_display}`,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Onbekende fout bij uploaden' },
      { status: 500 }
    );
  }
}

// Create folder in Dropbox (auto-creates parent folders)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { folderPath, createProjectStructure } = body;

    if (!folderPath) {
      return NextResponse.json(
        { error: 'folderPath is verplicht' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Geen Dropbox access token geconfigureerd' },
        { status: 500 }
      );
    }

    const result = await ensureFolder(accessToken, folderPath);
    if (createProjectStructure) await ensureStandardProjectFolders(accessToken, folderPath);

    return NextResponse.json({
      success: true,
      path: result.path,
      message: createProjectStructure ? 'Projectmapstructuur klaar' : `Map klaar: ${result.path}`,
      folders: createProjectStructure ? STANDARD_PROJECT_FOLDERS : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Onbekende fout' },
      { status: 500 }
    );
  }
}

// --- Token management ---
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
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: appKey,
        client_secret: appSecret,
      }),
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
