import { NextRequest, NextResponse } from 'next/server';

// Dropbox file upload API route
// Receives: base64 file content + path, uploads to Dropbox
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, fileContent, fileName } = body;

    if (!filePath || !fileContent) {
      return NextResponse.json(
        { error: 'filePath en fileContent zijn verplicht' },
        { status: 400 }
      );
    }

    // Get access token - try refresh first, fall back to stored token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Geen Dropbox access token geconfigureerd' },
        { status: 500 }
      );
    }

    // Decode base64 content to buffer
    const fileBuffer = Buffer.from(fileContent, 'base64');

    // Upload to Dropbox
    const dropboxPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

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

      // If token expired, try refresh
      if (uploadResponse.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Retry with new token
          const retryResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${newToken}`,
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

          if (retryResponse.ok) {
            const result = await retryResponse.json();
            return NextResponse.json({
              success: true,
              path: result.path_display,
              size: result.size,
              message: `Opgeslagen in Dropbox: ${result.path_display}`,
            });
          }
        }

        return NextResponse.json(
          { error: 'Dropbox token verlopen en refresh mislukt' },
          { status: 401 }
        );
      }

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
    const { folderPath } = body;

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

    const dropboxPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;

    const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: dropboxPath,
        autorename: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      // Folder already exists is not an error
      if (errorData.includes('path/conflict/folder')) {
        return NextResponse.json({
          success: true,
          path: dropboxPath,
          message: 'Map bestaat al',
        });
      }
      return NextResponse.json(
        { error: `Map aanmaken mislukt: ${errorData}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      path: result.metadata.path_display,
      message: `Map aangemaakt: ${result.metadata.path_display}`,
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
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string | null> {
  // If we have a cached token that's still valid, use it
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  // Try to refresh using refresh token
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  if (refreshToken) {
    const newToken = await refreshAccessToken();
    if (newToken) return newToken;
  }

  // Fall back to static access token
  return process.env.DROPBOX_ACCESS_TOKEN || null;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  if (!refreshToken || !appKey || !appSecret) {
    return null;
  }

  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
    // Set expiry 5 minutes before actual expiry for safety
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return cachedAccessToken;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}
