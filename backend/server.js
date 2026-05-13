const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const net = require('net');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwam.com','yopmail.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info',
  'spam4.me','trashmail.com','trashmail.me','dispostable.com','mailnull.com',
  'maildrop.cc','spamgourmet.com','mytemp.email','temp-mail.org','fakeinbox.com',
  'throwaway.email','getnada.com','mailnesia.com','spamfree24.org','discard.email',
  'spambox.us','tempr.email','spam.la','wegwerfemail.de','sogetthis.com',
  'trashmail.at','trashmail.io','trashmail.me','dispostable.com','tempinbox.com',
  'spamhereplease.com','boun.cr','spamdecoy.net','spam.la','spamoff.de',
  'tempemail.net','yopmail.fr','cool.fr.nf','jetable.fr.nf','nospam.ze.tc',
  'nomail.xl.cx','mega.zik.dj','speed.1s.fr','courriel.fr.nf','moncourrier.fr.nf',
  'monemail.fr.nf','monmail.fr.nf'
]);

const ROLE_BASED_PREFIXES = new Set([
  'admin','info','support','sales','contact','noreply','no-reply','help',
  'webmaster','postmaster','hostmaster','abuse','security','billing',
  'marketing','newsletter','notifications','alerts','donotreply'
]);

const COMMON_TYPO_DOMAINS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.cmo': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.ocm': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'outloo.com': 'outlook.com', 'outlok.com': 'outlook.com', 'hotmial.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com', 'hotmali.com': 'hotmail.com',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkMXRecords(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return {
      hasMX: records.length > 0,
      records: records.sort((a, b) => a.priority - b.priority).map(r => ({
        exchange: r.exchange,
        priority: r.priority
      }))
    };
  } catch {
    return { hasMX: false, records: [] };
  }
}

async function checkDNSExists(domain) {
  try {
    await dns.lookup(domain);
    return true;
  } catch {
    return false;
  }
}

async function checkSPFRecord(domain) {
  try {
    const records = await dns.resolveTxt(domain);
    const spfRecord = records.flat().find(r => r.startsWith('v=spf1'));
    return { hasSPF: !!spfRecord, record: spfRecord || null };
  } catch {
    return { hasSPF: false, record: null };
  }
}

async function checkDMARCRecord(domain) {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const dmarcRecord = records.flat().find(r => r.startsWith('v=DMARC1'));
    return { hasDMARC: !!dmarcRecord, record: dmarcRecord || null };
  } catch {
    return { hasDMARC: false, record: null };
  }
}

async function smtpConnect(host, port = 25, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let banner = '';
    let connected = false;

    socket.setTimeout(timeout);

    socket.connect(port, host, () => {
      connected = true;
    });

    socket.on('data', (data) => {
      banner += data.toString();
      if (banner.includes('\n')) {
        socket.destroy();
        resolve({ connected: true, banner: banner.trim(), port });
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ connected: false, banner: '', port, error: 'Connection timed out' });
    });

    socket.on('error', (err) => {
      resolve({ connected: false, banner: '', port, error: err.message });
    });

    socket.on('close', () => {
      if (!connected) {
        resolve({ connected: false, banner: '', port, error: 'Connection closed' });
      }
    });
  });
}

async function checkSMTPPorts(host) {
  const ports = [25, 465, 587, 2525];
  const results = await Promise.all(
    ports.map(port => smtpConnect(host, port, 4000))
  );
  return results;
}

function calculateScore(checks) {
  let score = 0;
  let maxScore = 0;

  const weights = {
    syntaxValid: { weight: 20, value: checks.syntax.valid },
    domainExists: { weight: 15, value: checks.domain.exists },
    hasMX: { weight: 25, value: checks.domain.hasMX },
    smtpReachable: { weight: 20, value: checks.smtp.reachable },
    hasSPF: { weight: 10, value: checks.dns.hasSPF },
    hasDMARC: { weight: 10, value: checks.dns.hasDMARC },
  };

  for (const [, w] of Object.entries(weights)) {
    maxScore += w.weight;
    if (w.value) score += w.weight;
  }

  // Penalties
  if (checks.disposable) score = Math.max(0, score - 30);
  if (checks.roleBasedAddress) score = Math.max(0, score - 10);

  return Math.round((score / maxScore) * 100);
}

function getDeliverabilityLabel(score) {
  if (score >= 85) return { label: 'Excellent', color: 'green' };
  if (score >= 65) return { label: 'Good', color: 'blue' };
  if (score >= 45) return { label: 'Fair', color: 'yellow' };
  if (score >= 25) return { label: 'Poor', color: 'orange' };
  return { label: 'Invalid', color: 'red' };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Full email validation
app.post('/api/validate', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const startTime = Date.now();

  // Syntax check
  const syntaxValid = EMAIL_REGEX.test(trimmedEmail);
  const parts = trimmedEmail.split('@');
  const localPart = parts[0] || '';
  const domain = parts[1] || '';

  // Disposable check
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);

  // Role-based check
  const isRoleBased = ROLE_BASED_PREFIXES.has(localPart.split('+')[0]);

  // Typo suggestion
  const typoSuggestion = COMMON_TYPO_DOMAINS[domain]
    ? `${localPart}@${COMMON_TYPO_DOMAINS[domain]}`
    : null;

  // DNS checks
  const [domainExists, mxResult, spfResult, dmarcResult] = await Promise.all([
    syntaxValid ? checkDNSExists(domain) : Promise.resolve(false),
    syntaxValid ? checkMXRecords(domain) : Promise.resolve({ hasMX: false, records: [] }),
    syntaxValid ? checkSPFRecord(domain) : Promise.resolve({ hasSPF: false, record: null }),
    syntaxValid ? checkDMARCRecord(domain) : Promise.resolve({ hasDMARC: false, record: null }),
  ]);

  // SMTP check
  let smtpResults = [];
  let smtpReachable = false;

  if (syntaxValid && mxResult.hasMX && mxResult.records.length > 0) {
    const primaryMX = mxResult.records[0].exchange;
    smtpResults = await checkSMTPPorts(primaryMX);
    smtpReachable = smtpResults.some(r => r.connected);
  }

  const checks = {
    syntax: {
      valid: syntaxValid,
      localPart,
      domain,
      length: trimmedEmail.length,
    },
    domain: {
      exists: domainExists,
      hasMX: mxResult.hasMX,
      mxRecords: mxResult.records,
    },
    dns: {
      hasSPF: spfResult.hasSPF,
      spfRecord: spfResult.record,
      hasDMARC: dmarcResult.hasDMARC,
      dmarcRecord: dmarcResult.record,
    },
    smtp: {
      reachable: smtpReachable,
      portResults: smtpResults,
    },
    disposable: isDisposable,
    roleBasedAddress: isRoleBased,
    typoSuggestion,
  };

  const score = calculateScore(checks);
  const deliverability = getDeliverabilityLabel(score);
  const elapsed = Date.now() - startTime;

  res.json({
    email: trimmedEmail,
    score,
    deliverability,
    checks,
    processingTime: elapsed,
    timestamp: new Date().toISOString(),
  });
});

// Bulk validation
app.post('/api/validate/bulk', async (req, res) => {
  const { emails } = req.body;

  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'An array of email addresses is required.' });
  }

  if (emails.length > 20) {
    return res.status(400).json({ error: 'Maximum 20 emails per bulk request.' });
  }

  const results = [];

  for (const email of emails) {
    const trimmed = (email || '').trim().toLowerCase();
    const syntaxValid = EMAIL_REGEX.test(trimmed);
    const parts = trimmed.split('@');
    const localPart = parts[0] || '';
    const domain = parts[1] || '';
    const isDisposable = DISPOSABLE_DOMAINS.has(domain);
    const isRoleBased = ROLE_BASED_PREFIXES.has(localPart.split('+')[0]);

    let mxResult = { hasMX: false, records: [] };
    let domainExists = false;

    if (syntaxValid) {
      [domainExists, mxResult] = await Promise.all([
        checkDNSExists(domain),
        checkMXRecords(domain),
      ]);
    }

    const checks = {
      syntax: { valid: syntaxValid, localPart, domain, length: trimmed.length },
      domain: { exists: domainExists, hasMX: mxResult.hasMX, mxRecords: mxResult.records },
      dns: { hasSPF: false, hasDMARC: false },
      smtp: { reachable: false, portResults: [] },
      disposable: isDisposable,
      roleBasedAddress: isRoleBased,
      typoSuggestion: COMMON_TYPO_DOMAINS[domain] ? `${localPart}@${COMMON_TYPO_DOMAINS[domain]}` : null,
    };

    const score = calculateScore(checks);
    results.push({
      email: trimmed,
      score,
      deliverability: getDeliverabilityLabel(score),
      checks,
    });

    await sleep(100); // small delay between checks
  }

  res.json({ results, count: results.length, timestamp: new Date().toISOString() });
});

// SMTP server test
app.post('/api/smtp/test', async (req, res) => {
  const { host, port } = req.body;

  if (!host) return res.status(400).json({ error: 'Host is required.' });

  const targetPort = parseInt(port) || 587;
  const result = await smtpConnect(host, targetPort, 8000);

  res.json({
    host,
    port: targetPort,
    ...result,
    timestamp: new Date().toISOString(),
  });
});

// MX lookup
app.get('/api/mx/:domain', async (req, res) => {
  const { domain } = req.params;
  if (!domain) return res.status(400).json({ error: 'Domain is required.' });

  const [mxResult, spfResult, dmarcResult, exists] = await Promise.all([
    checkMXRecords(domain),
    checkSPFRecord(domain),
    checkDMARCRecord(domain),
    checkDNSExists(domain),
  ]);

  res.json({
    domain,
    exists,
    ...mxResult,
    spf: spfResult,
    dmarc: dmarcResult,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ SMTP Checker API running on http://localhost:${PORT}`);
});
