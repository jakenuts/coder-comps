/*
 * PlanetPulse architecture (client-only, no build step)
 * ----------------------------------------------------
 * data.js section: hard-coded dataset of cities with multiple metrics; METRICS config describes how to read & display each metric.
 * scene.js section: builds Three.js renderer, camera, controls, and the ThreeGlobe instance; handles resize, spin loop, and user interaction.
 * ui.js section: wires controls (metric select, spin toggle, reset, time slider/playback), legend rendering, status messaging, and detail panel updates.
 * resilience: wraps globe creation in try/catch; graceful message if WebGL or assets fail; keeps UI usable with static content.
 * trade-offs: uses CDN textures & three-globe for speed; dataset is small for clarity; point-based overlay (no choropleth) to stay performant without build tools.
 */

// ---------------------- data.js ----------------------
const TIMELINE_YEARS = [2010, 2015, 2020, 2024];

const DATA_POINTS = [
  { name: 'New York, USA', lat: 40.7128, lon: -74.006, co2Series: [15.2, 14.8, 14.1, 13.4], renewableSeries: [24, 26, 32, 38], gdp: 82500, population: 19.6 },
  { name: 'London, UK', lat: 51.5072, lon: -0.1276, co2Series: [6.3, 6.0, 5.8, 5.5], renewableSeries: [30, 35, 44, 52], gdp: 56500, population: 14.3 },
  { name: 'Tokyo, Japan', lat: 35.6764, lon: 139.65, co2Series: [9.8, 9.4, 9.2, 9.1], renewableSeries: [12, 15, 18, 24], gdp: 60500, population: 37.5 },
  { name: 'São Paulo, Brazil', lat: -23.55, lon: -46.633, co2Series: [2.9, 2.8, 2.7, 2.6], renewableSeries: [78, 80, 82, 83], gdp: 21500, population: 22 },
  { name: 'Lagos, Nigeria', lat: 6.5244, lon: 3.3792, co2Series: [0.7, 0.65, 0.62, 0.6], renewableSeries: [30, 32, 34, 36], gdp: 5200, population: 21 },
  { name: 'Cairo, Egypt', lat: 30.0444, lon: 31.2357, co2Series: [2.7, 2.6, 2.55, 2.5], renewableSeries: [9, 10, 11, 12], gdp: 13100, population: 20.9 },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093, co2Series: [16.2, 15.8, 15.5, 15.2], renewableSeries: [18, 23, 28, 32], gdp: 57500, population: 5.3 },
  { name: 'Toronto, Canada', lat: 43.6532, lon: -79.3832, co2Series: [13.1, 12.9, 12.6, 12.3], renewableSeries: [54, 58, 61, 65], gdp: 63000, population: 6.3 },
  { name: 'Delhi, India', lat: 28.7041, lon: 77.1025, co2Series: [1.6, 1.7, 1.8, 1.9], renewableSeries: [17, 19, 21, 23], gdp: 9300, population: 30.3 },
  { name: 'Paris, France', lat: 48.8566, lon: 2.3522, co2Series: [5.1, 4.9, 4.7, 4.5], renewableSeries: [43, 45, 49, 51], gdp: 56500, population: 11.2 },
  { name: 'Johannesburg, South Africa', lat: -26.2041, lon: 28.0473, co2Series: [8.4, 8.2, 8.0, 7.8], renewableSeries: [7, 8, 10, 11], gdp: 15200, population: 5.8 },
  { name: 'Beijing, China', lat: 39.9042, lon: 116.4074, co2Series: [9.7, 9.4, 9.1, 8.9], renewableSeries: [18, 21, 25, 28], gdp: 33000, population: 21.5 },
  { name: 'Reykjavík, Iceland', lat: 64.1466, lon: -21.9426, co2Series: [7.2, 7.0, 6.9, 6.8], renewableSeries: [97, 98, 99, 99], gdp: 70400, population: 0.13 },
  { name: 'Dubai, UAE', lat: 25.2048, lon: 55.2708, co2Series: [24.2, 24.0, 23.7, 23.5], renewableSeries: [5, 6, 8, 9], gdp: 43000, population: 3.6 }
];

const METRICS = {
  co2: {
    label: 'CO₂ per capita',
    unit: 't',
    accessor: d => d.co2Series,
    description: 'Tons of CO₂ emitted per person annually.',
    palette: ['#3b82f6', '#f97316', '#ef4444'],
    seriesKey: 'co2Series'
  },
  renewable: {
    label: 'Renewable share',
    unit: '%',
    accessor: d => d.renewableSeries,
    description: 'Percent of electricity from renewables.',
    palette: ['#0ea5e9', '#22c55e', '#84cc16'],
    seriesKey: 'renewableSeries'
  },
  gdp: {
    label: 'GDP per capita',
    unit: '$',
    accessor: d => d.gdp,
    description: 'GDP per person (USD, nominal).',
    palette: ['#a855f7', '#f59e0b', '#f97316']
  }
};

// ---------------------- utilities ----------------------
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function computeExtent(arr, accessor) {
  let min = Infinity, max = -Infinity;
  arr.forEach(item => {
    const val = accessor(item);
    if (Number.isFinite(val)) {
      min = Math.min(min, val);
      max = Math.max(max, val);
    }
  });
  if (min === Infinity || max === -Infinity) return [0, 1];
  if (min === max) return [min - 0.5, max + 0.5];
  return [min, max];
}

function lerpColor(a, b, t) {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const ar = (ca >> 16) & 255, ag = (ca >> 8) & 255, ab = ca & 255;
  const br = (cb >> 16) & 255, bg = (cb >> 8) & 255, bb = cb & 255;
  const rFinal = Math.round(ar + (br - ar) * t);
  const gFinal = Math.round(ag + (bg - ag) * t);
  const bFinal = Math.round(ab + (bb - ab) * t);
  return `rgb(${rFinal}, ${gFinal}, ${bFinal})`;
}

function makeColorScale(palette) {
  return value => {
    if (!Number.isFinite(value)) return '#ffffff';
    const [a, b, c] = palette;
    const mid = 0.5;
    const t = clamp(value, 0, 1);
    if (t < mid) return lerpColor(a, b, t / mid);
    return lerpColor(b, c, (t - mid) / (1 - mid));
  };
}

// ---------------------- scene.js ----------------------
let renderer, camera, scene, controls, globe;
let autoRotate = true;
let isUserInteracting = false;
let currentMetricKey = 'co2';
let colorScale = makeColorScale(METRICS[currentMetricKey].palette);
let valueExtent = [0, 1];
let currentYearIndex = TIMELINE_YEARS.length - 1;
let playTimer = null;

let globeContainer, legendEl, statusEl, selectEl, spinBtn, resetBtn, playBtn, yearSlider, yearDisplay, detailEl, summaryEl;

// Wait for DOM and scripts to be fully loaded
window.addEventListener('DOMContentLoaded', () => {
  // Give time for external scripts to fully initialize
  setTimeout(() => {
  globeContainer = document.getElementById('globeContainer');
  legendEl = document.getElementById('legend');
  statusEl = document.getElementById('status');
  selectEl = document.getElementById('metricSelect');
  spinBtn = document.getElementById('spinToggle');
  resetBtn = document.getElementById('resetView');
  playBtn = document.getElementById('timePlay');
  yearSlider = document.getElementById('yearSlider');
  yearDisplay = document.getElementById('yearDisplay');
  detailEl = document.getElementById('detailCard');
  summaryEl = document.getElementById('metricSummary');
  
  yearSlider.max = TIMELINE_YEARS.length - 1;
  yearSlider.value = currentYearIndex;
  
  // Check if required libraries are loaded
  if (typeof THREE === 'undefined' || typeof ThreeGlobe === 'undefined') {
    console.error('Required libraries not loaded. THREE:', typeof THREE, 'ThreeGlobe:', typeof ThreeGlobe);
    globeContainer.innerHTML = '<div class="fallback">Loading libraries failed. Please refresh the page.</div>';
    return;
  }
  
  init();
  }, 100); // Small delay to ensure all scripts are parsed
});

function init() {
  populateMetricSelect();
  try {
    buildScene();
    applyMetric(currentMetricKey);
    animate();
    setStatus('Globe ready.');
  } catch (err) {
    console.error('Globe initialization error:', err);
    console.error('Stack trace:', err.stack);
    setStatus('Unable to start 3D globe; showing fallback.');
    globeContainer.innerHTML = '<div class="fallback">Error: ' + err.message + '</div>';
  }
  wireUI();
  updateYearUI();
  window.addEventListener('resize', handleResize);
}

function buildScene() {
  const width = globeContainer.clientWidth || globeContainer.parentElement.clientWidth;
  const height = globeContainer.clientHeight || 520;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  globeContainer.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
  camera.position.set(0, 120, 320);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 120;
  controls.maxDistance = 480;
  controls.addEventListener('start', () => { isUserInteracting = true; autoRotate = false; updateSpinButton(); });
  controls.addEventListener('end', () => { isUserInteracting = false; });

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(1, 1, 1);
  scene.add(dir);

  globe = new ThreeGlobe({ animateIn: true })
    .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe@2.24.13/example/img/earth-dark.jpg')
    .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe@2.24.13/example/img/earth-topology.png')
    .atmosphereColor('#6ee7ff')
    .atmosphereAltitude(0.18);

  globe
    .pointAltitude(d => sizeForValue(getMetricValue(d, METRICS[currentMetricKey])))
    .pointColor(d => colorScale(normalizeValue(getMetricValue(d, METRICS[currentMetricKey]))))
    .pointLabel(d => labelForPoint(d));

  globe.onPointHover(handleHover);
  globe.onPointClick(handleClick);

  scene.add(globe);
}

function animate() {
  requestAnimationFrame(animate);
  if (autoRotate && globe) globe.rotation.y += 0.0008;
  controls?.update();
  renderer?.render(scene, camera);
}

function handleResize() {
  if (!renderer || !camera) return;
  const width = globeContainer.clientWidth;
  const height = globeContainer.clientHeight || 520;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// ---------------------- ui.js ----------------------
function populateMetricSelect() {
  Object.entries(METRICS).forEach(([key, cfg]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = cfg.label;
    selectEl.appendChild(opt);
  });
  selectEl.value = currentMetricKey;
}

function wireUI() {
  selectEl.addEventListener('change', e => {
    applyMetric(e.target.value);
  });
  spinBtn.addEventListener('click', () => {
    autoRotate = !autoRotate;
    updateSpinButton();
  });
  resetBtn.addEventListener('click', resetView);
  playBtn.addEventListener('click', toggleTimelinePlay);
  yearSlider.addEventListener('input', () => {
    currentYearIndex = Number(yearSlider.value);
    stopTimelinePlay();
    updateYearUI();
    refreshPoints();
  });
}

function updateSpinButton() {
  spinBtn.textContent = autoRotate ? 'Pause Spin' : 'Resume Spin';
}

function updateYearUI() {
  const year = TIMELINE_YEARS[currentYearIndex];
  yearDisplay.textContent = year;
  yearSlider.value = currentYearIndex;
  playBtn.textContent = playTimer ? 'Pause' : 'Play';
  const metricCfg = METRICS[currentMetricKey];
  const timelineEl = document.querySelector('.timeline');
  const isTemporal = Boolean(metricCfg.seriesKey);
  if (timelineEl) timelineEl.style.display = isTemporal ? 'flex' : 'none';
  yearSlider.disabled = !isTemporal;
  playBtn.disabled = !isTemporal;
}

function toggleTimelinePlay() {
  if (playTimer) {
    stopTimelinePlay();
    return;
  }
  playTimer = setInterval(() => {
    currentYearIndex = (currentYearIndex + 1) % TIMELINE_YEARS.length;
    updateYearUI();
    refreshPoints();
  }, 1300);
  updateYearUI();
}

function stopTimelinePlay() {
  if (!playTimer) return;
  clearInterval(playTimer);
  playTimer = null;
  updateYearUI();
}

function resetView() {
  controls.reset();
  camera.position.set(0, 120, 320);
  autoRotate = true;
  updateSpinButton();
}

function applyMetric(metricKey) {
  currentMetricKey = metricKey;
  const cfg = METRICS[metricKey];
  valueExtent = computeExtent(DATA_POINTS, d => getMetricValue(d, cfg));
  colorScale = makeColorScale(cfg.palette);

  globe
    ?.pointsData(DATA_POINTS)
    .pointColor(d => colorScale(normalizeValue(getMetricValue(d, cfg))))
    .pointAltitude(d => sizeForValue(getMetricValue(d, cfg)));

  updateLegend();
  updateSummary(cfg);
  setStatus(`${cfg.label} loaded.`);
  updateYearUI();
  if (!cfg.seriesKey) stopTimelinePlay();
}

function refreshPoints() {
  const cfg = METRICS[currentMetricKey];
  valueExtent = computeExtent(DATA_POINTS, d => getMetricValue(d, cfg));
  globe
    ?.pointColor(d => colorScale(normalizeValue(getMetricValue(d, cfg))))
    .pointAltitude(d => sizeForValue(getMetricValue(d, cfg)))
    .pointsData(DATA_POINTS);
  updateLegend();
  updateSummary(cfg);
  if (cfg.seriesKey) setStatus(`${cfg.label}: ${TIMELINE_YEARS[currentYearIndex]}`);
}

function normalizeValue(value) {
  const [min, max] = valueExtent;
  if (!Number.isFinite(value)) return 0;
  if (max === min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function sizeForValue(val) {
  if (!Number.isFinite(val)) return 0.02;
  const t = normalizeValue(val);
  return 0.04 + t * 0.08; // keeps points visible but varied
}

function getMetricValue(d, cfg) {
  if (cfg.seriesKey) {
    const series = Array.isArray(d[cfg.seriesKey]) ? d[cfg.seriesKey] : [];
    return series[currentYearIndex] ?? series[series.length - 1];
  }
  return cfg.accessor(d);
}

function labelForPoint(d) {
  const cfg = METRICS[currentMetricKey];
  const val = getMetricValue(d, cfg);
  const formatted = cfg.unit === '$'
    ? `$${val.toLocaleString('en-US')}`
    : `${val}${cfg.unit}`;
  const yearPart = cfg.seriesKey ? ` (${TIMELINE_YEARS[currentYearIndex]})` : '';
  return `${d.name}<br/>${cfg.label}${yearPart}: ${formatted}<br/>Population: ${d.population}M`;
}

function handleHover(point) {
  if (!point) {
    detailEl.classList.add('muted');
    detailEl.innerHTML = 'Hover or tap a city to inspect.';
    return;
  }
  setDetail(point, false);
}

function handleClick(point) {
  if (!point) return;
  setDetail(point, true);
}

function setDetail(point, pinned) {
  const cfg = METRICS[currentMetricKey];
  const val = getMetricValue(point, cfg);
  const formatted = cfg.unit === '$'
    ? `$${val.toLocaleString('en-US')}`
    : `${val}${cfg.unit}`;
  const co2Now = getMetricValue(point, METRICS.co2);
  const renNow = getMetricValue(point, METRICS.renewable);

  detailEl.classList.remove('muted');
  detailEl.innerHTML = `
    <div class="detail-heading">
      <div>
        <div class="label">${pinned ? 'Pinned' : 'Hover'} city</div>
        <h3 style="margin:4px 0">${point.name}</h3>
      </div>
      <span class="pill">${cfg.label}</span>
    </div>
    <div class="data-row"><span>Value${cfg.seriesKey ? ' (' + TIMELINE_YEARS[currentYearIndex] + ')' : ''}</span><span>${formatted}</span></div>
    <div class="data-row"><span>Population</span><span>${point.population}M</span></div>
    <div class="data-row"><span>Renewables (${TIMELINE_YEARS[currentYearIndex]})</span><span>${renNow}%</span></div>
    <div class="data-row"><span>CO₂ (${TIMELINE_YEARS[currentYearIndex]})</span><span>${co2Now}t</span></div>
    <div class="data-row"><span>GDP per capita</span><span>$${point.gdp.toLocaleString('en-US')}</span></div>
  `;
}

function updateLegend() {
  const [min, max] = valueExtent;
  const mid = (min + max) / 2;
  const cfg = METRICS[currentMetricKey];
  const year = cfg.seriesKey ? ` (${TIMELINE_YEARS[currentYearIndex]})` : '';
  legendEl.innerHTML = `
    <div class="label">Legend</div>
    <div>${cfg.label}${year}</div>
    <div class="legend-scale">
      <span>${formatValue(min, cfg.unit)}</span>
      <div class="legend-bar" style="background: linear-gradient(90deg, ${cfg.palette[0]}, ${cfg.palette[1]}, ${cfg.palette[2]});"></div>
      <span>${formatValue(max, cfg.unit)}</span>
    </div>
    <div style="margin-top:6px; color: var(--muted);">Median ~ ${formatValue(mid, cfg.unit)}</div>
  `;
}

function updateSummary(cfg) {
  const [min, max] = valueExtent;
  const year = cfg.seriesKey ? ` (${TIMELINE_YEARS[currentYearIndex]})` : '';
  summaryEl.innerHTML = `${cfg.description}${year}<br><strong>Range:</strong> ${formatValue(min, cfg.unit)} – ${formatValue(max, cfg.unit)}`;
}

function formatValue(val, unit) {
  if (!Number.isFinite(val)) return 'n/a';
  if (unit === '$') return `$${Math.round(val).toLocaleString('en-US')}`;
  return `${Math.round(val * 10) / 10}${unit}`;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}
