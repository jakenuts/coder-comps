/**
 * ==========================================================================
 * PlanetPulse - Global Metrics Globe
 * ==========================================================================
 *
 * ARCHITECTURE OVERVIEW:
 * ----------------------
 * This application is organized into the following modules:
 *
 * 1. CONFIG - Central configuration for metrics, colors, and API endpoints
 * 2. Utils - Utility functions (debounce, throttle, color interpolation)
 * 3. DataService - Handles fetching, parsing, and filtering earthquake data
 * 4. GlobeRenderer - Three.js scene setup, globe rendering, starfield, and markers
 * 5. UIController - Manages UI interactions, metric switching, and panel updates
 * 6. App - Main application orchestrator that ties all modules together
 *
 * DATA FLOW:
 * ----------
 * App.init() -> DataService.fetchData() -> GlobeRenderer.addDataPoints()
 * User interaction -> UIController -> GlobeRenderer.updateVisualization()
 * Time filter change -> DataService.filterByTime() -> GlobeRenderer.updateVisibility()
 *
 * KEY IMPROVEMENTS (Round 2):
 * ---------------------------
 * - Added starfield background for visual depth
 * - Time range slider to filter earthquakes by recency
 * - Dynamic stats that update based on selected metric
 * - Improved marker rendering using sprites for better visibility and hit detection
 * - Debounced resize handler for performance
 * - Smoother hover/selection feedback with highlighted markers
 *
 * FINAL POLISH (Round 3):
 * -----------------------
 * - Keyboard accessibility (Escape to deselect, Space to toggle rotation)
 * - Pulse animation for major earthquakes (magnitude 6+)
 * - Data source attribution to USGS
 * - Focus styles for all interactive elements
 * - Improved error handling with timeout
 * - Better touch support for mobile
 *
 * TRADE-OFFS & LIMITATIONS:
 * -------------------------
 * - Uses USGS earthquake API (public, no key required) for real data
 * - Falls back to hardcoded sample data if API fails
 * - Globe texture is procedurally generated (no external image dependency)
 * - Limited to ~500 data points for performance
 * - Sprite-based markers provide good hit detection but limited styling options
 *
 * ==========================================================================
 */

// ==========================================================================
// CONFIGURATION
// ==========================================================================

const CONFIG = {
    // API endpoint for earthquake data (USGS - past 30 days, magnitude 2.5+)
    api: {
        url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson',
        maxPoints: 500
    },

    // Globe settings
    globe: {
        radius: 1,
        segments: 64,
        rotationSpeed: 0.0008,
        cameraDistance: 2.5
    },

    // Starfield settings
    starfield: {
        count: 2000,
        radius: 50
    },

    // Metric definitions
    metrics: {
        magnitude: {
            id: 'magnitude',
            label: 'Magnitude',
            description: 'Earthquake magnitude (Richter scale)',
            accessor: (d) => d.properties.mag,
            domain: [2.5, 8],
            format: (v) => v?.toFixed(1) ?? '-',
            unit: '',
            statLabels: { avg: 'Avg Magnitude:', max: 'Max Magnitude:' }
        },
        depth: {
            id: 'depth',
            label: 'Depth',
            description: 'Earthquake depth below surface',
            accessor: (d) => d.geometry.coordinates[2],
            domain: [0, 300],
            format: (v) => v?.toFixed(0) ?? '-',
            unit: 'km',
            statLabels: { avg: 'Avg Depth:', max: 'Max Depth:' }
        }
    },

    // Color scale (low -> mid -> high)
    colors: {
        low: { r: 34, g: 211, b: 238 },    // Cyan
        mid: { r: 250, g: 204, b: 21 },    // Yellow
        high: { r: 239, g: 68, b: 68 }     // Red
    },

    // Marker size range
    markerSize: {
        min: 8,
        max: 24
    }
};

// Fallback sample data if API fails
const SAMPLE_DATA = {
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', properties: { mag: 5.2, place: 'Tokyo, Japan', time: Date.now() - 86400000 }, geometry: { type: 'Point', coordinates: [139.6917, 35.6895, 45] } },
        { type: 'Feature', properties: { mag: 4.8, place: 'Los Angeles, California', time: Date.now() - 172800000 }, geometry: { type: 'Point', coordinates: [-118.2437, 34.0522, 12] } },
        { type: 'Feature', properties: { mag: 6.1, place: 'Lima, Peru', time: Date.now() - 259200000 }, geometry: { type: 'Point', coordinates: [-77.0428, -12.0464, 78] } },
        { type: 'Feature', properties: { mag: 3.5, place: 'Istanbul, Turkey', time: Date.now() - 345600000 }, geometry: { type: 'Point', coordinates: [28.9784, 41.0082, 10] } },
        { type: 'Feature', properties: { mag: 7.2, place: 'Manila, Philippines', time: Date.now() - 432000000 }, geometry: { type: 'Point', coordinates: [120.9842, 14.5995, 120] } },
        { type: 'Feature', properties: { mag: 4.2, place: 'Santiago, Chile', time: Date.now() - 518400000 }, geometry: { type: 'Point', coordinates: [-70.6693, -33.4489, 55] } },
        { type: 'Feature', properties: { mag: 5.8, place: 'Jakarta, Indonesia', time: Date.now() - 604800000 }, geometry: { type: 'Point', coordinates: [106.8456, -6.2088, 95] } },
        { type: 'Feature', properties: { mag: 3.9, place: 'Mexico City, Mexico', time: Date.now() - 691200000 }, geometry: { type: 'Point', coordinates: [-99.1332, 19.4326, 8] } },
        { type: 'Feature', properties: { mag: 5.5, place: 'Christchurch, New Zealand', time: Date.now() - 777600000 }, geometry: { type: 'Point', coordinates: [172.6362, -43.5321, 25] } },
        { type: 'Feature', properties: { mag: 4.6, place: 'Athens, Greece', time: Date.now() - 864000000 }, geometry: { type: 'Point', coordinates: [23.7275, 37.9838, 15] } },
        { type: 'Feature', properties: { mag: 6.5, place: 'Anchorage, Alaska', time: Date.now() - 950400000 }, geometry: { type: 'Point', coordinates: [-149.9003, 61.2181, 35] } },
        { type: 'Feature', properties: { mag: 4.1, place: 'Taipei, Taiwan', time: Date.now() - 1036800000 }, geometry: { type: 'Point', coordinates: [121.5654, 25.0330, 18] } },
        { type: 'Feature', properties: { mag: 5.0, place: 'Port-au-Prince, Haiti', time: Date.now() - 1123200000 }, geometry: { type: 'Point', coordinates: [-72.3388, 18.5944, 22] } },
        { type: 'Feature', properties: { mag: 6.8, place: 'Kathmandu, Nepal', time: Date.now() - 1209600000 }, geometry: { type: 'Point', coordinates: [85.3240, 27.7172, 15] } },
        { type: 'Feature', properties: { mag: 3.8, place: 'San Francisco, California', time: Date.now() - 1296000000 }, geometry: { type: 'Point', coordinates: [-122.4194, 37.7749, 8] } }
    ]
};

// ==========================================================================
// UTILITIES
// ==========================================================================

const Utils = {
    /**
     * Debounce a function
     */
    debounce(fn, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * Interpolate between colors based on normalized value (0-1)
     */
    interpolateColor(t, colors) {
        const { low, mid, high } = colors;
        let r, g, b;

        if (t < 0.5) {
            const t2 = t * 2;
            r = low.r + (mid.r - low.r) * t2;
            g = low.g + (mid.g - low.g) * t2;
            b = low.b + (mid.b - low.b) * t2;
        } else {
            const t2 = (t - 0.5) * 2;
            r = mid.r + (high.r - mid.r) * t2;
            g = mid.g + (high.g - mid.g) * t2;
            b = mid.b + (high.b - mid.b) * t2;
        }

        return { r: r / 255, g: g / 255, b: b / 255 };
    },

    /**
     * Convert lat/lon to 3D vector on sphere
     */
    latLonToVector3(lat, lon, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        return new THREE.Vector3(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    },

    /**
     * Create a circular gradient texture for markers
     */
    createMarkerTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Outer glow
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        return new THREE.CanvasTexture(canvas);
    }
};

// ==========================================================================
// DATA SERVICE
// ==========================================================================

const DataService = {
    rawData: null,
    filteredData: null,
    isLoading: false,
    error: null,
    timeRangeDays: 30,

    /**
     * Fetch earthquake data from USGS API with timeout
     */
    async fetchData() {
        this.isLoading = true;
        this.error = null;

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(CONFIG.api.url, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            // Validate data structure
            if (!data || !Array.isArray(data.features)) {
                throw new Error('Invalid data format received');
            }

            // Limit and sort by magnitude
            if (data.features.length > CONFIG.api.maxPoints) {
                data.features = data.features
                    .sort((a, b) => (b.properties.mag || 0) - (a.properties.mag || 0))
                    .slice(0, CONFIG.api.maxPoints);
            }

            this.rawData = data;
            this.filteredData = this.filterByTime(this.timeRangeDays);
            this.isLoading = false;
            return this.filteredData;

        } catch (error) {
            clearTimeout(timeoutId);

            // Handle specific error types
            let errorMessage = 'Failed to fetch data';
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out';
            } else if (error.message) {
                errorMessage = error.message;
            }

            console.warn('Failed to fetch live data, using sample data:', errorMessage);
            this.error = new Error(errorMessage);
            this.rawData = SAMPLE_DATA;
            this.filteredData = this.filterByTime(this.timeRangeDays);
            this.isLoading = false;
            return this.filteredData;
        }
    },

    /**
     * Filter data by time range
     */
    filterByTime(days) {
        this.timeRangeDays = days;

        if (!this.rawData || !this.rawData.features) {
            return { type: 'FeatureCollection', features: [] };
        }

        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

        const filtered = {
            type: 'FeatureCollection',
            features: this.rawData.features.filter(f => f.properties.time >= cutoff)
        };

        this.filteredData = filtered;
        return filtered;
    },

    /**
     * Get filtered data
     */
    getData() {
        return this.filteredData;
    },

    /**
     * Compute statistics for visible data
     */
    computeStats(metricId) {
        if (!this.filteredData || !this.filteredData.features) {
            return { total: 0, avg: 0, max: 0 };
        }

        const metric = CONFIG.metrics[metricId];
        const values = this.filteredData.features
            .map(f => metric.accessor(f))
            .filter(v => v != null && !isNaN(v));

        if (values.length === 0) {
            return { total: 0, avg: 0, max: 0 };
        }

        return {
            total: this.filteredData.features.length,
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            max: Math.max(...values)
        };
    }
};

// ==========================================================================
// GLOBE RENDERER
// ==========================================================================

const GlobeRenderer = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    globe: null,
    globeGroup: null,
    markers: [],
    markerTexture: null,
    raycaster: null,
    mouse: null,
    isRotating: true,
    currentMetric: 'magnitude',
    hoveredMarker: null,
    selectedMarker: null,
    animationId: null,

    /**
     * Initialize the Three.js scene
     */
    init(canvas) {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        const aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
        this.camera.position.z = CONFIG.globe.cameraDistance;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.minDistance = 1.5;
        this.controls.maxDistance = 5;
        this.controls.enablePan = false;

        this.controls.addEventListener('start', () => {
            this.isRotating = false;
        });

        // Raycaster
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Marker texture
        this.markerTexture = Utils.createMarkerTexture();

        // Create scene elements
        this.createStarfield();
        this.createGlobe();
        this.createLighting();

        // Handle resize with debounce
        const debouncedResize = Utils.debounce(() => this.handleResize(canvas), 100);
        window.addEventListener('resize', debouncedResize);

        // Start animation
        this.animate();
    },

    /**
     * Create starfield background
     */
    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        for (let i = 0; i < CONFIG.starfield.count; i++) {
            // Random position on sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = CONFIG.starfield.radius;

            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );

            // Slight color variation
            const brightness = 0.5 + Math.random() * 0.5;
            colors.push(brightness, brightness, brightness + Math.random() * 0.1);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
    },

    /**
     * Create the Earth globe
     */
    createGlobe() {
        this.globeGroup = new THREE.Group();

        // Create procedural texture
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = 1024;
        textureCanvas.height = 512;
        const ctx = textureCanvas.getContext('2d');

        // Ocean gradient
        const oceanGradient = ctx.createLinearGradient(0, 0, 0, 512);
        oceanGradient.addColorStop(0, '#1a4a6e');
        oceanGradient.addColorStop(0.5, '#1a3a5c');
        oceanGradient.addColorStop(1, '#1a4a6e');
        ctx.fillStyle = oceanGradient;
        ctx.fillRect(0, 0, 1024, 512);

        // Draw continents with more detail
        ctx.fillStyle = '#2d5a3d';

        // North America
        ctx.beginPath();
        ctx.moveTo(80, 40);
        ctx.bezierCurveTo(140, 30, 180, 50, 200, 80);
        ctx.bezierCurveTo(220, 110, 180, 140, 140, 160);
        ctx.bezierCurveTo(100, 180, 60, 150, 50, 120);
        ctx.bezierCurveTo(40, 90, 50, 60, 80, 40);
        ctx.fill();

        // South America
        ctx.beginPath();
        ctx.moveTo(140, 180);
        ctx.bezierCurveTo(160, 190, 170, 220, 160, 280);
        ctx.bezierCurveTo(150, 340, 130, 380, 110, 350);
        ctx.bezierCurveTo(100, 320, 100, 260, 110, 220);
        ctx.bezierCurveTo(120, 190, 130, 180, 140, 180);
        ctx.fill();

        // Europe
        ctx.beginPath();
        ctx.moveTo(480, 60);
        ctx.bezierCurveTo(520, 50, 560, 60, 580, 80);
        ctx.bezierCurveTo(600, 100, 580, 130, 540, 140);
        ctx.bezierCurveTo(500, 150, 460, 140, 450, 120);
        ctx.bezierCurveTo(440, 100, 460, 70, 480, 60);
        ctx.fill();

        // Africa
        ctx.beginPath();
        ctx.moveTo(480, 150);
        ctx.bezierCurveTo(520, 140, 560, 160, 580, 200);
        ctx.bezierCurveTo(600, 260, 580, 320, 540, 340);
        ctx.bezierCurveTo(500, 360, 460, 340, 440, 300);
        ctx.bezierCurveTo(420, 260, 430, 200, 460, 170);
        ctx.bezierCurveTo(470, 160, 480, 150, 480, 150);
        ctx.fill();

        // Asia
        ctx.beginPath();
        ctx.moveTo(600, 50);
        ctx.bezierCurveTo(700, 40, 800, 60, 860, 100);
        ctx.bezierCurveTo(900, 140, 880, 180, 820, 200);
        ctx.bezierCurveTo(760, 220, 680, 220, 620, 200);
        ctx.bezierCurveTo(580, 180, 560, 140, 580, 100);
        ctx.bezierCurveTo(590, 70, 600, 50, 600, 50);
        ctx.fill();

        // India
        ctx.beginPath();
        ctx.ellipse(680, 230, 30, 50, 0, 0, Math.PI * 2);
        ctx.fill();

        // Southeast Asia
        ctx.beginPath();
        ctx.ellipse(780, 240, 40, 30, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Australia
        ctx.beginPath();
        ctx.moveTo(820, 300);
        ctx.bezierCurveTo(880, 290, 920, 320, 920, 360);
        ctx.bezierCurveTo(920, 400, 880, 420, 830, 410);
        ctx.bezierCurveTo(780, 400, 760, 360, 780, 330);
        ctx.bezierCurveTo(790, 310, 810, 300, 820, 300);
        ctx.fill();

        // Antarctica
        ctx.fillStyle = '#4a6a7a';
        ctx.fillRect(0, 460, 1024, 52);

        // Greenland
        ctx.fillStyle = '#5a7a8a';
        ctx.beginPath();
        ctx.ellipse(350, 45, 40, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        const texture = new THREE.CanvasTexture(textureCanvas);

        // Globe mesh
        const geometry = new THREE.SphereGeometry(
            CONFIG.globe.radius,
            CONFIG.globe.segments,
            CONFIG.globe.segments
        );

        const material = new THREE.MeshPhongMaterial({
            map: texture,
            bumpScale: 0.02,
            specular: new THREE.Color(0x333333),
            shininess: 5
        });

        this.globe = new THREE.Mesh(geometry, material);
        this.globeGroup.add(this.globe);

        // Atmosphere
        const atmosphereGeometry = new THREE.SphereGeometry(1.015, 64, 64);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a9eff,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.globeGroup.add(atmosphere);

        // Outer glow
        const glowGeometry = new THREE.SphereGeometry(1.05, 64, 64);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a9eff,
            transparent: true,
            opacity: 0.03,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.globeGroup.add(glow);

        this.scene.add(this.globeGroup);
    },

    /**
     * Create lighting
     */
    createLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);

        const hemisphereLight = new THREE.HemisphereLight(0x6699ff, 0x444422, 0.3);
        this.scene.add(hemisphereLight);
    },

    /**
     * Add data points as sprites
     */
    addDataPoints(features) {
        // Clear existing markers
        this.clearMarkers();

        features.forEach((feature, index) => {
            const [lon, lat] = feature.geometry.coordinates;
            if (lon == null || lat == null) return;

            const position = Utils.latLonToVector3(lat, lon, 1.02);

            // Create sprite
            const spriteMaterial = new THREE.SpriteMaterial({
                map: this.markerTexture,
                transparent: true,
                depthTest: true,
                depthWrite: false
            });

            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(position);
            sprite.userData = { feature, index };

            this.globeGroup.add(sprite);
            this.markers.push(sprite);
        });

        // Apply initial visualization
        this.updateVisualization(this.currentMetric);
    },

    /**
     * Clear all markers
     */
    clearMarkers() {
        this.markers.forEach(marker => {
            this.globeGroup.remove(marker);
            marker.material.dispose();
        });
        this.markers = [];
        this.hoveredMarker = null;
        this.selectedMarker = null;
    },

    /**
     * Update visualization based on metric
     */
    updateVisualization(metricId) {
        this.currentMetric = metricId;
        const metric = CONFIG.metrics[metricId];
        const [min, max] = metric.domain;

        this.markers.forEach(marker => {
            const feature = marker.userData.feature;
            const value = metric.accessor(feature);

            // Normalize value
            let t = (value - min) / (max - min);
            t = Math.max(0, Math.min(1, t));

            // Set color
            const color = Utils.interpolateColor(t, CONFIG.colors);
            marker.material.color.setRGB(color.r, color.g, color.b);

            // Set size
            const { min: sizeMin, max: sizeMax } = CONFIG.markerSize;
            const size = (sizeMin + (sizeMax - sizeMin) * t) / 400;
            marker.scale.set(size, size, size);
        });
    },

    /**
     * Check for hovered marker
     */
    checkHover(x, y) {
        this.mouse.x = x;
        this.mouse.y = y;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.markers);

        // Reset previous hover
        if (this.hoveredMarker && this.hoveredMarker !== this.selectedMarker) {
            this.hoveredMarker.material.opacity = 0.9;
            const scale = this.hoveredMarker.scale.x;
            this.hoveredMarker.scale.set(scale / 1.3, scale / 1.3, scale / 1.3);
        }

        if (intersects.length > 0) {
            const marker = intersects[0].object;

            if (marker !== this.hoveredMarker) {
                this.hoveredMarker = marker;

                if (marker !== this.selectedMarker) {
                    marker.material.opacity = 1;
                    const scale = marker.scale.x;
                    marker.scale.set(scale * 1.3, scale * 1.3, scale * 1.3);
                }
            }

            return marker.userData.feature;
        }

        this.hoveredMarker = null;
        return null;
    },

    /**
     * Select a marker
     */
    selectMarker(feature) {
        // Reset previous selection
        if (this.selectedMarker) {
            this.selectedMarker.material.opacity = 0.9;
        }

        if (!feature) {
            this.selectedMarker = null;
            return;
        }

        // Find and select new marker
        const marker = this.markers.find(m => m.userData.feature === feature);
        if (marker) {
            this.selectedMarker = marker;
            marker.material.opacity = 1;
        }
    },

    /**
     * Deselect current marker
     */
    deselectMarker() {
        if (this.selectedMarker) {
            this.selectedMarker.material.opacity = 0.9;
            this.selectedMarker = null;
        }
    },

    /**
     * Set rotation state
     */
    setRotating(rotating) {
        this.isRotating = rotating;
    },

    /**
     * Reset camera view
     */
    resetView() {
        this.camera.position.set(0, 0, CONFIG.globe.cameraDistance);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
        this.isRotating = true;
    },

    /**
     * Handle resize
     */
    handleResize(canvas) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    },

    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001; // Convert to seconds

        if (this.isRotating && this.globeGroup) {
            this.globeGroup.rotation.y += CONFIG.globe.rotationSpeed;
        }

        // Pulse animation for major earthquakes (magnitude 6+)
        this.markers.forEach(marker => {
            const mag = marker.userData.feature?.properties?.mag;
            if (mag && mag >= 6) {
                // Create subtle pulse effect
                const baseScale = marker.userData.baseScale || marker.scale.x;
                if (!marker.userData.baseScale) {
                    marker.userData.baseScale = baseScale;
                }

                // Skip if currently hovered or selected (they have modified scales)
                if (marker !== this.hoveredMarker && marker !== this.selectedMarker) {
                    const pulse = 1 + Math.sin(time * 3 + marker.userData.index) * 0.15;
                    marker.scale.setScalar(baseScale * pulse);
                }
            }
        });

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    },

    /**
     * Cleanup
     */
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
};

// ==========================================================================
// UI CONTROLLER
// ==========================================================================

const UIController = {
    elements: {},
    currentMetric: 'magnitude',
    onMetricChange: null,
    onTimeFilterChange: null,
    onRetry: null,

    /**
     * Initialize UI
     */
    init() {
        this.elements = {
            loadingOverlay: document.getElementById('loading-overlay'),
            errorOverlay: document.getElementById('error-overlay'),
            errorMessage: document.getElementById('error-message'),
            retryBtn: document.getElementById('retry-btn'),
            playPauseBtn: document.getElementById('play-pause-btn'),
            resetViewBtn: document.getElementById('reset-view-btn'),
            metricButtons: document.querySelectorAll('.metric-btn'),
            legendMin: document.getElementById('legend-min'),
            legendMax: document.getElementById('legend-max'),
            legendDescription: document.getElementById('legend-description'),
            detailsContent: document.getElementById('details-content'),
            statTotal: document.getElementById('stat-total'),
            statAvg: document.getElementById('stat-avg'),
            statMax: document.getElementById('stat-max'),
            statAvgLabel: document.getElementById('stat-avg-label'),
            statMaxLabel: document.getElementById('stat-max-label'),
            timeSlider: document.getElementById('time-slider'),
            timeValue: document.getElementById('time-value'),
            tooltip: document.getElementById('tooltip'),
            globeContainer: document.getElementById('globe-container')
        };

        this.bindEvents();
        this.updateLegend('magnitude');
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Play/Pause
        this.elements.playPauseBtn.addEventListener('click', () => {
            const isRotating = !GlobeRenderer.isRotating;
            GlobeRenderer.setRotating(isRotating);
            this.updatePlayPauseButton(isRotating);
        });

        // Reset view
        this.elements.resetViewBtn.addEventListener('click', () => {
            GlobeRenderer.resetView();
            this.updatePlayPauseButton(true);
        });

        // Metric buttons
        this.elements.metricButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const metric = btn.dataset.metric;
                if (metric === this.currentMetric) return;

                this.currentMetric = metric;
                this.updateMetricButtons(metric);
                this.updateLegend(metric);
                this.updateStatLabels(metric);

                if (this.onMetricChange) {
                    this.onMetricChange(metric);
                }
            });
        });

        // Time slider
        this.elements.timeSlider.addEventListener('input', (e) => {
            const days = parseInt(e.target.value, 10);
            this.elements.timeValue.textContent = days === 1 ? '1 day' : `${days} days`;

            if (this.onTimeFilterChange) {
                this.onTimeFilterChange(days);
            }
        });

        // Retry
        this.elements.retryBtn.addEventListener('click', () => {
            if (this.onRetry) {
                this.onRetry();
            }
        });

        // Mouse events
        const container = this.elements.globeContainer;

        container.addEventListener('mousemove', (e) => this.handlePointerMove(e));
        container.addEventListener('click', (e) => this.handleClick(e));
        container.addEventListener('mouseleave', () => this.hideTooltip());

        // Touch support
        let touchTimeout;
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchTimeout = setTimeout(() => {
                    this.handleClick(e.touches[0]);
                }, 200);
            }
        });

        container.addEventListener('touchmove', () => {
            clearTimeout(touchTimeout);
        });

        container.addEventListener('touchend', () => {
            clearTimeout(touchTimeout);
        });

        // Keyboard accessibility
        document.addEventListener('keydown', (e) => {
            // Escape to deselect current marker and reset details
            if (e.key === 'Escape') {
                GlobeRenderer.deselectMarker();
                this.resetDetails();
            }

            // Space to toggle rotation (when not focused on interactive elements)
            if (e.key === ' ' && !this.isInteractiveElement(e.target)) {
                e.preventDefault();
                const isRotating = !GlobeRenderer.isRotating;
                GlobeRenderer.setRotating(isRotating);
                this.updatePlayPauseButton(isRotating);
            }

            // R to reset view (when not focused on interactive elements)
            if (e.key === 'r' && !this.isInteractiveElement(e.target)) {
                GlobeRenderer.resetView();
                this.updatePlayPauseButton(true);
            }
        });
    },

    /**
     * Check if element is interactive (input, button, etc.)
     */
    isInteractiveElement(element) {
        const interactiveTags = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'];
        return interactiveTags.includes(element.tagName) || element.isContentEditable;
    },

    /**
     * Reset details panel to placeholder
     */
    resetDetails() {
        this.elements.detailsContent.innerHTML = '<p class="placeholder">Hover or click on a data point to see details</p>';
    },

    /**
     * Handle pointer move
     */
    handlePointerMove(event) {
        const rect = this.elements.globeContainer.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const feature = GlobeRenderer.checkHover(x, y);

        if (feature) {
            this.showTooltip(event.clientX, event.clientY, feature);
            this.elements.globeContainer.style.cursor = 'pointer';
        } else {
            this.hideTooltip();
            this.elements.globeContainer.style.cursor = 'grab';
        }
    },

    /**
     * Handle click
     */
    handleClick(event) {
        const rect = this.elements.globeContainer.getBoundingClientRect();
        const clientX = event.clientX || event.pageX;
        const clientY = event.clientY || event.pageY;
        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((clientY - rect.top) / rect.height) * 2 + 1;

        const feature = GlobeRenderer.checkHover(x, y);

        if (feature) {
            this.showDetails(feature);
            GlobeRenderer.selectMarker(feature);
        }
    },

    /**
     * Show tooltip
     */
    showTooltip(x, y, feature) {
        const tooltip = this.elements.tooltip;
        const metric = CONFIG.metrics[this.currentMetric];
        const value = metric.accessor(feature);

        tooltip.innerHTML = `
            <div class="tooltip-title">${feature.properties.place || 'Unknown Location'}</div>
            <div class="tooltip-value">${metric.label}: ${metric.format(value)}${metric.unit}</div>
        `;

        const offset = 15;
        let left = x + offset;
        let top = y + offset;

        if (left + 200 > window.innerWidth) {
            left = x - 200 - offset;
        }
        if (top + 80 > window.innerHeight) {
            top = y - 80 - offset;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.remove('hidden');
    },

    /**
     * Hide tooltip
     */
    hideTooltip() {
        this.elements.tooltip.classList.add('hidden');
    },

    /**
     * Show details panel
     */
    showDetails(feature) {
        const { properties, geometry } = feature;
        const [lon, lat, depth] = geometry.coordinates;
        const mag = properties.mag;
        const time = new Date(properties.time).toLocaleString();

        let magClass = 'magnitude-low';
        if (mag >= 6) magClass = 'magnitude-high';
        else if (mag >= 4.5) magClass = 'magnitude-mid';

        this.elements.detailsContent.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${properties.place || 'Unknown'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Magnitude:</span>
                <span class="detail-value ${magClass}">${mag?.toFixed(1) || '-'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Depth:</span>
                <span class="detail-value">${depth?.toFixed(1) || '-'} km</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Coordinates:</span>
                <span class="detail-value">${lat?.toFixed(2)}°, ${lon?.toFixed(2)}°</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${time}</span>
            </div>
        `;
    },

    /**
     * Update metric buttons
     */
    updateMetricButtons(activeMetric) {
        this.elements.metricButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.metric === activeMetric);
        });
    },

    /**
     * Update legend
     */
    updateLegend(metricId) {
        const metric = CONFIG.metrics[metricId];
        const [min, max] = metric.domain;

        this.elements.legendMin.textContent = `${min}${metric.unit}`;
        this.elements.legendMax.textContent = `${max}${metric.unit}`;
        this.elements.legendDescription.textContent = metric.description;
    },

    /**
     * Update stat labels based on metric
     */
    updateStatLabels(metricId) {
        const metric = CONFIG.metrics[metricId];
        this.elements.statAvgLabel.textContent = metric.statLabels.avg;
        this.elements.statMaxLabel.textContent = metric.statLabels.max;
    },

    /**
     * Update statistics
     */
    updateStats(stats, metricId) {
        const metric = CONFIG.metrics[metricId];
        this.elements.statTotal.textContent = stats.total;
        this.elements.statAvg.textContent = `${metric.format(stats.avg)}${metric.unit}`;
        this.elements.statMax.textContent = `${metric.format(stats.max)}${metric.unit}`;
    },

    /**
     * Update play/pause button
     */
    updatePlayPauseButton(isRotating) {
        const btn = this.elements.playPauseBtn;
        if (isRotating) {
            btn.querySelector('.icon').textContent = '⏸';
            btn.querySelector('.label').textContent = 'Pause';
        } else {
            btn.querySelector('.icon').textContent = '▶';
            btn.querySelector('.label').textContent = 'Play';
        }
    },

    /**
     * Show loading
     */
    showLoading() {
        this.elements.loadingOverlay.classList.remove('hidden');
        this.elements.errorOverlay.classList.add('hidden');
    },

    /**
     * Hide loading
     */
    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    },

    /**
     * Show error
     */
    showError(message) {
        this.elements.loadingOverlay.classList.add('hidden');
        this.elements.errorMessage.textContent = message;
        this.elements.errorOverlay.classList.remove('hidden');
    },

    /**
     * Hide error
     */
    hideError() {
        this.elements.errorOverlay.classList.add('hidden');
    }
};

// ==========================================================================
// MAIN APPLICATION
// ==========================================================================

const App = {
    currentMetric: 'magnitude',

    /**
     * Initialize application
     */
    async init() {
        try {
            UIController.init();
            UIController.showLoading();

            const canvas = document.getElementById('globe-canvas');
            GlobeRenderer.init(canvas);

            // Callbacks
            UIController.onMetricChange = (metricId) => {
                this.currentMetric = metricId;
                GlobeRenderer.updateVisualization(metricId);
                const stats = DataService.computeStats(metricId);
                UIController.updateStats(stats, metricId);
            };

            UIController.onTimeFilterChange = (days) => {
                DataService.filterByTime(days);
                const data = DataService.getData();
                GlobeRenderer.addDataPoints(data.features);
                const stats = DataService.computeStats(this.currentMetric);
                UIController.updateStats(stats, this.currentMetric);
            };

            UIController.onRetry = () => this.loadData();

            await this.loadData();

        } catch (error) {
            console.error('Failed to initialize app:', error);
            UIController.showError('Failed to initialize application');
        }
    },

    /**
     * Load data
     */
    async loadData() {
        UIController.showLoading();
        UIController.hideError();

        try {
            const data = await DataService.fetchData();

            if (data && data.features) {
                GlobeRenderer.addDataPoints(data.features);
                const stats = DataService.computeStats(this.currentMetric);
                UIController.updateStats(stats, this.currentMetric);
            }

            UIController.hideLoading();

        } catch (error) {
            console.error('Failed to load data:', error);
            UIController.showError('Failed to load earthquake data');
        }
    }
};

// ==========================================================================
// ENTRY POINT
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
