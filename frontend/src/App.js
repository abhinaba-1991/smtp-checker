import React, { useState, useCallback, useRef } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    warning: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    server: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
    globe: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    zap: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    list: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    copy: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  };
  return icons[name] || null;
};

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, color }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colorMap = {
    green: '#00e676', blue: '#40c4ff', yellow: '#ffea00',
    orange: '#ff9100', red: '#ff1744'
  };
  const c = colorMap[color] || '#00e676';
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="score-ring">
      <circle cx="55" cy="55" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8"/>
      <circle cx="55" cy="55" r={radius} fill="none" stroke={c} strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 55 55)"
        style={{ filter: `drop-shadow(0 0 8px ${c})`, transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="55" y="50" textAnchor="middle" fill={c} fontSize="22" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{score}</text>
      <text x="55" y="68" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'JetBrains Mono', monospace">SCORE</text>
    </svg>
  );
}

// ─── Check Row ────────────────────────────────────────────────────────────────
function CheckRow({ label, value, detail, warn }) {
  const status = value === true ? 'pass' : value === false ? 'fail' : 'warn';
  return (
    <div className={`check-row check-${status}`}>
      <span className="check-icon">
        {status === 'pass' ? <Icon name="check" size={13}/> : status === 'fail' ? <Icon name="x" size={13}/> : <Icon name="warning" size={13}/>}
      </span>
      <span className="check-label">{label}</span>
      {detail && <span className="check-detail">{detail}</span>}
    </div>
  );
}

// ─── Port Badge ───────────────────────────────────────────────────────────────
function PortBadge({ port, connected, banner }) {
  return (
    <div className={`port-badge ${connected ? 'port-open' : 'port-closed'}`}>
      <span className="port-dot"/>
      <span className="port-num">:{port}</span>
      <span className="port-status">{connected ? 'OPEN' : 'CLOSED'}</span>
      {connected && banner && <span className="port-banner">{banner.slice(0, 40)}</span>}
    </div>
  );
}

// ─── Result Panel ─────────────────────────────────────────────────────────────
function ResultPanel({ result }) {
  const { email, score, deliverability, checks, processingTime } = result;

  return (
    <div className="result-panel animate-in">
      <div className="result-header">
        <div className="result-email-wrap">
          <div className="result-email">{email}</div>
          <div className={`result-badge badge-${deliverability.color}`}>{deliverability.label}</div>
          {processingTime && <div className="result-time"><Icon name="clock" size={11}/> {processingTime}ms</div>}
        </div>
        <ScoreRing score={score} color={deliverability.color}/>
      </div>

      {checks.typoSuggestion && (
        <div className="typo-banner">
          <Icon name="warning" size={14}/>
          Did you mean <strong>{checks.typoSuggestion}</strong>?
        </div>
      )}

      <div className="result-sections">
        {/* Syntax */}
        <div className="result-section">
          <div className="section-title"><Icon name="mail" size={13}/> Syntax</div>
          <CheckRow label="Valid format" value={checks.syntax.valid}/>
          <CheckRow label="Local part" value={checks.syntax.localPart ? true : false} detail={checks.syntax.localPart}/>
          <CheckRow label="Domain" value={checks.syntax.domain ? true : false} detail={checks.syntax.domain}/>
          <CheckRow label="Length" value={checks.syntax.length <= 254} detail={`${checks.syntax.length} chars`}/>
        </div>

        {/* Domain */}
        <div className="result-section">
          <div className="section-title"><Icon name="globe" size={13}/> Domain</div>
          <CheckRow label="Domain exists" value={checks.domain.exists}/>
          <CheckRow label="MX records" value={checks.domain.hasMX} detail={checks.domain.mxRecords.length > 0 ? `${checks.domain.mxRecords.length} record(s)` : undefined}/>
          {checks.domain.mxRecords.slice(0, 3).map((mx, i) => (
            <div key={i} className="mx-record">
              <span className="mx-priority">P{mx.priority}</span>
              <span className="mx-exchange">{mx.exchange}</span>
            </div>
          ))}
        </div>

        {/* Security */}
        <div className="result-section">
          <div className="section-title"><Icon name="shield" size={13}/> DNS Security</div>
          <CheckRow label="SPF record" value={checks.dns.hasSPF} detail={checks.dns.spfRecord ? checks.dns.spfRecord.slice(0, 40) + (checks.dns.spfRecord.length > 40 ? '…' : '') : undefined}/>
          <CheckRow label="DMARC record" value={checks.dns.hasDMARC} detail={checks.dns.dmarcRecord ? checks.dns.dmarcRecord.slice(0, 40) + (checks.dns.dmarcRecord.length > 40 ? '…' : '') : undefined}/>
        </div>

        {/* SMTP */}
        <div className="result-section">
          <div className="section-title"><Icon name="server" size={13}/> SMTP</div>
          <CheckRow label="SMTP reachable" value={checks.smtp.reachable}/>
          {checks.smtp.portResults.length > 0 && (
            <div className="port-grid">
              {checks.smtp.portResults.map((p, i) => (
                <PortBadge key={i} port={p.port} connected={p.connected} banner={p.banner}/>
              ))}
            </div>
          )}
        </div>

        {/* Flags */}
        <div className="result-section">
          <div className="section-title"><Icon name="zap" size={13}/> Flags</div>
          <CheckRow label="Disposable domain" value={!checks.disposable} detail={checks.disposable ? 'Flagged as disposable' : 'Clean'}/>
          <CheckRow label="Role-based address" value={!checks.roleBasedAddress} detail={checks.roleBasedAddress ? 'Role address detected' : 'Personal address'}/>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Result Row ──────────────────────────────────────────────────────────
function BulkRow({ item }) {
  const { email, score, deliverability, checks } = item;
  return (
    <div className={`bulk-row`}>
      <div className="bulk-email">{email}</div>
      <div className="bulk-checks">
        <span title="Syntax">{checks.syntax.valid ? '✓' : '✗'}</span>
        <span title="MX">{checks.domain.hasMX ? '✓' : '✗'}</span>
        <span title="Not Disposable">{!checks.disposable ? '✓' : '✗'}</span>
      </div>
      <div className="bulk-score" style={{ color: { green:'#00e676',blue:'#40c4ff',yellow:'#ffea00',orange:'#ff9100',red:'#ff1744' }[deliverability.color] }}>
        {score}
      </div>
      <div className={`result-badge badge-${deliverability.color}`} style={{fontSize:'10px',padding:'2px 6px'}}>{deliverability.label}</div>
    </div>
  );
}

// ─── SMTP Tester ──────────────────────────────────────────────────────────────
function SmtpTester() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const test = async () => {
    if (!host.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/smtp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: host.trim(), port: parseInt(port) })
      });
      setResult(await res.json());
    } catch {
      setResult({ error: 'Failed to connect to API' });
    }
    setLoading(false);
  };

  return (
    <div className="smtp-tester">
      <div className="section-title" style={{marginBottom:'12px'}}><Icon name="server" size={13}/> Direct SMTP Connection Test</div>
      <div className="smtp-inputs">
        <input className="field-input" placeholder="smtp.example.com" value={host} onChange={e => setHost(e.target.value)}/>
        <input className="field-input port-input" placeholder="587" value={port} onChange={e => setPort(e.target.value)} type="number"/>
        <button className="btn-primary" onClick={test} disabled={loading || !host.trim()}>
          {loading ? <span className="spinner"/> : <><Icon name="zap" size={14}/> Test</>}
        </button>
      </div>
      {result && (
        <div className={`smtp-result ${result.connected ? 'smtp-ok' : 'smtp-fail'}`}>
          <div className="smtp-result-header">
            {result.connected ? <Icon name="check" size={15}/> : <Icon name="x" size={15}/>}
            <span>{result.host}:{result.port} — {result.connected ? 'Connected' : 'Failed'}</span>
          </div>
          {result.banner && <div className="smtp-banner">{result.banner}</div>}
          {result.error && <div className="smtp-error-text">{result.error}</div>}
        </div>
      )}
    </div>
  );
}

// ─── MX Lookup ───────────────────────────────────────────────────────────────
function MxLookup() {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mx/${encodeURIComponent(domain.trim())}`);
      setResult(await res.json());
    } catch {
      setResult({ error: 'Failed to connect to API' });
    }
    setLoading(false);
  };

  return (
    <div className="smtp-tester">
      <div className="section-title" style={{marginBottom:'12px'}}><Icon name="globe" size={13}/> Domain MX Lookup</div>
      <div className="smtp-inputs">
        <input className="field-input" placeholder="example.com" value={domain}
          onChange={e => setDomain(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookup()}/>
        <button className="btn-primary" onClick={lookup} disabled={loading || !domain.trim()}>
          {loading ? <span className="spinner"/> : <><Icon name="search" size={14}/> Lookup</>}
        </button>
      </div>
      {result && !result.error && (
        <div className="mx-result">
          <div className="mx-result-row"><span>Domain exists</span><span className={result.exists ? 'tag-pass' : 'tag-fail'}>{result.exists ? 'YES' : 'NO'}</span></div>
          <div className="mx-result-row"><span>MX Records</span><span className={result.hasMX ? 'tag-pass' : 'tag-fail'}>{result.hasMX ? `${result.records.length} found` : 'None'}</span></div>
          <div className="mx-result-row"><span>SPF</span><span className={result.spf?.hasSPF ? 'tag-pass' : 'tag-fail'}>{result.spf?.hasSPF ? 'Present' : 'Missing'}</span></div>
          <div className="mx-result-row"><span>DMARC</span><span className={result.dmarc?.hasDMARC ? 'tag-pass' : 'tag-fail'}>{result.dmarc?.hasDMARC ? 'Present' : 'Missing'}</span></div>
          {result.records?.length > 0 && (
            <div className="mx-records-list">
              {result.records.map((r, i) => (
                <div key={i} className="mx-record" style={{marginTop:'4px'}}>
                  <span className="mx-priority">P{r.priority}</span>
                  <span className="mx-exchange">{r.exchange}</span>
                </div>
              ))}
            </div>
          )}
          {result.spf?.record && <div className="dns-record-text">SPF: {result.spf.record}</div>}
          {result.dmarc?.record && <div className="dns-record-text">DMARC: {result.dmarc.record}</div>}
        </div>
      )}
      {result?.error && <div className="smtp-result smtp-fail">{result.error}</div>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('single');
  const [email, setEmail] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [result, setResult] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const validate = useCallback(async () => {
    if (!email.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError('Cannot connect to API. Make sure the backend is running on port 5000.');
    }
    setLoading(false);
  }, [email]);

  const validateBulk = useCallback(async () => {
    const emails = bulkText.split('\n').map(e => e.trim()).filter(Boolean);
    if (!emails.length) return;
    setLoading(true); setError(''); setBulkResults(null);
    try {
      const res = await fetch(`${API_BASE}/api/validate/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emails.slice(0, 20) })
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setBulkResults(data);
    } catch {
      setError('Cannot connect to API. Make sure the backend is running on port 5000.');
    }
    setLoading(false);
  }, [bulkText]);

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabs = [
    { id: 'single', label: 'Single Validate', icon: 'mail' },
    { id: 'bulk', label: 'Bulk Validate', icon: 'list' },
    { id: 'smtp', label: 'SMTP Test', icon: 'server' },
    { id: 'mx', label: 'MX Lookup', icon: 'globe' },
  ];

  const emailCount = bulkText.split('\n').filter(e => e.trim()).length;

  return (
    <div className="app">
      <div className="bg-grid"/>
      <div className="bg-glow"/>

      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon"><Icon name="shield" size={20}/></div>
            <div>
              <div className="logo-title">MailProbe</div>
              <div className="logo-sub">SMTP & Email Validation Suite</div>
            </div>
          </div>
          <div className="header-pills">
            <span className="pill pill-green">API v1.0</span>
            <span className="pill pill-blue">Real-time DNS</span>
            <span className="pill pill-purple">SMTP Scan</span>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'tab-active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={14}/>{t.label}
            </button>
          ))}
        </div>

        <div className="content">

          {/* ── Single Validate ── */}
          {tab === 'single' && (
            <div className="panel">
              <div className="panel-intro">
                <h2>Email Address Validation</h2>
                <p>Performs syntax check, DNS/MX lookup, SPF/DMARC verification, SMTP port scanning, and disposable domain detection.</p>
              </div>
              <div className="input-group">
                <div className="input-wrap">
                  <span className="input-icon"><Icon name="mail" size={16}/></span>
                  <input ref={inputRef} className="main-input" type="email" placeholder="user@example.com"
                    value={email} onChange={e => { setEmail(e.target.value); setResult(null); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && validate()}/>
                  {email && <button className="input-clear" onClick={() => { setEmail(''); setResult(null); setError(''); inputRef.current?.focus(); }}><Icon name="x" size={14}/></button>}
                </div>
                <button className="btn-primary btn-large" onClick={validate} disabled={loading || !email.trim()}>
                  {loading ? <><span className="spinner"/> Scanning…</> : <><Icon name="search" size={16}/> Validate Email</>}
                </button>
              </div>

              {error && <div className="error-msg"><Icon name="warning" size={14}/> {error}</div>}

              {result && (
                <div>
                  <div className="result-toolbar">
                    <span className="result-toolbar-label">Validation Result</span>
                    <button className="btn-ghost" onClick={copyResult}><Icon name="copy" size={13}/> {copied ? 'Copied!' : 'Copy JSON'}</button>
                  </div>
                  <ResultPanel result={result}/>
                </div>
              )}
            </div>
          )}

          {/* ── Bulk Validate ── */}
          {tab === 'bulk' && (
            <div className="panel">
              <div className="panel-intro">
                <h2>Bulk Email Validation</h2>
                <p>Validate up to 20 emails at once. One email per line. Performs syntax, DNS, and MX checks.</p>
              </div>
              <div className="bulk-input-wrap">
                <textarea className="bulk-textarea" placeholder={"user@gmail.com\ntest@yahoo.com\nadmin@company.org\n..."}
                  value={bulkText} onChange={e => { setBulkText(e.target.value); setBulkResults(null); }}
                  rows={8}/>
                <div className="bulk-footer">
                  <span className="bulk-count">{emailCount}/20 emails</span>
                  <div style={{display:'flex',gap:'8px'}}>
                    {bulkText && <button className="btn-ghost" onClick={() => { setBulkText(''); setBulkResults(null); }}><Icon name="trash" size={13}/> Clear</button>}
                    <button className="btn-primary" onClick={validateBulk} disabled={loading || !emailCount}>
                      {loading ? <><span className="spinner"/> Scanning…</> : <><Icon name="list" size={14}/> Validate All</>}
                    </button>
                  </div>
                </div>
              </div>
              {error && <div className="error-msg"><Icon name="warning" size={14}/> {error}</div>}
              {bulkResults && (
                <div className="bulk-results">
                  <div className="bulk-summary">
                    <div className="bulk-stat"><span>{bulkResults.results.filter(r => r.score >= 65).length}</span>Valid</div>
                    <div className="bulk-stat"><span>{bulkResults.results.filter(r => r.checks.disposable).length}</span>Disposable</div>
                    <div className="bulk-stat"><span>{bulkResults.results.filter(r => r.checks.domain.hasMX).length}</span>Has MX</div>
                    <div className="bulk-stat"><span>{bulkResults.results.filter(r => r.score < 25).length}</span>Invalid</div>
                  </div>
                  <div className="bulk-header-row">
                    <span>Email</span><span>Checks</span><span>Score</span><span>Status</span>
                  </div>
                  {bulkResults.results.map((item, i) => <BulkRow key={i} item={item}/>)}
                </div>
              )}
            </div>
          )}

          {/* ── SMTP Test ── */}
          {tab === 'smtp' && (
            <div className="panel">
              <div className="panel-intro">
                <h2>SMTP Server Connectivity Test</h2>
                <p>Directly test connection to any SMTP server. Checks if the port is open and captures the server banner.</p>
              </div>
              <SmtpTester/>
              <div className="info-cards">
                {[
                  { port: 25, label: 'SMTP', desc: 'Standard mail transfer (often blocked by ISPs)' },
                  { port: 465, label: 'SMTPS', desc: 'SMTP over SSL/TLS (implicit)' },
                  { port: 587, label: 'Submission', desc: 'Authenticated mail submission (recommended)' },
                  { port: 2525, label: 'Alt SMTP', desc: 'Alternative port when 25 is blocked' },
                ].map(c => (
                  <div key={c.port} className="info-card">
                    <div className="info-card-port">:{c.port}</div>
                    <div className="info-card-label">{c.label}</div>
                    <div className="info-card-desc">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MX Lookup ── */}
          {tab === 'mx' && (
            <div className="panel">
              <div className="panel-intro">
                <h2>Domain MX Record Lookup</h2>
                <p>Retrieve MX, SPF, and DMARC DNS records for any domain. Useful for diagnosing email delivery issues.</p>
              </div>
              <MxLookup/>
            </div>
          )}

        </div>
      </main>

      <footer className="footer">
        <span>MailProbe — SMTP Checker & Email Validation Suite</span>
        <span>Backend: Node.js + Express · Frontend: React</span>
      </footer>
    </div>
  );
}
