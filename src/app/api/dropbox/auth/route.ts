import { NextRequest, NextResponse } from 'next/server';

// Step 1: Generate authorization URL
// GET /api/dropbox/auth → redirects to Dropbox OAuth
export async function GET(request: NextRequest) {
  const appKey = process.env.DROPBOX_APP_KEY;

  if (!appKey) {
    return NextResponse.json(
      { error: 'DROPBOX_APP_KEY niet geconfigureerd' },
      { status: 500 }
    );
  }

  const redirectUri = `${request.nextUrl.origin}/api/dropbox/auth/callback`;

  const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
    `client_id=${appKey}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&token_access_type=offline`; // This gives us a refresh token!

  return NextResponse.json({
    authUrl,
    message: 'Open deze URL in je browser om Dropbox te koppelen',
  });
}

// Step 2: Exchange authorization code for tokens
// POST /api/dropbox/auth { code: "..." }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code } = body;

  if (!code) {
    return NextResponse.json(
      { error: 'Authorization code is verplicht' },
      { status: 400 }
    );
  }

  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  if (!appKey || !appSecret) {
    return NextResponse.json(
      { error: 'DROPBOX_APP_KEY en DROPBOX_APP_SECRET moeten geconfigureerd zijn' },
      { status: 500 }
    );
  }

  const redirectUri = `${request.nextUrl.origin}/api/dropbox/auth/callback`;

  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: appKey,
        client_secret: appSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Token exchange mislukt: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      message: 'Sla de refresh_token op als DROPBOX_REFRESH_TOKEN environment variable in Vercel!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Onbekende fout' },
      { status: 500 }
    );
  }
}
