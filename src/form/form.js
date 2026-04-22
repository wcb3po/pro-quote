/* ============================================================
   form.js — builds the customer-facing quote form from config
   ============================================================
   Flow:
     Step 1 (services) → Step 2 (details + quote) → Step 3 (lead capture)

   Customization happens entirely in config.json (edit via
   admin panel). This file just reads the config and renders.
   ============================================================ */
import { QuoteEngine } from '../core/engine.js';
import { RADIUS_MAP, combineFontUrls, fontUrl } from '../core/themes.js';

const CONFIG_PATH = '../core/config.default.json';
const LS_KEY = 'quoteFormKit.config';

async function init() {
  // Prefer the admin-panel's localStorage config over the default file.
  let config;
  const stored = localStorage.getItem(LS_KEY);
  if (stored) {
    try { config = JSON.parse(stored); }
    catch { config = await fetchDefault(); }
  } else {
    config = await fetchDefault();
  }

  applyTheme(config);
  applyBranding(config);
  renderServices(config);
  wireUp(config);
  applyPackageParam(config);
}

async function fetchDefault() {
  const res = await fetch(CONFIG_PATH);
  return res.json();
}

/* ---------- THEME ---------- */
function applyTheme(cfg) {
  const theme = cfg.theme || {};
  const colors = theme.colors || {};
  const fonts  = theme.fonts  || {};

  // 1. Colors → CSS variables
  const root = document.documentElement;
  for (const [k, v] of Object.entries(colors)) {
    if (v) root.style.setProperty(`--${k}`, v);
  }

  // 2. Border radius
  const r = RADIUS_MAP[theme.radius] || RADIUS_MAP.rounded;
  root.style.setProperty('--r-card',  r.card);
  root.style.setProperty('--r-btn',   r.button);
  root.style.setProperty('--r-input', r.input);

  // 3. Button style toggle (adds a body class)
  document.body.classList.remove('btns-outlined');
  if (theme.buttonStyle === 'outlined') {
    document.body.classList.add('btns-outlined');
  }

  // 4. Fonts — inject <link> tags for whatever the theme needs,
  //    then set the CSS variable. The fallback stack protects
  //    us if Google Fonts is blocked / slow.
  const urls = combineFontUrls(fonts.heading, fonts.body);
  for (const url of urls) loadFontUrl(url);

  if (fonts.heading) {
    root.style.setProperty('--f-heading', `"${fonts.heading}", serif`);
  }
  if (fonts.body) {
    root.style.setProperty('--f-body', `"${fonts.body}", system-ui, sans-serif`);
  }
}

const _loadedFontUrls = new Set();
function loadFontUrl(url) {
  if (_loadedFontUrls.has(url)) return;
  _loadedFontUrls.add(url);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

/* ---------- BRANDING ---------- */
function applyBranding(cfg) {
  const b = cfg.business || {};
  if (b.name) {
    document.title = `${b.name} — Instant Quote`;
    document.getElementById('businessName').textContent = b.name;
  }
  if (b.tagline) {
    document.getElementById('tagline').textContent = b.tagline;
  }
}

/* ---------- SERVICES RENDERING ---------- */
function renderServices(cfg) {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = '';
  for (const svc of cfg.services) {
    const card = document.createElement('label');
    card.className = 'service-card';
    card.dataset.serviceId = svc.id;
    card.innerHTML = `
      <span class="check"></span>
      <input type="checkbox" data-id="${svc.id}">
      <div class="name">${escapeHtml(svc.label)}</div>
      ${svc.description ? `<div class="desc">${escapeHtml(svc.description)}</div>` : ''}
    `;
    const cb = card.querySelector('input');
    cb.addEventListener('change', () => {
      card.classList.toggle('selected', cb.checked);
    });
    grid.appendChild(card);
  }
}

function renderDetails(cfg, selectedIds) {
  const container = document.getElementById('detailsContainer');
  container.innerHTML = '';
  if (!selectedIds.length) {
    container.innerHTML = '<div class="empty-hint">No services selected. Go back and pick one.</div>';
    return;
  }

  for (const id of selectedIds) {
    const svc = cfg.services.find(s => s.id === id);
    if (!svc) continue;

    const block = document.createElement('div');
    block.className = 'detail-block';
    block.dataset.serviceId = id;
    let html = `<h3>${escapeHtml(svc.label)}</h3>`;
    for (const input of svc.inputs || []) {
      html += renderField(id, input);
    }
    block.innerHTML = html;
    container.appendChild(block);
  }
}

function renderField(serviceId, input) {
  const name = `${serviceId}__${input.field}`;
  const label = `<label for="${name}">${escapeHtml(input.label)}</label>`;
  if (input.type === 'select') {
    const opts = input.options.map(o =>
      `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`
    ).join('');
    return `<div class="field">${label}<select id="${name}" name="${name}">${opts}</select></div>`;
  }
  const t = input.type === 'number' ? 'number' : 'text';
  const min = input.min != null ? `min="${input.min}"` : '';
  return `<div class="field">${label}<input type="${t}" id="${name}" name="${name}" ${min} placeholder="0"></div>`;
}

function collectSelections(cfg) {
  const sel = {};
  const checked = document.querySelectorAll('#servicesGrid input[type="checkbox"]:checked');
  const ids = Array.from(checked).map(c => c.dataset.id);

  for (const id of ids) {
    const svc = cfg.services.find(s => s.id === id);
    if (!svc) continue;
    const inputs = {};
    for (const inp of svc.inputs || []) {
      const el = document.getElementById(`${id}__${inp.field}`);
      if (el) inputs[inp.field] = el.value;
    }
    sel[id] = { selected: true, inputs };
  }
  return sel;
}

/* ---------- WIRE UP EVENTS ---------- */
function wireUp(cfg) {
  const engine = new QuoteEngine(cfg);
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');

  // Cache the last calculated result so we can attach it to the lead.
  let lastResult = null;
  let lastSelections = null;

  document.getElementById('nextBtn').addEventListener('click', () => {
    const checked = document.querySelectorAll('#servicesGrid input[type="checkbox"]:checked');
    if (!checked.length) {
      alert('Please select at least one service.');
      return;
    }
    const ids = Array.from(checked).map(c => c.dataset.id);
    renderDetails(cfg, ids);
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    document.getElementById('quoteBox').classList.add('hidden');
    document.getElementById('leadCapture').classList.add('hidden');
    document.getElementById('leadSuccess').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    step2.classList.add('hidden');
    step1.classList.remove('hidden');
    document.getElementById('quoteBox').classList.add('hidden');
    document.getElementById('leadCapture').classList.add('hidden');
    document.getElementById('leadSuccess').classList.add('hidden');
  });

  document.getElementById('quoteBtn').addEventListener('click', () => {
    lastSelections = collectSelections(cfg);
    lastResult = engine.calculate(lastSelections);
    renderQuote(cfg, lastResult);
    maybeShowLeadCapture(cfg);
  });

  document.getElementById('leadSubmitBtn').addEventListener('click', () => {
    submitLead(cfg, lastResult, lastSelections);
  });
}

/* ---------- QUOTE DISPLAY ---------- */
function renderQuote(cfg, result) {
  const sym = cfg.business?.currencySymbol || '$';
  const money = n => `${sym}${n.toFixed(2)}`;

  const lineItemsEl = document.getElementById('lineItems');
  lineItemsEl.innerHTML = result.lineItems.map(li =>
    `<div class="line-item"><span>${escapeHtml(li.label)}</span><span>${money(li.price)}</span></div>`
  ).join('');

  const discountEl = document.getElementById('discountRow');
  if (result.discountPct > 0) {
    discountEl.innerHTML = `
      <div class="line-item discount-row">
        <span>Multi-service discount (${Math.round(result.discountPct*100)}%)</span>
        <span>−${money(result.discountAmount)}</span>
      </div>`;
  } else {
    discountEl.innerHTML = '';
  }

  document.getElementById('totalValue').textContent = money(result.total);

  const badgeEl = document.getElementById('savingsBadge');
  badgeEl.innerHTML = result.discountAmount > 0
    ? `<span class="savings-badge">You saved ${money(result.discountAmount)}</span>`
    : '';

  document.getElementById('quoteBox').classList.remove('hidden');
  document.getElementById('quoteBox').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- LEAD CAPTURE ---------- */
function maybeShowLeadCapture(cfg) {
  const lc = cfg.leadCapture;
  if (!lc || !lc.enabled) return;

  document.getElementById('leadHeading').textContent    = lc.heading || 'Get this quote emailed to you';
  document.getElementById('leadSubheading').textContent = lc.subheading || '';
  document.getElementById('leadSubmitBtn').textContent  = lc.submitLabel || 'Send';

  const grid = document.getElementById('leadFields');
  grid.innerHTML = '';
  (lc.fields || []).forEach(f => {
    const full = f.type === 'textarea' || f.field === 'address' || f.field === 'notes';
    const cls = 'field' + (f.required ? ' required' : '') + (full ? ' full' : '');
    const id = `lead_${f.field}`;
    const lbl = `<label for="${id}">${escapeHtml(f.label)}</label>`;
    let input;
    if (f.type === 'textarea') {
      input = `<textarea id="${id}" name="${id}"></textarea>`;
    } else {
      const t = f.type || 'text';
      input = `<input type="${t}" id="${id}" name="${id}">`;
    }
    grid.insertAdjacentHTML('beforeend', `<div class="${cls}">${lbl}${input}</div>`);
  });

  document.getElementById('leadCapture').classList.remove('hidden');
  document.getElementById('leadError').textContent = '';
}

async function submitLead(cfg, result, selections) {
  const lc = cfg.leadCapture || {};
  const errEl = document.getElementById('leadError');
  errEl.textContent = '';

  // Collect + validate
  const lead = {};
  for (const f of lc.fields || []) {
    const el = document.getElementById(`lead_${f.field}`);
    const val = el ? el.value.trim() : '';
    if (f.required && !val) {
      errEl.textContent = `${f.label} is required.`;
      el?.focus();
      return;
    }
    if (f.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      errEl.textContent = `Please enter a valid email.`;
      el?.focus();
      return;
    }
    lead[f.field] = val;
  }

  // Build a readable quote summary for your inbox
  const sym = cfg.business?.currencySymbol || '$';
  const quoteSummary = result.lineItems
    .map(li => `  ${li.label}: ${sym}${li.price.toFixed(2)}`)
    .join('\n');
  const payload = {
    _business: cfg.business?.name || '',
    _total: `${sym}${result.total.toFixed(2)}`,
    _subtotal: `${sym}${result.subtotal.toFixed(2)}`,
    _discount: result.discountPct > 0
      ? `${Math.round(result.discountPct*100)}% (−${sym}${result.discountAmount.toFixed(2)})`
      : 'none',
    _services: quoteSummary,
    ...lead
  };

  // Delivery mode. 'formspree' is the friendly default: you
  // paste a Formspree endpoint URL into the admin panel and
  // submissions get emailed to you. 'none' just logs locally
  // for testing.
  const mode = lc.delivery?.mode || 'none';
  const endpoint = lc.delivery?.endpoint || '';

  const submitBtn = document.getElementById('leadSubmitBtn');
  submitBtn.disabled = true;
  const prevLabel = submitBtn.textContent;
  submitBtn.textContent = 'Sending…';

  try {
    if (mode === 'formspree' && endpoint) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } else if (mode === 'webhook' && endpoint) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } else {
      // No endpoint configured — store locally and succeed.
      // Developer can check console or wire up an endpoint later.
      console.log('[QuoteKit lead submission]', payload);
      const stash = JSON.parse(localStorage.getItem('quoteFormKit.leads') || '[]');
      stash.push({ ...payload, _at: new Date().toISOString() });
      localStorage.setItem('quoteFormKit.leads', JSON.stringify(stash));
    }

    // Success — hide capture form, show success panel
    document.getElementById('leadCapture').classList.add('hidden');
    const successEl = document.getElementById('leadSuccess');
    successEl.textContent = lc.successMessage || "Thanks! We'll be in touch soon.";
    successEl.classList.remove('hidden');
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    errEl.textContent = `Could not send: ${err.message}. Please try again or contact us directly.`;
    submitBtn.disabled = false;
    submitBtn.textContent = prevLabel;
  }
}

/* ---------- PACKAGE URL PARAM ---------- */
function applyPackageParam(cfg) {
  const params = new URLSearchParams(location.search);
  const pkgId = params.get('package');
  if (!pkgId) return;
  const pkg = (cfg.packages || []).find(p => p.id === pkgId);
  if (!pkg) return;

  for (const id of pkg.services) {
    const cb = document.querySelector(`#servicesGrid input[data-id="${id}"]`);
    if (cb) {
      cb.checked = true;
      cb.closest('.service-card').classList.add('selected');
    }
  }
  setTimeout(() => document.getElementById('nextBtn').click(), 250);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

init();
