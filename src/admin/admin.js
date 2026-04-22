/* ============================================================
   admin.js — visual editor for config.json
   ============================================================
   State model: we keep a single `config` object in memory.
   Every UI edit mutates it directly. Render functions rebuild
   only the piece that changed.

   Persistence: saved to localStorage under 'quoteFormKit.config'
   so the form preview can pick it up immediately.
   ============================================================ */
import { THEMES, FONT_LIBRARY, fontUrl, RADIUS_MAP } from '../core/themes.js';

const LS_KEY = 'quoteFormKit.config';
const DEFAULT_CONFIG_PATH = '../core/config.default.json';

let config = null;
let dirty = false;

// ---------- BOOTSTRAP ----------
async function init() {
  const stored = localStorage.getItem(LS_KEY);
  if (stored) {
    try { config = JSON.parse(stored); }
    catch { config = await loadDefault(); }
  } else {
    config = await loadDefault();
  }
  setDirty(false);
  renderAll();
  wireNav();
  wireTopbar();
  wireAddButtons();
}

async function loadDefault() {
  const res = await fetch(DEFAULT_CONFIG_PATH);
  return res.json();
}

// ---------- NAVIGATION ----------
function wireNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const name = btn.dataset.panel;
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelector(`.panel[data-panel="${name}"]`).classList.add('active');
      if (name === 'export')  populateExport();
      if (name === 'preview') refreshPreview();
    });
  });
}

// ---------- TOP BAR ----------
function wireTopbar() {
  document.getElementById('saveBtn').addEventListener('click', () => {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
    setDirty(false);
    toast('Saved. Preview updated.', 'ok');
    refreshPreview();
  });

  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (!confirm('Reset everything to defaults? Your changes will be lost.')) return;
    localStorage.removeItem(LS_KEY);
    config = await loadDefault();
    renderAll();
    setDirty(true);
    toast('Reset to defaults.', 'ok');
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    document.querySelector('.nav-item[data-panel="export"]').click();
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', handleImport);

  document.getElementById('downloadJsonBtn').addEventListener('click', downloadJson);
  document.getElementById('copyJsonBtn').addEventListener('click', copyJson);
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (!parsed.services || !Array.isArray(parsed.services)) {
        throw new Error('Missing services array');
      }
      config = parsed;
      renderAll();
      setDirty(true);
      toast('Imported. Click Save & Preview to apply.', 'ok');
    } catch (err) {
      toast(`Invalid JSON: ${err.message}`, 'err');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function setDirty(v) {
  dirty = v;
  const el = document.getElementById('savedState');
  el.textContent = v ? '● unsaved' : '● saved';
  el.className = v ? 'pill err' : 'pill ok';
}

// Wrapper: mark dirty + optional render target.
function edit(mutator, rerenderSection) {
  mutator();
  setDirty(true);
  if (rerenderSection) rerenderSection();
}

// ---------- RENDER: ALL ----------
function renderAll() {
  renderBranding();
  renderTheme();
  renderServices();
  renderDiscounts();
  renderPackages();
  renderLeadCapture();
}

// ---------- RENDER: BRANDING ----------
function renderBranding() {
  const b = config.business || (config.business = {});
  const nameEl    = document.getElementById('brand_name');
  const taglineEl = document.getElementById('brand_tagline');
  const symbolEl  = document.getElementById('brand_symbol');
  const currEl    = document.getElementById('brand_currency');

  nameEl.value    = b.name || '';
  taglineEl.value = b.tagline || '';
  symbolEl.value  = b.currencySymbol || '$';
  currEl.value    = b.currency || 'USD';

  nameEl.oninput    = () => edit(() => b.name = nameEl.value);
  taglineEl.oninput = () => edit(() => b.tagline = taglineEl.value);
  symbolEl.oninput  = () => edit(() => b.currencySymbol = symbolEl.value);
  currEl.oninput    = () => edit(() => b.currency = currEl.value);
}

// ---------- RENDER: THEME ----------
// Color labels shown above each color swatch in the theme editor.
const COLOR_FIELDS = [
  { key: 'accent',  label: 'Accent',     hint: 'Primary brand color' },
  { key: 'ink',     label: 'Text (ink)', hint: 'Main text color' },
  { key: 'paper',   label: 'Background', hint: 'Page background' },
  { key: 'surface', label: 'Surface',    hint: 'Cards & panels' },
  { key: 'line',    label: 'Borders',    hint: 'Dividers & outlines' },
  { key: 'muted',   label: 'Muted text', hint: 'Labels, hints' }
];

// Load Google Fonts into the admin panel itself so the preview shows them.
const _loadedAdminFonts = new Set();
function loadAdminFont(name) {
  const url = fontUrl(name);
  if (!url || _loadedAdminFonts.has(url)) return;
  _loadedAdminFonts.add(url);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

function renderTheme() {
  // Ensure theme object exists with sensible defaults
  if (!config.theme) {
    config.theme = JSON.parse(JSON.stringify(THEMES.minimal));
  }
  const t = config.theme;
  t.colors = t.colors || {};
  t.fonts  = t.fonts  || {};

  // 1. Presets
  const presetWrap = document.getElementById('themePresets');
  presetWrap.innerHTML = '';
  for (const id in THEMES) {
    const theme = THEMES[id];
    const card = document.createElement('div');
    const isActive = t.preset === id;
    card.style.cssText = `
      border: 2px solid ${isActive ? 'var(--accent)' : 'var(--line)'};
      border-radius: 10px;
      padding: 14px;
      cursor: pointer;
      background: white;
      transition: all 0.12s ease;
    `;
    // Mini swatch preview
    const swatches = ['accent','ink','paper','surface','line']
      .map(k => `<span style="display:inline-block;width:22px;height:22px;border-radius:4px;background:${theme.colors[k]};border:1px solid rgba(0,0,0,0.08);margin-right:3px;"></span>`)
      .join('');
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
        <strong style="font-size:1rem;">${theme.name}</strong>
        ${isActive ? '<span class="pill ok">Active</span>' : ''}
      </div>
      <div style="margin-bottom:8px;">${swatches}</div>
      <div style="font-size:0.82rem;color:var(--muted);line-height:1.4;">${theme.description}</div>
    `;
    card.onclick = () => {
      edit(() => {
        // Deep copy so later edits don't mutate the preset source
        const fresh = JSON.parse(JSON.stringify(theme));
        config.theme = { ...fresh, preset: id };
      }, renderTheme);
    };
    presetWrap.appendChild(card);
  }

  // 2. Color editors
  const colorsWrap = document.getElementById('themeColors');
  colorsWrap.innerHTML = '';
  for (const cf of COLOR_FIELDS) {
    const current = t.colors[cf.key] || '#000000';
    const wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.innerHTML = `
      <label class="lbl">${cf.label}</label>
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="color" value="${current}" style="flex:0 0 50px;width:50px;">
        <input type="text"  value="${current}" style="flex:1;font-family:'JetBrains Mono',monospace;font-size:0.85rem;">
      </div>
      <div style="font-size:0.75rem;color:var(--muted);margin-top:3px;">${cf.hint}</div>
    `;
    const [colorEl, hexEl] = wrap.querySelectorAll('input');
    const update = (val) => edit(() => {
      t.colors[cf.key] = val;
      t.preset = 'custom';  // changing a color unsets the preset tag
      colorEl.value = val.startsWith('#') ? val : colorEl.value;
      hexEl.value = val;
      // refresh the "Active" pill on presets
      renderActiveBadges();
    });
    colorEl.oninput = (e) => update(e.target.value);
    hexEl.oninput   = (e) => {
      const v = e.target.value.trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(v)) update(v);
    };
    colorsWrap.appendChild(wrap);
  }

  // 3. Font selects
  const hSel = document.getElementById('theme_fontHeading');
  const bSel = document.getElementById('theme_fontBody');
  const buildFontOptions = (selected) => {
    const byCat = {};
    FONT_LIBRARY.forEach(f => (byCat[f.category] ||= []).push(f));
    let html = '';
    for (const cat of ['Sans','Serif','Display','Mono']) {
      if (!byCat[cat]) continue;
      html += `<optgroup label="${cat}">`;
      for (const f of byCat[cat]) {
        html += `<option value="${f.name}" ${selected===f.name?'selected':''}>${f.name}</option>`;
      }
      html += `</optgroup>`;
    }
    return html;
  };
  hSel.innerHTML = buildFontOptions(t.fonts.heading || 'Fraunces');
  bSel.innerHTML = buildFontOptions(t.fonts.body || 'Inter');

  // Load both fonts into admin page so preview is live
  loadAdminFont(t.fonts.heading);
  loadAdminFont(t.fonts.body);

  const hPrev = document.getElementById('fontPreviewHeading');
  const bPrev = document.getElementById('fontPreviewBody');
  const applyPreview = () => {
    hPrev.style.fontFamily = `"${t.fonts.heading}", serif`;
    bPrev.style.fontFamily = `"${t.fonts.body}", sans-serif`;
  };
  applyPreview();

  hSel.onchange = () => edit(() => {
    t.fonts.heading = hSel.value;
    t.preset = 'custom';
    loadAdminFont(hSel.value);
    applyPreview();
    renderActiveBadges();
  });
  bSel.onchange = () => edit(() => {
    t.fonts.body = bSel.value;
    t.preset = 'custom';
    loadAdminFont(bSel.value);
    applyPreview();
    renderActiveBadges();
  });

  // 4. Radius + button style
  const radSel = document.getElementById('theme_radius');
  const btnSel = document.getElementById('theme_buttonStyle');
  radSel.value = t.radius || 'rounded';
  btnSel.value = t.buttonStyle || 'filled';
  radSel.onchange = () => edit(() => { t.radius = radSel.value; t.preset = 'custom'; renderActiveBadges(); });
  btnSel.onchange = () => edit(() => { t.buttonStyle = btnSel.value; t.preset = 'custom'; renderActiveBadges(); });
}

// Lightweight re-render of the "Active" badges on preset cards,
// called when a custom edit unsets the preset.
function renderActiveBadges() {
  const cards = document.querySelectorAll('#themePresets > div');
  cards.forEach((card, i) => {
    const id = Object.keys(THEMES)[i];
    const isActive = config.theme?.preset === id;
    card.style.borderColor = isActive ? 'var(--accent)' : 'var(--line)';
    const pill = card.querySelector('.pill');
    if (isActive && !pill) {
      card.querySelector('strong').insertAdjacentHTML('afterend', ' <span class="pill ok">Active</span>');
    } else if (!isActive && pill) {
      pill.remove();
    }
  });
}

// ---------- RENDER: LEAD CAPTURE ----------
function renderLeadCapture() {
  if (!config.leadCapture) {
    config.leadCapture = {
      enabled: true,
      heading: 'Get this quote emailed to you',
      subheading: '',
      submitLabel: 'Send me this quote',
      successMessage: "Thanks! We'll be in touch soon.",
      fields: [],
      delivery: { mode: 'none', endpoint: '' }
    };
  }
  const lc = config.leadCapture;
  lc.fields = lc.fields || [];
  lc.delivery = lc.delivery || { mode: 'none', endpoint: '' };

  // Simple fields
  const enabledEl  = document.getElementById('lead_enabled');
  const headingEl  = document.getElementById('lead_heading');
  const subEl      = document.getElementById('lead_subheading');
  const submitEl   = document.getElementById('lead_submitLabel');
  const successEl  = document.getElementById('lead_successMessage');
  const modeEl     = document.getElementById('lead_mode');
  const endpointEl = document.getElementById('lead_endpoint');
  const blockEl    = document.getElementById('leadConfigBlock');

  enabledEl.checked = !!lc.enabled;
  headingEl.value   = lc.heading || '';
  subEl.value       = lc.subheading || '';
  submitEl.value    = lc.submitLabel || '';
  successEl.value   = lc.successMessage || '';
  modeEl.value      = lc.delivery.mode || 'none';
  endpointEl.value  = lc.delivery.endpoint || '';
  blockEl.style.opacity = lc.enabled ? '1' : '0.4';
  blockEl.style.pointerEvents = lc.enabled ? '' : 'none';

  enabledEl.onchange = () => edit(() => { lc.enabled = enabledEl.checked; }, renderLeadCapture);
  headingEl.oninput  = () => edit(() => lc.heading = headingEl.value);
  subEl.oninput      = () => edit(() => lc.subheading = subEl.value);
  submitEl.oninput   = () => edit(() => lc.submitLabel = submitEl.value);
  successEl.oninput  = () => edit(() => lc.successMessage = successEl.value);
  modeEl.onchange    = () => edit(() => lc.delivery.mode = modeEl.value);
  endpointEl.oninput = () => edit(() => lc.delivery.endpoint = endpointEl.value);

  // Fields list
  const list = document.getElementById('leadFieldsList');
  list.innerHTML = '';
  lc.fields.forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'option-row';
    row.style.gridTemplateColumns = '1fr 1.5fr 1fr auto auto';
    row.innerHTML = `
      <input type="text" value="${escapeAttr(f.field)}" placeholder="Field key">
      <input type="text" value="${escapeAttr(f.label)}" placeholder="Label">
      <select>
        <option value="text"     ${f.type==='text'?'selected':''}>Text</option>
        <option value="email"    ${f.type==='email'?'selected':''}>Email</option>
        <option value="tel"      ${f.type==='tel'?'selected':''}>Phone</option>
        <option value="textarea" ${f.type==='textarea'?'selected':''}>Long text</option>
      </select>
      <label style="font-size:0.82rem;display:flex;align-items:center;gap:4px;white-space:nowrap;">
        <input type="checkbox" ${f.required?'checked':''} style="width:auto;"> required
      </label>
      <button class="btn danger small" data-act="rm">✕</button>
    `;
    const [keyEl, labelEl, typeEl] = row.querySelectorAll('input[type="text"], select');
    const reqEl = row.querySelector('input[type="checkbox"]');
    keyEl.oninput   = () => edit(() => f.field = keyEl.value.trim());
    labelEl.oninput = () => edit(() => f.label = labelEl.value);
    typeEl.onchange = () => edit(() => f.type = typeEl.value);
    reqEl.onchange  = () => edit(() => f.required = reqEl.checked);
    row.querySelector('[data-act="rm"]').onclick = () =>
      edit(() => lc.fields.splice(i, 1), renderLeadCapture);
    list.appendChild(row);
  });

  document.getElementById('addLeadFieldBtn').onclick = () => {
    edit(() => lc.fields.push({ field: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false }),
      renderLeadCapture);
  };
}

// ---------- RENDER: SERVICES ----------
function renderServices() {
  const list = document.getElementById('servicesList');
  list.innerHTML = '';

  if (!config.services || !config.services.length) {
    list.innerHTML = '<div class="empty-state">No services yet. Add one to get started.</div>';
  } else {
    config.services.forEach((svc, idx) => {
      list.appendChild(buildServiceCard(svc, idx));
    });
  }

  document.getElementById('addServiceBtn').onclick = () => {
    edit(() => {
      config.services.push({
        id: `svc_${Date.now()}`,
        label: 'New Service',
        description: '',
        inputs: [],
        pricing: { type: 'flat', amount: 100 }
      });
    }, renderServices);
  };
}

function buildServiceCard(svc, idx) {
  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <div class="card-header">
      <span class="grip" title="Reorder">⋮⋮</span>
      <h2>${escapeHtml(svc.label || 'Untitled service')}</h2>
      <div class="inline-actions">
        <button class="btn subtle small" data-act="up">↑</button>
        <button class="btn subtle small" data-act="down">↓</button>
        <button class="btn danger small" data-act="remove">Delete</button>
      </div>
    </div>

    <div class="field-row">
      <div class="field">
        <label class="lbl">Service ID <span style="text-transform:none;color:var(--muted);">(internal, no spaces)</span></label>
        <input type="text" data-f="id" value="${escapeAttr(svc.id)}">
      </div>
      <div class="field">
        <label class="lbl">Customer label</label>
        <input type="text" data-f="label" value="${escapeAttr(svc.label)}">
      </div>
    </div>
    <div class="field">
      <label class="lbl">Description <span style="text-transform:none;color:var(--muted);">(shown as subtitle)</span></label>
      <input type="text" data-f="description" value="${escapeAttr(svc.description || '')}">
    </div>

    <details open>
      <summary>Customer inputs (${(svc.inputs||[]).length})</summary>
      <div class="inputs-container" data-container="inputs"></div>
      <button class="btn subtle small" data-act="add-input" style="margin-top:6px;">+ Add input field</button>
    </details>

    <div class="pricing-section">
      <h3>Pricing formula</h3>
      <div class="pricing-type-switch" data-pricing-switch></div>
      <div data-pricing-body></div>
    </div>
  `;

  // Wire header actions
  card.querySelector('[data-act="up"]').onclick = () => {
    if (idx === 0) return;
    edit(() => {
      [config.services[idx-1], config.services[idx]] = [config.services[idx], config.services[idx-1]];
    }, renderServices);
  };
  card.querySelector('[data-act="down"]').onclick = () => {
    if (idx === config.services.length - 1) return;
    edit(() => {
      [config.services[idx+1], config.services[idx]] = [config.services[idx], config.services[idx+1]];
    }, renderServices);
  };
  card.querySelector('[data-act="remove"]').onclick = () => {
    if (!confirm(`Delete "${svc.label}"?`)) return;
    edit(() => config.services.splice(idx, 1), renderServices);
  };

  // Wire text fields
  card.querySelectorAll('[data-f]').forEach(input => {
    input.oninput = () => {
      edit(() => {
        svc[input.dataset.f] = input.value;
      });
      // Update the visible card header without re-rendering everything
      if (input.dataset.f === 'label') {
        card.querySelector('.card-header h2').textContent = input.value || 'Untitled service';
      }
    };
  });

  // Inputs sub-section
  renderInputsList(card, svc);
  card.querySelector('[data-act="add-input"]').onclick = () => {
    edit(() => {
      svc.inputs = svc.inputs || [];
      svc.inputs.push({
        field: `field_${Date.now()}`,
        label: 'New Field',
        type: 'number'
      });
    }, () => renderInputsList(card, svc));
  };

  // Pricing sub-section
  renderPricingEditor(card, svc);

  return card;
}

function renderInputsList(card, svc) {
  const container = card.querySelector('[data-container="inputs"]');
  container.innerHTML = '';
  (svc.inputs || []).forEach((inp, i) => {
    const row = document.createElement('div');
    row.className = 'input-row';
    row.innerHTML = `
      <input type="text" placeholder="Field key"   value="${escapeAttr(inp.field)}" data-k="field">
      <input type="text" placeholder="Label"       value="${escapeAttr(inp.label)}" data-k="label">
      <select data-k="type">
        <option value="number" ${inp.type==='number'?'selected':''}>Number</option>
        <option value="text"   ${inp.type==='text'?'selected':''}>Text</option>
        <option value="select" ${inp.type==='select'?'selected':''}>Dropdown</option>
      </select>
      <button class="btn danger small" data-act="rm">✕</button>
    `;
    row.querySelectorAll('[data-k]').forEach(el => {
      el.oninput = el.onchange = () => {
        edit(() => {
          inp[el.dataset.k] = el.value;
          // Switching to/from select: add/remove options array
          if (el.dataset.k === 'type') {
            if (el.value === 'select' && !inp.options) inp.options = [{value:'', label:''}];
            if (el.value !== 'select') delete inp.options;
            renderInputsList(card, svc);
          }
        });
      };
    });
    row.querySelector('[data-act="rm"]').onclick = () => {
      edit(() => svc.inputs.splice(i, 1), () => renderInputsList(card, svc));
    };
    container.appendChild(row);

    // Dropdown options sub-editor
    if (inp.type === 'select') {
      const opts = inp.options || (inp.options = []);
      const optsWrap = document.createElement('div');
      optsWrap.style.cssText = 'grid-column: 1 / -1; padding-left: 18px; border-left: 2px solid var(--line); margin-top: 6px;';
      optsWrap.innerHTML = '<label class="lbl">Dropdown options</label>';
      opts.forEach((o, oi) => {
        const optRow = document.createElement('div');
        optRow.className = 'option-row';
        optRow.innerHTML = `
          <input type="text" placeholder="Value" value="${escapeAttr(o.value)}" data-k="value">
          <input type="text" placeholder="Label shown to customer" value="${escapeAttr(o.label)}" data-k="label">
          <button class="btn danger small" data-act="rm">✕</button>
        `;
        optRow.querySelectorAll('[data-k]').forEach(el => {
          el.oninput = () => edit(() => { o[el.dataset.k] = el.value; });
        });
        optRow.querySelector('[data-act="rm"]').onclick = () => {
          edit(() => opts.splice(oi, 1), () => renderInputsList(card, svc));
        };
        optsWrap.appendChild(optRow);
      });
      const addOptBtn = document.createElement('button');
      addOptBtn.className = 'btn subtle small';
      addOptBtn.textContent = '+ Add option';
      addOptBtn.onclick = () => {
        edit(() => opts.push({value:'', label:''}), () => renderInputsList(card, svc));
      };
      optsWrap.appendChild(addOptBtn);
      container.appendChild(optsWrap);
    }
  });
}

// ---------- PRICING EDITOR ----------
const PRICING_TYPES = [
  { key: 'flat',     label: 'Flat price' },
  { key: 'per_unit', label: 'Per unit (rate × qty)' },
  { key: 'tiered',   label: 'Tiered by size' },
  { key: 'matrix',   label: 'Matrix (multi-factor)' }
];

function renderPricingEditor(card, svc) {
  const switchEl = card.querySelector('[data-pricing-switch]');
  const bodyEl   = card.querySelector('[data-pricing-body]');

  const renderSwitch = () => {
    switchEl.innerHTML = '';
    PRICING_TYPES.forEach(pt => {
      const btn = document.createElement('button');
      btn.textContent = pt.label;
      if (svc.pricing.type === pt.key) btn.classList.add('active');
      btn.onclick = () => {
        if (svc.pricing.type === pt.key) return;
        edit(() => {
          svc.pricing = makeDefaultPricing(pt.key, svc);
        }, () => renderPricingEditor(card, svc));
      };
      switchEl.appendChild(btn);
    });
  };

  const renderBody = () => {
    bodyEl.innerHTML = '';
    const p = svc.pricing;
    switch (p.type) {
      case 'flat':     renderFlatEditor(bodyEl, svc); break;
      case 'per_unit': renderPerUnitEditor(bodyEl, svc); break;
      case 'tiered':   renderTieredEditor(bodyEl, svc); break;
      case 'matrix':   renderMatrixEditor(bodyEl, svc); break;
    }
  };

  renderSwitch();
  renderBody();
}

function makeDefaultPricing(type, svc) {
  switch (type) {
    case 'flat': return { type, amount: 100 };
    case 'per_unit':
      return {
        type,
        inputField: (svc.inputs?.[0]?.field) || 'size',
        rate: 1
      };
    case 'tiered':
      return {
        type,
        inputField: (svc.inputs?.[0]?.field) || 'size',
        tiers: [
          { max: 1000, price: 200 },
          { max: 2000, price: 300 }
        ]
      };
    case 'matrix':
      return {
        type,
        dimensions: [],
        prices: {}
      };
  }
}

function renderFlatEditor(body, svc) {
  const p = svc.pricing;
  body.innerHTML = `
    <div class="info-box">One fixed price when this service is selected.</div>
    <div class="field" style="max-width:200px;">
      <label class="lbl">Price</label>
      <input type="number" step="0.01" value="${p.amount || 0}">
    </div>
  `;
  body.querySelector('input').oninput = (e) => edit(() => {
    p.amount = parseFloat(e.target.value) || 0;
  });
}

function renderPerUnitEditor(body, svc) {
  const p = svc.pricing;
  const numberInputs = (svc.inputs||[]).filter(i => i.type === 'number');
  const selectInputs = (svc.inputs||[]).filter(i => i.type === 'select');

  body.innerHTML = `
    <div class="info-box">Price = <code>rate × quantity</code>. You can also add multipliers (from a dropdown) or additive extras (a second number field, like deck railing length).</div>
    <div class="field-row">
      <div class="field">
        <label class="lbl">Quantity input</label>
        <select data-k="inputField">
          ${numberInputs.map(i =>
            `<option value="${escapeAttr(i.field)}" ${p.inputField===i.field?'selected':''}>${escapeHtml(i.label)} (${escapeHtml(i.field)})</option>`
          ).join('')}
        </select>
      </div>
      <div class="field">
        <label class="lbl">Rate per unit</label>
        <input type="number" step="0.01" value="${p.rate || 0}" data-k="rate">
      </div>
    </div>

    <h3 style="margin-top:16px;">Dropdown multipliers (optional)</h3>
    <div data-multipliers></div>
    <button class="btn subtle small" data-act="add-mult">+ Add multiplier</button>

    <h3 style="margin-top:16px;">Additive extras (optional)</h3>
    <div data-extras></div>
    <button class="btn subtle small" data-act="add-extra">+ Add extra</button>
  `;

  body.querySelector('[data-k="inputField"]').onchange = (e) => edit(() => p.inputField = e.target.value);
  body.querySelector('[data-k="rate"]').oninput       = (e) => edit(() => p.rate = parseFloat(e.target.value) || 0);

  // Multipliers
  const multWrap = body.querySelector('[data-multipliers]');
  (p.multipliers || []).forEach((m, mi) => {
    const src = selectInputs.find(i => i.field === m.field);
    const row = document.createElement('div');
    row.style.cssText = 'background:white; border:1px solid var(--line); padding:10px; border-radius:6px; margin-bottom:6px;';
    row.innerHTML = `
      <div class="field-row">
        <div class="field">
          <label class="lbl">Dropdown field</label>
          <select data-k="field">
            <option value="">— choose —</option>
            ${selectInputs.map(i =>
              `<option value="${escapeAttr(i.field)}" ${m.field===i.field?'selected':''}>${escapeHtml(i.label)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="field"><button class="btn danger small" data-act="rm">Remove multiplier</button></div>
      </div>
      <div data-values></div>
    `;
    row.querySelector('[data-k="field"]').onchange = (e) => {
      edit(() => { m.field = e.target.value; m.values = m.values || {}; }, () => renderPricingEditor(multWrap.closest('.card'), svc));
    };
    row.querySelector('[data-act="rm"]').onclick = () => {
      edit(() => p.multipliers.splice(mi, 1), () => renderPricingEditor(multWrap.closest('.card'), svc));
    };
    // Values sub-table
    const valWrap = row.querySelector('[data-values]');
    if (src && m.values) {
      valWrap.innerHTML = '<label class="lbl" style="margin-top:6px;">Multiplier per option</label>';
      src.options.forEach(o => {
        const vr = document.createElement('div');
        vr.className = 'option-row';
        vr.style.gridTemplateColumns = '1fr 1fr';
        vr.innerHTML = `
          <span style="font-size:0.88rem;">${escapeHtml(o.label)} <code style="font-size:0.76rem;color:var(--muted);">(${escapeHtml(o.value)})</code></span>
          <input type="number" step="0.01" value="${m.values[o.value] ?? 1}" placeholder="1.0">
        `;
        vr.querySelector('input').oninput = (e) => edit(() => {
          m.values[o.value] = parseFloat(e.target.value) || 0;
        });
        valWrap.appendChild(vr);
      });
    }
    multWrap.appendChild(row);
  });
  body.querySelector('[data-act="add-mult"]').onclick = () => {
    edit(() => {
      p.multipliers = p.multipliers || [];
      p.multipliers.push({ field: '', values: {} });
    }, () => renderPricingEditor(body.closest('.card'), svc));
  };

  // Extras
  const extraWrap = body.querySelector('[data-extras]');
  (p.extras || []).forEach((ex, ei) => {
    const row = document.createElement('div');
    row.className = 'option-row';
    row.style.gridTemplateColumns = '2fr 1fr auto';
    row.innerHTML = `
      <select>
        <option value="">— choose field —</option>
        ${numberInputs.map(i =>
          `<option value="${escapeAttr(i.field)}" ${ex.field===i.field?'selected':''}>${escapeHtml(i.label)}</option>`
        ).join('')}
      </select>
      <input type="number" step="0.01" value="${ex.rate || 0}" placeholder="Rate">
      <button class="btn danger small" data-act="rm">✕</button>
    `;
    const [selEl, rateEl] = row.querySelectorAll('select, input');
    selEl.onchange = (e) => edit(() => ex.field = e.target.value);
    rateEl.oninput = (e) => edit(() => ex.rate = parseFloat(e.target.value) || 0);
    row.querySelector('[data-act="rm"]').onclick = () => {
      edit(() => p.extras.splice(ei, 1), () => renderPricingEditor(body.closest('.card'), svc));
    };
    extraWrap.appendChild(row);
  });
  body.querySelector('[data-act="add-extra"]').onclick = () => {
    edit(() => { p.extras = p.extras || []; p.extras.push({ field: '', rate: 0 }); },
      () => renderPricingEditor(body.closest('.card'), svc));
  };
}

function renderTieredEditor(body, svc) {
  const p = svc.pricing;
  const numberInputs = (svc.inputs||[]).filter(i => i.type === 'number');
  body.innerHTML = `
    <div class="info-box">Pick a size range and charge a flat price for that tier.</div>
    <div class="field" style="max-width:280px;">
      <label class="lbl">Size input</label>
      <select data-k="inputField">
        ${numberInputs.map(i =>
          `<option value="${escapeAttr(i.field)}" ${p.inputField===i.field?'selected':''}>${escapeHtml(i.label)}</option>`
        ).join('')}
      </select>
    </div>
    <label class="lbl" style="margin-top:8px;">Tiers (price for "up to this max")</label>
    <div data-tiers></div>
    <button class="btn subtle small" data-act="add-tier">+ Add tier</button>
  `;

  body.querySelector('[data-k="inputField"]').onchange = (e) => edit(() => p.inputField = e.target.value);
  const tWrap = body.querySelector('[data-tiers]');
  (p.tiers || []).forEach((t, ti) => {
    const row = document.createElement('div');
    row.className = 'tier-row';
    row.innerHTML = `
      <input type="number" placeholder="Max size" value="${t.max ?? ''}">
      <input type="number" step="0.01" placeholder="Price" value="${t.price ?? ''}">
      <button class="btn danger small" data-act="rm">✕</button>
    `;
    const [maxEl, priceEl] = row.querySelectorAll('input');
    maxEl.oninput   = (e) => edit(() => t.max   = parseFloat(e.target.value) || 0);
    priceEl.oninput = (e) => edit(() => t.price = parseFloat(e.target.value) || 0);
    row.querySelector('[data-act="rm"]').onclick = () => {
      edit(() => p.tiers.splice(ti, 1), () => renderPricingEditor(body.closest('.card'), svc));
    };
    tWrap.appendChild(row);
  });
  body.querySelector('[data-act="add-tier"]').onclick = () => {
    edit(() => { p.tiers = p.tiers || []; p.tiers.push({ max: 0, price: 0 }); },
      () => renderPricingEditor(body.closest('.card'), svc));
  };
}

function renderMatrixEditor(body, svc) {
  const p = svc.pricing;
  p.dimensions = p.dimensions || [];
  p.prices     = p.prices     || {};
  p.aliases    = p.aliases    || {};

  body.innerHTML = `
    <div class="info-box">
      For when price depends on multiple factors combined — like the original house pricing where floors × material × size all mattered.
      <br><br>
      <strong>How it works:</strong> Add each factor as a "dimension". The grid below will generate every combination. Fill in a price for each combo.
    </div>
    <h3>Dimensions</h3>
    <div data-dims></div>
    <button class="btn subtle small" data-act="add-dim">+ Add dimension</button>
    <h3 style="margin-top:18px;">Price grid</h3>
    <div data-grid></div>
  `;

  const dimsWrap = body.querySelector('[data-dims]');
  const gridWrap = body.querySelector('[data-grid]');

  const renderDims = () => {
    dimsWrap.innerHTML = '';
    p.dimensions.forEach((dim, di) => {
      const box = document.createElement('div');
      box.style.cssText = 'background:white; border:1px solid var(--line); padding:12px; border-radius:6px; margin-bottom:6px;';
      box.innerHTML = `
        <div class="field-row">
          <div class="field">
            <label class="lbl">Input field</label>
            <select data-k="field">
              ${(svc.inputs||[]).map(i =>
                `<option value="${escapeAttr(i.field)}" ${dim.field===i.field?'selected':''}>${escapeHtml(i.label)} (${escapeHtml(i.type)})</option>`
              ).join('')}
            </select>
          </div>
          <div class="field">
            <label class="lbl">Dimension kind</label>
            <select data-k="type">
              <option value="" ${!dim.type?'selected':''}>Match exact value</option>
              <option value="range" ${dim.type==='range'?'selected':''}>Group by size range</option>
            </select>
          </div>
          <div class="field">
            <label class="lbl">&nbsp;</label>
            <button class="btn danger small" data-act="rm">Remove dimension</button>
          </div>
        </div>
        <div data-detail></div>
      `;
      box.querySelector('[data-k="field"]').onchange = (e) => {
        edit(() => dim.field = e.target.value, renderAfterDimChange);
      };
      box.querySelector('[data-k="type"]').onchange = (e) => {
        edit(() => {
          dim.type = e.target.value || undefined;
          if (dim.type === 'range' && !dim.ranges) dim.ranges = [{max:1000,key:'a'},{max:2000,key:'b'}];
          if (!dim.type) delete dim.ranges;
        }, renderAfterDimChange);
      };
      box.querySelector('[data-act="rm"]').onclick = () => {
        edit(() => p.dimensions.splice(di, 1), renderAfterDimChange);
      };

      // Detail area for ranges
      const detailEl = box.querySelector('[data-detail]');
      if (dim.type === 'range') {
        detailEl.innerHTML = '<label class="lbl" style="margin-top:8px;">Ranges</label>';
        (dim.ranges || []).forEach((r, ri) => {
          const rr = document.createElement('div');
          rr.className = 'option-row';
          rr.style.gridTemplateColumns = '1fr 1fr auto';
          rr.innerHTML = `
            <input type="number" value="${r.max}" placeholder="Max value">
            <input type="text"   value="${escapeAttr(r.key)}" placeholder="Short key (a, b, c...)" maxlength="6">
            <button class="btn danger small" data-act="rm-range">✕</button>
          `;
          const [maxEl, keyEl] = rr.querySelectorAll('input');
          maxEl.oninput = (e) => edit(() => r.max = parseFloat(e.target.value) || 0, renderGrid);
          keyEl.oninput = (e) => edit(() => r.key = e.target.value.trim(), renderGrid);
          rr.querySelector('[data-act="rm-range"]').onclick = () => {
            edit(() => dim.ranges.splice(ri, 1), renderAfterDimChange);
          };
          detailEl.appendChild(rr);
        });
        const addRangeBtn = document.createElement('button');
        addRangeBtn.className = 'btn subtle small';
        addRangeBtn.textContent = '+ Add range';
        addRangeBtn.onclick = () => {
          edit(() => dim.ranges.push({max:0, key:String.fromCharCode(97+dim.ranges.length)}), renderAfterDimChange);
        };
        detailEl.appendChild(addRangeBtn);
      } else {
        // Show aliases option for non-range dimensions
        // (skip for simplicity — advanced users can edit JSON)
      }

      dimsWrap.appendChild(box);
    });
  };

  const renderGrid = () => {
    gridWrap.innerHTML = '';
    // Collect the keyspace for each dimension
    const dimKeys = p.dimensions.map(d => {
      if (d.type === 'range') return (d.ranges || []).map(r => r.key).filter(Boolean);
      // For exact-match, look up the input's options
      const src = (svc.inputs || []).find(i => i.field === d.field);
      if (!src) return [];
      if (src.type === 'select') return src.options.map(o => o.value);
      return [];
    });

    if (!dimKeys.length || dimKeys.some(k => !k.length)) {
      gridWrap.innerHTML = '<div class="empty-state" style="padding:20px;">Add at least one dimension with valid values to see the price grid.</div>';
      return;
    }

    // Build every combination
    const combos = cartesian(dimKeys);
    const t = document.createElement('table');
    t.className = 'matrix-table';
    const header = p.dimensions.map(d => `<th>${escapeHtml(d.field)}</th>`).join('') + '<th>Price</th>';
    t.innerHTML = `<thead><tr>${header}</tr></thead><tbody></tbody>`;
    const tbody = t.querySelector('tbody');

    combos.forEach(combo => {
      const key = combo.join('|');
      const tr = document.createElement('tr');
      tr.innerHTML = combo.map(c => `<td>${escapeHtml(c)}</td>`).join('') +
        `<td style="width:140px;"><input type="number" step="0.01" value="${p.prices[key] ?? ''}" placeholder="0.00"></td>`;
      const input = tr.querySelector('input');
      input.oninput = (e) => edit(() => {
        const v = parseFloat(e.target.value);
        if (isNaN(v) || v === 0) delete p.prices[key];
        else p.prices[key] = v;
      });
      tbody.appendChild(tr);
    });

    gridWrap.appendChild(t);

    // Show count + warning if huge
    const info = document.createElement('p');
    info.style.cssText = 'color:var(--muted); font-size:0.82rem; margin-top:8px;';
    info.textContent = `${combos.length} combinations. Leave a cell blank to exclude that combo.`;
    gridWrap.appendChild(info);
  };

  const renderAfterDimChange = () => { renderDims(); renderGrid(); };

  body.querySelector('[data-act="add-dim"]').onclick = () => {
    edit(() => p.dimensions.push({ field: (svc.inputs?.[0]?.field) || '' }), renderAfterDimChange);
  };

  renderDims();
  renderGrid();
}

function cartesian(arrays) {
  return arrays.reduce((acc, curr) => {
    const out = [];
    for (const a of acc) for (const b of curr) out.push([...a, b]);
    return out;
  }, [[]]);
}

// ---------- DISCOUNTS ----------
function renderDiscounts() {
  const wrap = document.getElementById('discountsList');
  wrap.innerHTML = '';
  config.discounts = config.discounts || [];
  config.discounts.forEach((d, i) => {
    const row = document.createElement('div');
    row.className = 'option-row';
    row.style.gridTemplateColumns = '1fr 1fr 2fr auto';
    row.innerHTML = `
      <div>
        <label class="lbl">Min services</label>
        <input type="number" min="1" value="${d.minServices ?? 2}">
      </div>
      <div>
        <label class="lbl">Discount %</label>
        <input type="number" min="0" max="100" step="0.5" value="${(d.pct ?? 0) * 100}">
      </div>
      <div>
        <label class="lbl">Label</label>
        <input type="text" value="${escapeAttr(d.label || '')}">
      </div>
      <div style="align-self:end;"><button class="btn danger small">✕</button></div>
    `;
    const [minEl, pctEl, labelEl] = row.querySelectorAll('input');
    minEl.oninput   = (e) => edit(() => d.minServices = parseInt(e.target.value) || 0);
    pctEl.oninput   = (e) => edit(() => d.pct = (parseFloat(e.target.value) || 0) / 100);
    labelEl.oninput = (e) => edit(() => d.label = e.target.value);
    row.querySelector('button').onclick = () =>
      edit(() => config.discounts.splice(i, 1), renderDiscounts);
    wrap.appendChild(row);
  });
}

// ---------- PACKAGES ----------
function renderPackages() {
  const wrap = document.getElementById('packagesList');
  wrap.innerHTML = '';
  config.packages = config.packages || [];
  config.packages.forEach((pkg, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'background:var(--paper); border-radius:6px; padding:12px; margin-bottom:8px;';
    row.innerHTML = `
      <div class="field-row">
        <div class="field"><label class="lbl">Package ID</label><input type="text" value="${escapeAttr(pkg.id)}"></div>
        <div class="field"><label class="lbl">Label</label><input type="text" value="${escapeAttr(pkg.label)}"></div>
        <div class="field" style="align-self:end;"><button class="btn danger small">Remove</button></div>
      </div>
      <label class="lbl">Services in this package</label>
      <div class="services-checks"></div>
    `;
    const [idEl, labelEl] = row.querySelectorAll('input[type="text"]');
    idEl.oninput    = (e) => edit(() => pkg.id = e.target.value.trim());
    labelEl.oninput = (e) => edit(() => pkg.label = e.target.value);
    row.querySelector('button').onclick = () =>
      edit(() => config.packages.splice(i, 1), renderPackages);

    const checksWrap = row.querySelector('.services-checks');
    checksWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
    pkg.services = pkg.services || [];
    (config.services || []).forEach(svc => {
      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:inline-flex;align-items:center;gap:5px;background:white;padding:6px 10px;border-radius:6px;border:1px solid var(--line);font-size:0.85rem;cursor:pointer;';
      const checked = pkg.services.includes(svc.id) ? 'checked' : '';
      lbl.innerHTML = `<input type="checkbox" ${checked}> ${escapeHtml(svc.label)}`;
      lbl.querySelector('input').onchange = (e) => edit(() => {
        if (e.target.checked) { if (!pkg.services.includes(svc.id)) pkg.services.push(svc.id); }
        else pkg.services = pkg.services.filter(s => s !== svc.id);
      });
      checksWrap.appendChild(lbl);
    });
    wrap.appendChild(row);
  });
}

function wireAddButtons() {
  document.getElementById('addDiscountBtn').onclick = () => {
    edit(() => config.discounts.push({ minServices: 2, pct: 0.05, label: '5% off' }), renderDiscounts);
  };
  document.getElementById('addPackageBtn').onclick = () => {
    edit(() => config.packages.push({ id: `pkg_${Date.now()}`, label: 'New Package', services: [] }), renderPackages);
  };
}

// ---------- EXPORT / PREVIEW ----------
function populateExport() {
  document.getElementById('exportJson').value = JSON.stringify(config, null, 2);
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'config.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Downloaded config.json', 'ok');
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    toast('Copied to clipboard', 'ok');
  } catch {
    toast('Copy failed — select and copy manually', 'err');
  }
}

function refreshPreview() {
  const frame = document.getElementById('previewFrame');
  if (frame) frame.src = frame.src.split('#')[0] + '#' + Date.now();
}

// ---------- UTIL ----------
function toast(msg, kind='') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + kind;
  setTimeout(() => el.className = 'toast ' + kind, 2200);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

init();
