/**
 * PlanetPulse Architecture
 * ------------------------
 * DataModel: Curates a small in-memory dataset plus a declarative metricsConfig
 *            used to derive color/size scales and legend content.
 * GlobeRenderer: Bootstraps Three.js (scene, camera, lights, controls) and
 *                renders the Earth sphere with animated rotation + data markers.
 * UIController: Binds DOM controls, updates the legend + detail panel, and
 *               coordinates interaction (hover/click, spin toggle, resize).
 * Limitations: Texture loading is best-effort (falls back to a flat color), and
 *              the dataset is static so no live updates/API pagination.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';

const TEXTURE_URL = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
const CLOUDS_TEXTURE = 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png';

const dataPoints = [
  {
    id: 'nyc',
    name: 'New York City',
    country: 'United States',
    region: 'North America',
    lat: 40.7128,
    lon: -74.006,
    metrics: { population: 19.6, emissions: 165, renewables: 62 },
    footprint: 'Service-heavy economy with aggressive efficiency mandates.',
    category: 'Mega City',
    lastUpdated: '2024-11-01'
  },
  {
    id: 'ldn',
    name: 'London',
    country: 'United Kingdom',
    region: 'Europe',
    lat: 51.5072,
    lon: -0.1276,
    metrics: { population: 9.7, emissions: 91, renewables: 74 },
    footprint: 'Transit-first policies continue to lower per-capita emissions.',
    category: 'Global Hub',
    lastUpdated: '2024-10-21'
  },
  {
    id: 'lag',
    name: 'Lagos',
    country: 'Nigeria',
    region: 'Africa',
    lat: 6.5244,
    lon: 3.3792,
    metrics: { population: 15.3, emissions: 43, renewables: 28 },
    footprint: 'Rapid growth driven by services + light manufacturing.',
    category: 'Emerging City',
    lastUpdated: '2024-09-15'
  },
  {
    id: 'syd',
    name: 'Sydney',
    country: 'Australia',
    region: 'Oceania',
    lat: -33.8688,
    lon: 151.2093,
    metrics: { population: 5.3, emissions: 58, renewables: 58 },
    footprint: 'Grid increasingly powered by renewables + storage.',
    category: 'Coastal City',
    lastUpdated: '2024-08-18'
  },
  {
    id: 'tok',
    name: 'Tokyo',
    country: 'Japan',
    region: 'Asia',
    lat: 35.6762,
    lon: 139.6503,
    metrics: { population: 37.4, emissions: 210, renewables: 42 },
    footprint: 'Dense transit and electrification offset heavy industry output.',
    category: 'Mega City',
    lastUpdated: '2024-11-12'
  },
  {
    id: 'del',
    name: 'Delhi',
    country: 'India',
    region: 'Asia',
    lat: 28.7041,
    lon: 77.1025,
    metrics: { population: 32.9, emissions: 185, renewables: 35 },
    footprint: 'Manufacturing boom with accelerating solar adoption.',
    category: 'Mega City',
    lastUpdated: '2024-07-30'
  },
  {
    id: 'sao',
    name: 'São Paulo',
    country: 'Brazil',
    region: 'South America',
    lat: -23.5558,
    lon: -46.6396,
    metrics: { population: 22.6, emissions: 126, renewables: 55 },
    footprint: 'Biofuels blending policy keeps emissions moderate.',
    category: 'Mega City',
    lastUpdated: '2024-10-04'
  },
  {
    id: 'ber',
    name: 'Berlin',
    country: 'Germany',
    region: 'Europe',
    lat: 52.52,
    lon: 13.405,
    metrics: { population: 3.6, emissions: 32, renewables: 78 },
    footprint: 'District heating upgrades cut baseload demand.',
    category: 'Sustainable City',
    lastUpdated: '2024-06-12'
  },
  {
    id: 'cai',
    name: 'Cairo',
    country: 'Egypt',
    region: 'Africa',
    lat: 30.0444,
    lon: 31.2357,
    metrics: { population: 20.1, emissions: 97, renewables: 30 },
    footprint: 'Energy mix balancing natural gas with solar build-out.',
    category: 'Mega City',
    lastUpdated: '2024-05-28'
  },
  {
    id: 'van',
    name: 'Vancouver',
    country: 'Canada',
    region: 'North America',
    lat: 49.2827,
    lon: -123.1207,
    metrics: { population: 2.8, emissions: 22, renewables: 83 },
    footprint: 'Hydro-backed grid keeps emissions among the lowest.',
    category: 'Sustainable City',
    lastUpdated: '2024-09-02'
  }
];

const metricsConfig = {
  population: {
    label: 'Metro Population',
    unit: 'millions of people',
    colors: ['#4de3ff', '#2043ff'],
    sizeRange: [0.7, 1.8],
    description: 'Estimated metro population (2024, rounded to the nearest 0.1M).',
    formatter: (value) => `${value.toFixed(1)} M`
  },
  emissions: {
    label: 'Annual CO₂ Emissions',
    unit: 'Mt CO₂',
    colors: ['#66ff91', '#ff8c42'],
    sizeRange: [0.6, 1.6],
    description: 'Total territorial emissions attributed to each metro basin.',
    formatter: (value) => `${value.toFixed(0)} Mt`
  },
  renewables: {
    label: 'Renewable Share',
    unit: '% of grid demand',
    colors: ['#32ffba', '#1c8bff'],
    sizeRange: [0.5, 1.4],
    description: 'Share of electricity supplied by renewables (12-month avg).',
    formatter: (value) => `${value.toFixed(0)}%`
  }
};

Object.keys(metricsConfig).forEach((key) => {
  metricsConfig[key].domain = findDomain(key);
});

const state = {
  metricKey: 'population',
  spinning: true,
  userInteracting: false,
  selectedPoint: null
};

const elements = {};

let renderer;
let scene;
let camera;
let controls;
let globeGroup;
let markerGroup;
let raycaster;
let pointer;
let hoveredMarker = null;
let spinVelocity = 0.0008;

const baseMarkerSize = 0.02;
const tooltipOffset = { x: 18, y: 18 };
const tooltipPadding = 12;

let reducedMotionNoticeShown = false;
let motionPreferenceQuery = null;

window.addEventListener('DOMContentLoaded', () => {
  if (!isWebGlAvailable()) {
    const globe = document.getElementById('globe');
    globe.textContent = 'WebGL is unavailable in this browser. Switch to a modern browser to explore the globe.';
    globe.classList.add('globe-fallback');
    return;
  }
  bootstrap();
});

async function bootstrap() {
  cacheDom();
  setupMotionPreference();
  bindUI();
  try {
    initScene();
    await buildGlobe();
    buildMarkers();
    updateMetric(state.metricKey);
    animate();
    showStatus('Globe ready. Drag to explore.', false, 2200);
  } catch (error) {
    console.error('PlanetPulse failed to start', error);
    showStatus('Unable to render globe – please refresh.', true);
  }
}

function cacheDom() {
  elements.globeContainer = document.getElementById('globe');
  elements.metricSelect = document.getElementById('metricSelect');
  elements.spinToggle = document.getElementById('spinToggle');
  elements.resetView = document.getElementById('resetView');
  elements.legendTitle = document.getElementById('legendTitle');
  elements.legendRange = document.getElementById('legendRange');
  elements.legendGradient = document.getElementById('legendGradient');
  elements.legendMin = document.getElementById('legendMin');
  elements.legendMax = document.getElementById('legendMax');
  elements.legendDescription = document.getElementById('legendDescription');
  elements.infoTitle = document.getElementById('infoTitle');
  elements.infoContent = document.getElementById('infoContent');
  elements.statusBanner = document.getElementById('statusBanner');
  elements.summaryGrid = document.getElementById('summaryGrid');
  elements.tooltip = document.getElementById('globeTooltip');
}

function bindUI() {
  elements.metricSelect.addEventListener('change', (event) => {
    updateMetric(event.target.value);
  });

  elements.spinToggle.addEventListener('click', () => {
    state.spinning = !state.spinning;
    syncSpinToggle();
  });

  if (elements.resetView) {
    elements.resetView.addEventListener('click', resetView);
  }

  window.addEventListener('resize', handleResize);
  syncSpinToggle();
}

function setupMotionPreference() {
  if (!window.matchMedia) return;
  motionPreferenceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  handleMotionPreference(motionPreferenceQuery);
  if (motionPreferenceQuery.addEventListener) {
    motionPreferenceQuery.addEventListener('change', handleMotionPreference);
  } else if (motionPreferenceQuery.addListener) {
    motionPreferenceQuery.addListener(handleMotionPreference);
  }
}

function handleMotionPreference(event) {
  if (!event.matches) return;
  if (state.spinning) {
    state.spinning = false;
    syncSpinToggle();
  }
  if (!reducedMotionNoticeShown) {
    showStatus('Spin paused to honor reduced motion preference.', false, 2800);
    reducedMotionNoticeShown = true;
  }
}

function syncSpinToggle() {
  if (!elements.spinToggle) return;
  elements.spinToggle.textContent = state.spinning ? 'Pause Spin' : 'Resume Spin';
  elements.spinToggle.setAttribute('aria-pressed', state.spinning);
}

function resetView() {
  if (!controls || !camera || !globeGroup) return;
  controls.reset();
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);
  globeGroup.rotation.set(0, 0, 0);
  state.userInteracting = false;
  clearHover();
  showStatus('View reset', false, 1600);
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = null;

  const width = elements.globeContainer.clientWidth;
  const height = elements.globeContainer.clientHeight;

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  elements.globeContainer.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 3, 5);
  scene.add(dirLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 1.5;
  controls.maxDistance = 6;
  controls.autoRotate = false;
  controls.addEventListener('start', () => {
    state.userInteracting = true;
  });
  controls.addEventListener('end', () => {
    state.userInteracting = false;
  });

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  renderer.domElement.addEventListener('pointermove', handlePointerMove);
  renderer.domElement.addEventListener('pointerleave', clearHover);
  renderer.domElement.addEventListener('pointerup', handlePointerSelection);
}

async function buildGlobe() {
  globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const loader = new THREE.TextureLoader();
  const [earthTexture, cloudTexture] = await Promise.all([
    loadTexture(loader, TEXTURE_URL).catch(() => null),
    loadTexture(loader, CLOUDS_TEXTURE).catch(() => null)
  ]);

  const sphereMaterial = new THREE.MeshPhongMaterial({
    color: '#0d265c',
    specular: '#123',
    shininess: 8,
    map: earthTexture || null
  });

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), sphereMaterial);
  globeGroup.add(sphere);

  if (cloudTexture) {
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.01, 64, 64),
      new THREE.MeshLambertMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
      })
    );
    globeGroup.add(clouds);
  }

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 64, 64),
    new THREE.MeshBasicMaterial({ color: '#5bc6ff', transparent: true, opacity: 0.08 })
  );
  globeGroup.add(atmosphere);
}

function buildMarkers() {
  markerGroup = new THREE.Group();
  dataPoints.forEach((point) => {
    const geometry = new THREE.SphereGeometry(baseMarkerSize, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#0a1c3a',
      emissiveIntensity: 1.2
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.userData = point;
    marker.frustumCulled = false;
    positionMarker(marker, point.lat, point.lon, 1.03);
    markerGroup.add(marker);
  });
  globeGroup.add(markerGroup);
}

function animate() {
  requestAnimationFrame(animate);
  if (state.spinning && !state.userInteracting) {
    globeGroup.rotation.y += spinVelocity;
  }
  controls.update();
  renderer.render(scene, camera);
}

function updateMetric(metricKey) {
  if (!metricsConfig[metricKey]) return;
  state.metricKey = metricKey;
  elements.metricSelect.value = metricKey;
  const config = metricsConfig[metricKey];
  const [min, max] = config.domain;

  if (!markerGroup) {
    updateLegend(config, min, max);
    updateSummary(metricKey);
    return;
  }

  markerGroup.children.forEach((marker) => {
    const value = marker.userData.metrics[metricKey];
    const t = normalize(value, min, max);
    const color = interpolateColor(config.colors[0], config.colors[1], t);
    marker.material.color.set(color);
    marker.material.emissive.set(color);
    const scale = THREE.MathUtils.lerp(config.sizeRange[0], config.sizeRange[1], t);
    marker.scale.setScalar(scale);
  });

  updateLegend(config, min, max);
  updateSummary(metricKey);
  renderInfo(state.selectedPoint);
}

function updateLegend(config, min, max) {
  elements.legendTitle.textContent = config.label;
  elements.legendRange.textContent = config.unit;
  elements.legendMin.textContent = config.formatter ? config.formatter(min) : min.toFixed(1);
  elements.legendMax.textContent = config.formatter ? config.formatter(max) : max.toFixed(1);
  elements.legendDescription.textContent = config.description;
  elements.legendGradient.style.background = `linear-gradient(90deg, ${config.colors[0]}, ${config.colors[1]})`;
}

function updateSummary(metricKey) {
  if (!elements.summaryGrid || !metricsConfig[metricKey]) return;
  const stats = computeMetricStats(metricKey);
  const config = metricsConfig[metricKey];
  if (!stats) {
    elements.summaryGrid.innerHTML = '<p>No data available for this metric.</p>';
    return;
  }

  const topValue = formatMetricValue(metricKey, stats.topValue);
  const average = formatMetricValue(metricKey, stats.average);
  const spread = formatMetricValue(metricKey, stats.range);

  elements.summaryGrid.innerHTML = `
    <div class="summary-card accent">
      <span class="label">Top City</span>
      <span class="value">${stats.topPoint.name}</span>
      <span class="description">${topValue}</span>
    </div>
    <div class="summary-card">
      <span class="label">Average</span>
      <span class="value">${average}</span>
      <span class="description">${config.unit}</span>
    </div>
    <div class="summary-card">
      <span class="label">Spread</span>
      <span class="value">${spread}</span>
      <span class="description">${stats.count} cities tracked</span>
    </div>
  `;
}

function computeMetricStats(metricKey) {
  if (!metricsConfig[metricKey]) return null;
  const validPoints = dataPoints.filter((point) => Number.isFinite(point.metrics[metricKey]));
  if (!validPoints.length) return null;
  const topPoint = validPoints.reduce((prev, curr) =>
    curr.metrics[metricKey] > (prev?.metrics[metricKey] ?? -Infinity) ? curr : prev
  );
  const minPoint = validPoints.reduce((prev, curr) =>
    curr.metrics[metricKey] < (prev?.metrics[metricKey] ?? Infinity) ? curr : prev
  );
  const total = validPoints.reduce((sum, point) => sum + point.metrics[metricKey], 0);
  const average = total / validPoints.length;
  return {
    topPoint,
    minPoint,
    topValue: topPoint.metrics[metricKey],
    minValue: minPoint.metrics[metricKey],
    range: topPoint.metrics[metricKey] - minPoint.metrics[metricKey],
    average,
    count: validPoints.length
  };
}

function formatMetricValue(metricKey, value) {
  if (!metricsConfig[metricKey] || typeof value !== 'number') return '--';
  return metricsConfig[metricKey].formatter ? metricsConfig[metricKey].formatter(value) : value.toFixed(1);
}

function renderInfo(point) {
  if (!point) {
    state.selectedPoint = null;
    elements.infoTitle.textContent = 'Details on Demand';
    elements.infoContent.innerHTML = '<p>Select a glowing marker to inspect a location.</p>';
    return;
  }

  state.selectedPoint = point;
  const activeConfig = metricsConfig[state.metricKey];
  const cards = [
    {
      label: activeConfig.label,
      value: formatMetricValue(state.metricKey, point.metrics[state.metricKey]),
      hint: activeConfig.unit,
      accent: true
    },
    {
      label: 'Population',
      value: formatMetricValue('population', point.metrics.population),
      hint: metricsConfig.population.unit
    },
    {
      label: 'CO₂ Emissions',
      value: formatMetricValue('emissions', point.metrics.emissions),
      hint: metricsConfig.emissions.unit
    },
    {
      label: 'Renewable Share',
      value: formatMetricValue('renewables', point.metrics.renewables),
      hint: 'Rolling average'
    }
  ];

  const cardsMarkup = cards
    .map(
      (card) => `
      <div class="info-card ${card.accent ? 'accent' : ''}">
        <span class="label">${card.label}</span>
        <span class="value">${card.value}</span>
        ${card.hint ? `<span class="hint">${card.hint}</span>` : ''}
      </div>`
    )
    .join('');

  elements.infoTitle.textContent = point.name;
  elements.infoContent.innerHTML = `
    <p class="location-meta">${point.country} · ${point.region} · Updated ${point.lastUpdated}</p>
    <span class="badge">${point.category}</span>
    <div class="info-grid">${cardsMarkup}</div>
    <p>${point.footprint}</p>
  `;
}

function handleResize() {
  if (!renderer || !camera) return;
  const width = elements.globeContainer.clientWidth;
  const height = elements.globeContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function handlePointerMove(event) {
  updatePointer(event);
  const intersects = pickMarker();
  if (intersects.length) {
    const marker = intersects[0].object;
    if (hoveredMarker !== marker) {
      setHover(marker);
    }
    renderInfo(marker.userData);
    showTooltip(marker.userData, event);
  } else {
    clearHover();
  }
}

function handlePointerSelection(event) {
  updatePointer(event);
  const intersects = pickMarker();
  if (intersects.length) {
    const marker = intersects[0].object;
    renderInfo(marker.userData);
    showTooltip(marker.userData, event);
  } else {
    hideTooltip();
  }
}

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickMarker() {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(markerGroup.children, false);
}

function setHover(marker) {
  clearHover();
  hoveredMarker = marker;
  hoveredMarker.scale.multiplyScalar(1.2);
}

function clearHover() {
  if (hoveredMarker) {
    hoveredMarker.scale.divideScalar(1.2);
    hoveredMarker = null;
  }
  hideTooltip();
}

function showTooltip(point, event) {
  if (!elements.tooltip || !point) return;
  const metricValue = formatMetricValue(state.metricKey, point.metrics[state.metricKey]);
  elements.tooltip.innerHTML = `<strong>${point.name}</strong><span>${metricValue}</span>`;
  if (!event || !elements.globeContainer) {
    hideTooltip();
    return;
  }
  elements.tooltip.hidden = false;
  const panelRect = elements.globeContainer.getBoundingClientRect();
  const tooltipWidth = elements.tooltip.offsetWidth || 160;
  const tooltipHeight = elements.tooltip.offsetHeight || 64;
  let x = event.clientX - panelRect.left + tooltipOffset.x;
  let y = event.clientY - panelRect.top + tooltipOffset.y;
  x = Math.min(Math.max(tooltipPadding, x), panelRect.width - tooltipWidth - tooltipPadding);
  y = Math.min(Math.max(tooltipPadding, y), panelRect.height - tooltipHeight - tooltipPadding);
  elements.tooltip.style.transform = `translate(${x}px, ${y}px)`;
}

function hideTooltip() {
  if (!elements.tooltip) return;
  elements.tooltip.hidden = true;
  elements.tooltip.style.transform = 'translate(-9999px, -9999px)';
}

function positionMarker(marker, lat, lon, radius = 1.01) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  marker.position.x = radius * Math.sin(phi) * Math.cos(theta);
  marker.position.y = radius * Math.cos(phi);
  marker.position.z = radius * Math.sin(phi) * Math.sin(theta);
}

function findDomain(metricKey) {
  const values = dataPoints.map((point) => point.metrics[metricKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return [min, max];
}

function normalize(value, min, max) {
  if (max - min === 0) return 0;
  return THREE.MathUtils.clamp((value - min) / (max - min), 0, 1);
}

function interpolateColor(colorA, colorB, t) {
  const colA = new THREE.Color(colorA);
  const colB = new THREE.Color(colorB);
  return colA.lerp(colB, t).getStyle();
}

function showStatus(message, isError = false, timeout) {
  if (!elements.statusBanner) return;
  elements.statusBanner.textContent = message;
  elements.statusBanner.hidden = false;
  elements.statusBanner.classList.toggle('error', isError);
  if (timeout) {
    setTimeout(() => {
      elements.statusBanner.hidden = true;
    }, timeout);
  }
}

function loadTexture(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function isWebGlAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!window.WebGLRenderingContext && !!(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    );
  } catch (error) {
    return false;
  }
}
