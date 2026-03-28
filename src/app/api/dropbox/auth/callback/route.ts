import { NextRequest, NextResponse } from 'next/server';

// OAuth callback - Dropbox redirects here with a code
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return new NextResponse(
      `<html><body><h1>Dropbox koppeling mislukt</h1><p>${error}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code) {
    return new NextResponse(
      `<html><body><h1>Geen code ontvangen</h1></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  if (!appKey || !appSecret) {
    return new NextResponse(
      `<html><body><h1>Server configuratie fout</h1><p>DROPBOX_APP_KEY/SECRET niet ingesteld</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
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
      return new NextResponse(
        `<html><body>
          <h1>Token exchange mislukt</h1>
          <pre>${errorText}</pre>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const data = await response.json();

    // Show the refresh token so it can be saved as env var
    return new NextResponse(
      `<html><body style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px;">
        <h1 style="color: green;">&#x2705; Dropbox gekoppeld!</h1>
        <p>Sla deze <strong>refresh token</strong> op als Vercel environment variable:</p>
        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 12px;">
          DROPBOX_REFRESH_TOKEN=${data.refresh_token}
        </div>
        <br>
        <p style="color: #666;">Je kunt dit venster nu sluiten. De BoorApp slaat voortaan automatisch op naar Dropbox.</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err: any) {
    return new NextResponse(
      `<html><body><h1>Fout</h1><p>${err.message}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
