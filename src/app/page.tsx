'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, loadUserData, saveUserData, DATA_KEYS } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function Page() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const scriptLoaded = useRef(false);

  // Auth — only update state on actual session changes, not tab switches
  const sessionRef = useRef<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionRef.current = session;
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only update if session actually changed (login/logout)
      const prev = sessionRef.current;
      const changed = (!prev && session) || (prev && !session) || (prev?.user?.id !== session?.user?.id);
      if (changed) {
        sessionRef.current = session;
        setSession(session);
        if (!session) {
          setDataLoaded(false);
          scriptLoaded.current = false;
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data from Supabase when session is available
  useEffect(() => {
    if (!session) return;
    const init = async () => {
      const userData = await loadUserData(session.user.id);
      // Store data on window for the app JS to pick up
      (window as any).__supabaseData = userData;
      // Set up the Supabase save function for the app JS
      (window as any).__supabaseSave = (key: string, value: unknown) => {
        saveUserData(session.user.id, key, value);
      };
      (window as any).__supabaseUserId = session.user.id;
      setDataLoaded(true);
    };
    init();
  }, [session]);

  // Load the boorpunt app script after HTML is rendered and data is loaded
  useEffect(() => {
    if (!dataLoaded || scriptLoaded.current) return;
    // If map already exists (tab switch back), don't reload script
    if ((window as any).__boorpuntMap) {
      scriptLoaded.current = true;
      return;
    }
    scriptLoaded.current = true;

    // Remove any existing script
    const existing = document.getElementById('boorpunt-app-script');
    if (existing) existing.remove();

    // Libraries (Leaflet, jsPDF, XLSX, JSZip) are loaded via layout.tsx beforeInteractive
    // Wait for them to be available, then load the app script
    const waitForLibs = () => {
      if (typeof (window as any).L !== 'undefined' && typeof (window as any).jspdf !== 'undefined' && typeof (window as any).JSZip !== 'undefined') {
        const script = document.createElement('script');
        script.id = 'boorpunt-app-script';
        script.src = '/boorpunt-app.js?v=' + Date.now();
        script.async = false;
        document.body.appendChild(script);
      } else {
        setTimeout(waitForLibs, 50);
      }
    };
    waitForLibs();
  }, [dataLoaded]);

  if (loading) return <LoadingScreen />;
  if (!session) return <LoginPage />;
  if (!dataLoaded) return <LoadingScreen message="Data laden..." />;

  return <BoorpuntAppShell userEmail={session.user.email || ''} />;
}

// ============= LOGIN =============
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage(''); setSubmitting(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check je email voor de bevestigingslink!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Er ging iets mis');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={loginStyles.container}>
      <div style={loginStyles.logo}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>&#128205;</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Boorpunt</h1>
        <p style={{ opacity: 0.85, fontSize: '0.85rem' }}>Ground Research BV</p>
      </div>
      <div style={loginStyles.card}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', marginBottom: 20, color: '#212121' }}>
          {isRegister ? '📝 Account aanmaken' : '🔐 Inloggen'}
        </h2>
        <form onSubmit={handleSubmit}>
          <label style={loginStyles.label}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jouw@email.nl" required style={loginStyles.input} />
          <label style={{ ...loginStyles.label, marginTop: 12 }}>Wachtwoord</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={{ ...loginStyles.input, marginBottom: 16 }} />
          {error && <div style={loginStyles.error}>⚠️ {error}</div>}
          {message && <div style={loginStyles.success}>✅ {message}</div>}
          <button type="submit" disabled={submitting} style={{ ...loginStyles.button, background: submitting ? '#ccc' : '#1e3a5f', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? '⏳ Even geduld...' : (isRegister ? '📝 Registreren' : '🔐 Inloggen')}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => { setIsRegister(!isRegister); setError(''); setMessage(''); }} style={loginStyles.toggleBtn}>
            {isRegister ? '← Terug naar inloggen' : 'Nog geen account? Registreer hier'}
          </button>
        </div>
      </div>
    </div>
  );
}

const loginStyles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 40%, #1e3a5f 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif' },
  logo: { textAlign: 'center', marginBottom: 32, color: '#fff' },
  card: { background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#757575', marginBottom: 4 },
  input: { width: '100%', padding: 12, border: '2px solid #e0e0e0', borderRadius: 14, fontSize: '0.9rem', marginBottom: 12, boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  button: { width: '100%', padding: 14, color: '#fff', border: 'none', borderRadius: 14, fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit' },
  error: { background: '#ffebee', color: '#c62828', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 12, textAlign: 'center' as const },
  success: { background: '#e8f5e9', color: '#2e7d32', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 12, textAlign: 'center' as const },
  toggleBtn: { background: 'none', border: 'none', color: '#1e3a5f', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};

// ============= LOADING =============
function LoadingScreen({ message = 'Laden...' }: { message?: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 40%, #1e3a5f 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>&#128205;</div>
      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{message}</div>
    </div>
  );
}

// ============= APP SHELL =============
function BoorpuntAppShell({ userEmail }: { userEmail: string }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    (window as any).__supabaseData = null;
    (window as any).__supabaseSave = null;
    (window as any).__supabaseUserId = null;
    window.location.reload();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BOORPUNT_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: BOORPUNT_HTML }} />
      <div style={{
        position: 'fixed', top: 8, right: 8, zIndex: 9999
      }}>
        <button onClick={handleLogout} title={`Uitloggen (${userEmail})`}
          style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #1e3a5f', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 4 }}>
          🚪 Uitloggen
        </button>
      </div>
    </>
  );
}

// ============= CSS =============
const BOORPUNT_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#f5f5f5;padding:12px}
h1{background:#1e3a5f;color:#fff;padding:14px 20px;font-size:17px}
.info{padding:10px 20px;background:#f8f9fb;font-size:13px;display:flex;gap:20px;flex-wrap:wrap}
.info b{color:#1e3a5f}
#status{padding:8px 20px;background:#fff3e0;color:#e65100;font-size:12px;display:none}
#map{width:100%;height:550px;background:#ddd;position:relative}
.ctrl{padding:8px 16px;background:#e8ecf1;display:flex;gap:6px;flex-wrap:wrap}
.ctrl button{padding:5px 12px;border:1px solid #bbb;border-radius:4px;font-size:11px;cursor:pointer;background:#fff;font-weight:600}
.ctrl button.on{background:#1e3a5f;color:#fff;border-color:#1e3a5f}
.leg{padding:8px 20px;background:#fff;font-size:11px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.leg b{color:#1e3a5f;font-size:12px}
.d{width:10px;height:10px;border-radius:50%;display:inline-block;vertical-align:middle;margin-right:3px}
table{width:100%;border-collapse:collapse;font-size:11px;background:#fff}
th{background:#1e3a5f;color:#fff;padding:5px 8px;text-align:left}
td{padding:4px 8px;border-bottom:1px solid #eee}
`;

// ============= HTML =============
const BOORPUNT_HTML = `
<h1>Boorpunt &#8212; Ground Research BV</h1>
<div class="info" id="info"></div>
<div id="status"></div>
<div class="ctrl" id="ctrl">
  <button class="on" onclick="sw('sat',this)">Satelliet</button>
  <button onclick="sw('hyb',this)">Hybride</button>
  <button onclick="sw('map',this)">Kaart</button>
  <button onclick="sw('osm',this)">OSM</button>
  <button onclick="sw('pdoklucht',this)" title="PDOK Luchtfoto Actueel HR (7.5cm)">&#127465;&#127473; Luchtfoto HR</button>
  <button onclick="sw('pdoktopo',this)" title="PDOK Topografisch (BRT)">&#127757; Topo</button>
  <button onclick="sw('pdokkad',this)" title="PDOK Kadastrale kaart">&#128196; Kadaster</button>
  <button onclick="tl()">Labels</button>
  <button onclick="za()">Zoom fit</button>
  <button onclick="exportPDF()" style="background:#c62828;color:#fff;border-color:#c62828">&#128196; PDF</button>
  <button id="addBtn" onclick="toggleAdd()" style="background:#2e7d32;color:#fff;border-color:#2e7d32">+ Punt</button>
  <button onclick="undoLast()" style="background:#e65100;color:#fff;border-color:#e65100">&#8617; Ongedaan</button>
  <button onclick="clearAll()" style="background:#555;color:#fff;border-color:#555">&#128465; Wis alles</button>
  <button id="measureBtn" onclick="toggleMeasure()" style="background:#6a1b9a;color:#fff;border-color:#6a1b9a">&#128207; Meten</button>
  <button onclick="toggleCSV()" id="csvBtn" style="background:#0277bd;color:#fff;border-color:#0277bd">&#128194; CSV Import</button>
  <button onclick="toggleKlic()" id="klicBtn" style="background:#ff6f00;color:#fff;border-color:#ff6f00">&#9889; KLIC</button>
  <button onclick="toggleProjectPanel()" id="projectBtn" style="background:#1565c0;color:#fff;border-color:#1565c0">&#128193; Project</button>
</div>
<div style="padding:6px 16px;background:#fff;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
  <span style="font-size:12px;font-weight:600;color:#1e3a5f">&#128269;</span>
  <input id="adresInput" type="text" placeholder="Zoek adres... bijv. Kerkstraat 1 Marken" style="flex:1;min-width:200px;padding:6px 10px;font-size:13px;border:1px solid #bbb;border-radius:4px">
  <button onclick="zoekAdres()" style="padding:5px 14px;border:1px solid #1e3a5f;border-radius:4px;font-size:12px;cursor:pointer;background:#1e3a5f;color:#fff;font-weight:600">Zoek</button>
  <span id="adresResult" style="font-size:11px;color:#666"></span>
</div>
<div id="csvDrop" style="margin:0 16px;padding:18px;border:2px dashed #1e3a5f;border-radius:8px;background:#f0f4f8;text-align:center;cursor:pointer;display:none;transition:background 0.2s">
  <div style="font-size:14px;font-weight:700;color:#1e3a5f">&#128194; Sleep CSV of Excel bestand hier</div>
  <div style="font-size:11px;color:#666;margin-top:4px">CSV, XLSX of XLS &mdash; kolommen: Naam, X (RD), Y (RD), Diepte, Diameter</div>
  <div style="margin-top:8px;font-size:12px;display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap">
    <span style="color:#1e3a5f;font-weight:600">Standaard &empty; (als niet in bestand):</span>
    <input id="csvDefaultDia" type="number" value="0" min="0" style="width:60px;padding:4px 6px;font-size:13px;border:1px solid #1e3a5f;border-radius:4px;text-align:center" onclick="event.stopPropagation()">
    <span style="font-size:11px;color:#888">mm (0 = onbekend)</span>
  </div>
  <input type="file" id="csvFile" accept=".csv,.txt,.xlsx,.xls" style="display:none">
  <div id="csvStatus" style="margin-top:6px;font-size:12px;color:#2e7d32;display:none"></div>
</div>
<div id="klicDrop" style="margin:0 16px;padding:18px;border:2px dashed #ff6f00;border-radius:8px;background:#fff8e1;text-align:center;cursor:pointer;display:none;transition:background 0.2s">
  <div style="font-size:14px;font-weight:700;color:#e65100">&#9889; Sleep KLIC ZIP-bestand(en) hier</div>
  <div style="font-size:11px;color:#666;margin-top:4px">ZIP van Kadaster KLIC-levering &mdash; meerdere bestanden mogelijk</div>
  <input type="file" id="klicFile" accept=".zip" multiple style="display:none">
  <div id="klicStatus" style="margin-top:6px;font-size:12px;color:#2e7d32;display:none"></div>
</div>
<div id="klicPanel" style="display:none;padding:8px 16px;background:#fff3e0;font-size:12px">
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <b style="color:#e65100">&#9889; KLIC Lagen:</b>
    <span id="klicLagenList"></span>
    <label style="font-size:11px;margin-left:8px;white-space:nowrap">Transparantie: <input type="range" id="klicOpacity" min="10" max="100" value="70" style="width:80px;vertical-align:middle" oninput="setKlicOpacity(this.value)"></label>
    <button onclick="clearAllKlic()" style="padding:2px 8px;border:1px solid #c62828;border-radius:3px;font-size:10px;cursor:pointer;background:#fff;color:#c62828;font-weight:600;margin-left:auto">&#128465; Wis alle KLIC</button>
  </div>
</div>
<div id="addPanel" style="display:none;padding:8px 16px;background:#e8f5e9;font-size:12px">
  &#128205; Klik op de kaart om een punt te plaatsen &nbsp;|&nbsp;
  Naam: <input id="addName" value="" placeholder="bijv. A70000" style="width:80px;padding:2px 5px;font-size:12px"> &nbsp;
  Diepte: <input id="addDepth" type="number" value="200" style="width:55px;padding:2px 5px;font-size:12px">m &nbsp;
  &empty;: <input id="addDia" type="number" value="40" min="1" style="width:55px;padding:2px 5px;font-size:12px">mm
</div>
<div id="map"></div>
<div class="leg" id="legend"></div>
<table><thead><tr><th>#</th><th>Nr</th><th>X</th><th>Y</th><th>Diepte</th><th>&empty;</th></tr></thead><tbody id="tb"></tbody></table>
`;
