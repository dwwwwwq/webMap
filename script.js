
const map = document.getElementById("map");


const terrainCanvas = document.createElement("canvas");
terrainCanvas.id = "terrainCanvas";
map.prepend(terrainCanvas);

const terrainCtx = terrainCanvas.getContext("2d");


// 1. District data
const districts = [
    { id: 1, name: "Residential A", population: 1800, x: 0, y: 0 },
    { id: 2, name: "Market", population: 950, x: 0, y: 0 },
    { id: 3, name: "Industrial", population: 1200, x: 0, y: 0 },
    { id: 4, name: "Agricultural", population: 850, x: 0, y: 0 },
    { id: 5, name: "Cultural / Education", population: 1100, x: 0, y: 0 },
    { id: 6, name: "Transport Hub", population: 750, x: 0, y: 0 },
    { id: 7, name: "Park / Green", population: 420, x: 0, y: 0 },
    { id: 8, name: "Logistics", population: 690, x: 0, y: 0 },
    { id: 9, name: "Residential B", population: 2200, x: 0, y: 0 }
];

let pieces = [];
let lines = [];
let connections = [];
let cityEnvironment = null;
let terrainSeed = Math.random() * 10000;

// 2. Create nine map pieces
for (let i = 1; i <= 9; i++) {
    const img = document.createElement("img");
    const number = String(i).padStart(2, "0");

    img.src = "images/map" + number + ".png";
    img.className = "piece";

    map.appendChild(img);
    pieces.push(img);

    const numberLabel = document.createElement("span");
    numberLabel.innerText = i;
    numberLabel.className = "numberLabel";

    map.appendChild(numberLabel);
    img.numberLabel = numberLabel;
}

// 3. Create nineteen original line images
for (let i = 1; i <= 19; i++) {
    const img = document.createElement("img");
    const number = String(i).padStart(2, "0");

    img.src = "images/line" + number + ".png";
    img.className = "line";

    map.appendChild(img);
    lines.push(img);
}

// 4. Rearrange districts
function rearrange() {
    
    terrainSeed = Math.random() * 10000;

    for (let i = 0; i < pieces.length; i++) {
        const x = 10 + Math.random() * 80;
        const y = 10 + Math.random() * 80;

        districts[i].x = x;
        districts[i].y = y;

        pieces[i].style.left = x + "%";
        pieces[i].style.top = y + "%";
    }

    makeConnections();

    if (cityEnvironment) {
        generateTerrainBackground();
    }

    console.table(districts);

    const distance = calculateDistance(
        districts[0],
        districts[1]
    );

    console.log(
        "Distance between Residential A and Market:",
        distance
    );
}

// 5. Calculate relative district distance
function calculateDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(dx * dx + dy * dy);
}

// 6. Reference locations for API testing
const geographicSeeds = [
    { latitude: 47.55, longitude: 13.40 },
    { latitude: 42.36, longitude: -71.06 },
    { latitude: 35.68, longitude: 139.69 },
    { latitude: 48.86, longitude: 2.35 },
    { latitude: -33.87, longitude: 151.21 },
    { latitude: 39.90, longitude: 116.40 }
];

function generateCoordinates() {
    const seed = geographicSeeds[
        Math.floor(Math.random() * geographicSeeds.length)
    ];

    return {
        latitude: seed.latitude,
        longitude: seed.longitude
    };
}

// 7. Fetch historical climate data
async function fetchClimateData(latitude, longitude) {
    const url =
        "https://archive-api.open-meteo.com/v1/archive" +
        "?latitude=" + latitude +
        "&longitude=" + longitude +
        "&start_date=2015-01-01" +
        "&end_date=2024-12-31" +
        "&daily=temperature_2m_mean,precipitation_sum" +
        "&timezone=GMT" +
        "&models=era5";

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Climate API request failed");
    }

    const data = await response.json();

    const temperatures = data.daily?.temperature_2m_mean;
    const precipitation = data.daily?.precipitation_sum;

    if (
        !Array.isArray(temperatures) ||
        !Array.isArray(precipitation)
    ) {
        throw new Error("Invalid climate data");
    }

    const validTemperatures = temperatures.filter(
        value => Number.isFinite(value)
    );

    const validPrecipitation = precipitation.filter(
        value => Number.isFinite(value)
    );

    if (
        validTemperatures.length === 0 ||
        validPrecipitation.length === 0
    ) {
        throw new Error("Climate data is empty");
    }

    const totalTemperature = validTemperatures.reduce(
        (sum, value) => sum + value,
        0
    );

    const totalPrecipitation = validPrecipitation.reduce(
        (sum, value) => sum + value,
        0
    );

    return {
        annualTemperature:
            totalTemperature / validTemperatures.length,

        annualPrecipitation:
            totalPrecipitation / 10
    };
}

// 8. Fetch nearby terrain elevations
async function fetchTerrainData(latitude, longitude) {
    const offsets = [-0.05, 0, 0.05];

    const latitudes = [];
    const longitudes = [];

    for (const latOffset of offsets) {
        for (const lonOffset of offsets) {
            latitudes.push(latitude + latOffset);
            longitudes.push(longitude + lonOffset);
        }
    }

    const url =
        "https://api.open-meteo.com/v1/elevation" +
        "?latitude=" + latitudes.join(",") +
        "&longitude=" + longitudes.join(",");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Terrain API request failed");
    }

    const data = await response.json();
    const elevations = data.elevation;

    if (
        !Array.isArray(elevations) ||
        elevations.length !== 9 ||
        !elevations.every(Number.isFinite)
    ) {
        throw new Error("Invalid terrain elevation data");
    }

    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const elevationRange = maxElevation - minElevation;

    let terrainType;

    if (elevationRange < 50) {
        terrainType = "Plains";
    } else if (elevationRange < 200) {
        terrainType = "Hills";
    } else {
        terrainType = "Mountains";
    }

    return {
        terrainType,
        minElevation,
        maxElevation,
        elevationRange,
        elevationSamples: elevations
    };
}

// 9. Combine geographic data
async function generateGeographicData() {
    const location = generateCoordinates();

    const url =
        "https://api.open-meteo.com/v1/elevation" +
        "?latitude=" + location.latitude +
        "&longitude=" + location.longitude;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Elevation API request failed");
        }

        const data = await response.json();
        const elevation = data.elevation?.[0];

        if (!Number.isFinite(elevation)) {
            throw new Error("Invalid elevation data");
        }

        const climate = await fetchClimateData(
            location.latitude,
            location.longitude
        );

        const terrain = await fetchTerrainData(
            location.latitude,
            location.longitude
        );

        cityEnvironment = {
            latitude: location.latitude,
            longitude: location.longitude,
            elevation: elevation,

            annualTemperature:
                climate.annualTemperature,

            annualPrecipitation:
                climate.annualPrecipitation,

            terrainType: terrain.terrainType,
            minElevation: terrain.minElevation,
            maxElevation: terrain.maxElevation,
            elevationRange: terrain.elevationRange,
            elevationSamples: terrain.elevationSamples
        };

        console.log("Geographic Data:", cityEnvironment);
        generateTerrainBackground();

    } catch (error) {
        console.error("Geographic API Error:", error);
    }
}



function generateRiver(ctx, width, height, elevationAt) {
    const seed = terrainSeed;

    function random(n) {
        const v = Math.sin(seed * 0.137 + n * 78.233) * 43758.5453;
        return v - Math.floor(v);
    }

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }

    function mix(a, b, t) {
        return a + (b - a) * t;
    }

    // Some maps have no river
    if (random(99) > 0.65) return;

    const size = Math.min(width, height);

    // Choose a diagonal or vertical overall direction
    const mode = Math.floor(random(1) * 4);

    let start, end;

    if (mode === 0) {
        start = { x: width * (0.15 + random(2) * 0.35), y: -20 };
        end = { x: width * (0.5 + random(3) * 0.35), y: height + 20 };
    } else if (mode === 1) {
        start = { x: width * (0.55 + random(2) * 0.3), y: -20 };
        end = { x: width * (0.1 + random(3) * 0.35), y: height + 20 };
    } else if (mode === 2) {
        start = { x: -20, y: height * (0.1 + random(2) * 0.3) };
        end = { x: width * (0.55 + random(3) * 0.35), y: height + 20 };
    } else {
        start = { x: width * (0.2 + random(2) * 0.5), y: -20 };
        end = { x: width + 20, y: height * (0.55 + random(3) * 0.3) };
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;

    const normalX = -dy / length;
    const normalY = dx / length;

    // Broad irregular meanders
    const phase1 = random(10) * Math.PI * 2;
    const phase2 = random(11) * Math.PI * 2;
    const phase3 = random(12) * Math.PI * 2;

    const amplitude1 = size * (0.14 + random(13) * 0.12);
    const amplitude2 = size * (0.05 + random(14) * 0.06);
    const amplitude3 = size * 0.02;

    const frequency1 = 1.5 + random(15) * 1.2;
    const frequency2 = 3.2 + random(16) * 1.8;

    const pointCount = 320;
    const points = [];

    for (let i = 0; i <= pointCount; i++) {
        const t = i / pointCount;

        // Fade meanders at the endpoints
        const envelope = Math.sin(Math.PI * t) * 0.85 + 0.15;

        const bend =
            Math.sin(t * Math.PI * 2 * frequency1 + phase1) * amplitude1 +
            Math.sin(t * Math.PI * 2 * frequency2 + phase2) * amplitude2 +
            Math.sin(t * Math.PI * 2 * 7.3 + phase3) * amplitude3;

        let x = mix(start.x, end.x, t) + normalX * bend * envelope;
        let y = mix(start.y, end.y, t) + normalY * bend * envelope;

        // Gently bias the path toward lower elevations
        // without removing its large meanders
        if (i > 0 && i < pointCount) {
            let bestX = x;
            let bestY = y;
            let bestScore = Infinity;

            for (let j = -3; j <= 3; j++) {
                const offset = j * 5;

                const testX = x + normalX * offset;
                const testY = y + normalY * offset;

                const elevation = elevationAt(
                    clamp(testX, 0, width),
                    clamp(testY, 0, height)
                );

                const score = elevation + Math.abs(offset) * 0.004;

                if (score < bestScore) {
                    bestScore = score;
                    bestX = testX;
                    bestY = testY;
                }
            }

            x = mix(x, bestX, 0.3);
            y = mix(y, bestY, 0.3);
        }

        points.push({ x, y });
    }

    // Smooth centerline
    for (let pass = 0; pass < 5; pass++) {
        const copy = points.map(p => ({ ...p }));

        for (let i = 1; i < points.length - 1; i++) {
            points[i].x =
                (copy[i - 1].x + copy[i].x * 2 + copy[i + 1].x) / 4;

            points[i].y =
                (copy[i - 1].y + copy[i].y * 2 + copy[i + 1].y) / 4;
        }
    }

    // Estimate terrain slope and river curvature
    const river = points.map((p, i) => {
        const prev = points[Math.max(0, i - 3)];
        const next = points[Math.min(points.length - 1, i + 3)];

        const tangentX = next.x - prev.x;
        const tangentY = next.y - prev.y;
        const tangentLength = Math.hypot(tangentX, tangentY) || 1;

        const nx = -tangentY / tangentLength;
        const ny = tangentX / tangentLength;

        const d = 15;

        const sx = (
            elevationAt(clamp(p.x + d, 0, width), clamp(p.y, 0, height)) -
            elevationAt(clamp(p.x - d, 0, width), clamp(p.y, 0, height))
        ) / (2 * d);

        const sy = (
            elevationAt(clamp(p.x, 0, width), clamp(p.y + d, 0, height)) -
            elevationAt(clamp(p.x, 0, width), clamp(p.y - d, 0, height))
        ) / (2 * d);

        const slope = Math.hypot(sx, sy);

        const a = points[Math.max(0, i - 12)];
        const b = points[Math.min(points.length - 1, i + 12)];

        const angleA = Math.atan2(p.y - a.y, p.x - a.x);
        const angleB = Math.atan2(b.y - p.y, b.x - p.x);

        const curvature = Math.abs(
            Math.atan2(
                Math.sin(angleB - angleA),
                Math.cos(angleB - angleA)
            )
        );

        return { ...p, nx, ny, slope, curvature, width: 7 };
    });

    // Normalize slope using this river's own terrain
    const slopes = river.map(p => p.slope).sort((a, b) => a - b);

    const lowSlope = slopes[Math.floor(slopes.length * 0.15)];
    const highSlope = slopes[Math.floor(slopes.length * 0.85)];
    const range = Math.max(0.00001, highSlope - lowSlope);

    // Strong variation in width
    for (let i = 0; i < river.length; i++) {
        const p = river[i];
        const t = i / (river.length - 1);

        const flatness = 1 - clamp(
            (p.slope - lowSlope) / range,
            0,
            1
        );

        const bend = clamp(p.curvature / 0.45, 0, 1);

        // Wide, localized expansions
        const expansion =
            Math.pow(Math.max(0, Math.sin(t * Math.PI * 7 + phase2)), 4) *
            (7 + random(40) * 9);

        let riverWidth =
            7 +
            flatness * 14 +
            bend * 13 +
            expansion;

        // Additional slow width rhythm
        riverWidth *=
            0.85 + 0.3 * Math.sin(t * Math.PI * 4 + phase3);

        p.width = clamp(riverWidth, 10, 25);
    }

    // Smooth width transitions
    for (let pass = 0; pass < 12; pass++) {
        const copy = river.map(p => p.width);

        for (let i = 1; i < river.length - 1; i++) {
            river[i].width =
                (copy[i - 1] + copy[i] * 2 + copy[i + 1]) / 4;
        }
    }

    // Draw one solid gray-blue river ribbon
    ctx.save();
    ctx.beginPath();

    for (let i = 0; i < river.length; i++) {
        const p = river[i];
        const half = p.width / 2;

        const x = p.x + p.nx * half;
        const y = p.y + p.ny * half;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    for (let i = river.length - 1; i >= 0; i--) {
        const p = river[i];
        const half = p.width / 2;

        ctx.lineTo(
            p.x - p.nx * half,
            p.y - p.ny * half
        );
    }

    ctx.closePath();
    ctx.fillStyle = "rgba(48, 54, 89, 0.6)";
    ctx.fill();
    ctx.restore();
}

function generateTerrainBackground() {
    if (!cityEnvironment) return;

    const width = map.clientWidth;
    const height = map.clientHeight;

    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;

    terrainCanvas.width = Math.round(width * dpr);
    terrainCanvas.height = Math.round(height * dpr);

    terrainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    terrainCtx.clearRect(0, 0, width, height);

    const terrainType = cityEnvironment.terrainType;

    // Terrain intensity depends on geographic classification
    const settings = {
        Plains: {
            strength: 0.35,
            scale: 0.75
        },
        Hills: {
            strength: 0.65,
            scale: 1.0
        },
        Mountains: {
            strength: 1.0,
            scale: 1.25
        }
    };

    const setting = settings[terrainType] || settings.Hills;

    // Smooth interpolation
    function smoothstep(t) {
        return t * t * (3 - 2 * t);
    }

    // Deterministic pseudo-random values
    function hash(x, y, seed) {
        const value = Math.sin(
            x * 127.1 +
            y * 311.7 +
            seed * 74.7
        ) * 43758.5453;

        return value - Math.floor(value);
    }

    // Smooth 2D noise
    function noise(x, y, seed) {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);

        const fx = smoothstep(x - x0);
        const fy = smoothstep(y - y0);

        const a = hash(x0, y0, seed);
        const b = hash(x0 + 1, y0, seed);
        const c = hash(x0, y0 + 1, seed);
        const d = hash(x0 + 1, y0 + 1, seed);

        const top = a + (b - a) * fx;
        const bottom = c + (d - c) * fx;

        return top + (bottom - top) * fy;
    }

    // Create an elevation field with several spatial scales
    function elevationAt(x, y) {
        const nx = x / width;
        const ny = y / height;

        const broad = noise(
            nx * 3.2,
            ny * 3.2,
            terrainSeed + 11
        );
        
        const medium = noise(
            nx * 8.0,
            ny * 8.0,
            terrainSeed + 23
        );
        
        const fine = noise(
            nx * 20.0,
            ny * 20.0,
            terrainSeed + 37
        );

        let elevation =
            broad * 0.58 +
            medium * 0.30 +
            fine * 0.12;

        // District positions influence the local landscape
        let districtInfluence = 0;

        for (const district of districts) {
            const dx = nx - district.x / 100;
            const dy = ny - district.y / 100;

            const distanceSquared = dx * dx + dy * dy;

            const influence = Math.exp(
                -distanceSquared / 0.018
            );

            districtInfluence = Math.max(
                districtInfluence,
                influence
            );
        }

        elevation += districtInfluence * 0.10;

        return Math.min(1, Math.max(0, elevation));
    }

    // Render continuous grayscale elevation bands
 
    // Render fragmented grayscale terrain
    const cellSize = 10;

    const terrainSettings = {
        Plains: {
            contrast: 0.65,
            density: 0.80,
            darkness: 0.50
        },
        Hills: {
            contrast: 1.0,
            density: 0.80,
            darkness: 0.65
        },
        Mountains: {
            contrast: 1.3,
            density: 0.80,
            darkness: 0.80
        }
    };

    const visual = terrainSettings[terrainType] ||
        terrainSettings.Hills;

    for (let y = 0; y < height; y += cellSize) {
        for (let x = 0; x < width; x += cellSize) {

            // Read the continuous virtual elevation field
            let elevation = elevationAt(
                x + cellSize / 2,
                y + cellSize / 2
            );

            elevation =
                0.5 + (elevation - 0.5) * visual.contrast;

            // Low elevations remain mostly white
            const normalized = Math.max(
                0,
                Math.min(1, (elevation - 0.22) / 0.42)
            );

            const density =
                normalized * visual.density;

            // Stable random variation within each terrain seed
            const randomValue = hash(
                Math.floor(x / cellSize),
                Math.floor(y / cellSize),
                terrainSeed + 101
            );

            if (randomValue > density) continue;

            // Darker fragments at higher elevations
            
            
            const elevationLevel = Math.min(
                5,
                Math.floor(normalized * 6)
            );

            // Six grayscale elevation levels
            const grayLevels = [
                230,
                210,
                190,
                170,
                150,
                130
            ];

            const grayVariation =
                (hash(x, y, terrainSeed + 202) - 0.5) * 8;

            const gray = Math.max(
                100,
                Math.min(
                    248,
                    grayLevels[elevationLevel] + grayVariation
                )
            );

            // const baseGray =
            //     242 - normalized * 115 * visual.darkness;

            // const grayVariation =
            //     (hash(x, y, terrainSeed + 202) - 0.5) * 35;

            // const gray = Math.max(
            //     100,
            //     Math.min(248, baseGray + grayVariation)
            // );

            // Irregular polygon dimensions
            const sizeVariation = hash(
                x,
                y,
                terrainSeed + 303
            );

            const size = cellSize * (
                1.05 + sizeVariation * 0.75
            );

            const offsetX =
                (hash(x, y, terrainSeed + 404) - 0.5) *
                cellSize * 0.4;

            const offsetY =
                (hash(x, y, terrainSeed + 505) - 0.5) *
                cellSize * 0.4;

            terrainCtx.fillStyle =
                `rgb(${gray}, ${gray}, ${gray})`;

            terrainCtx.beginPath();

            const sides = 5 +
                Math.floor(
                    hash(x, y, terrainSeed + 606) * 3
                );

            for (let i = 0; i < sides; i++) {
                const angle =
                    i / sides * Math.PI * 2;

                const radius =
                    size * (
                        0.42 +
                        hash(
                            x + i * 7,
                            y + i * 11,
                            terrainSeed + 707
                        ) * 0.22
                    );

                const px =
                    x + offsetX +
                    Math.cos(angle) * radius;

                const py =
                    y + offsetY +
                    Math.sin(angle) * radius;

                if (i === 0) {
                    terrainCtx.moveTo(px, py);
                } else {
                    terrainCtx.lineTo(px, py);
                }
            }

            terrainCtx.closePath();
            terrainCtx.fill();
        }
    }

    // // Keep the existing river
    generateRiver(terrainCtx, width, height, elevationAt);

    console.log(
        "Terrain background generated:",
        terrainType
    );
}

// 10. Generate nineteen random connections
function makeConnections() {
    connections = [];

    for (let i = 0; i < 19; i++) {
        const a = Math.floor(Math.random() * 9);
        let b = Math.floor(Math.random() * 9);

        while (a === b) {
            b = Math.floor(Math.random() * 9);
        }

        connections.push([a, b]);
    }
}

// 11. Update line positions and number labels
function updateLines() {
    const mapRect = map.getBoundingClientRect();

    for (let i = 0; i < lines.length; i++) {
        const a = pieces[connections[i][0]];
        const b = pieces[connections[i][1]];

        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();

        const x1 =
            rectA.left + rectA.width / 2 - mapRect.left;

        const y1 =
            rectA.top + rectA.height / 2 - mapRect.top;

        const x2 =
            rectB.left + rectB.width / 2 - mapRect.left;

        const y2 =
            rectB.top + rectB.height / 2 - mapRect.top;

        const dx = x2 - x1;
        const dy = y2 - y1;

        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        lines[i].style.left = x1 + "px";
        lines[i].style.top = y1 + "px";
        lines[i].style.width = distance + "px";
        lines[i].style.transform =
            "translateY(-50%) rotate(" + angle + "deg)";
    }

    for (let i = 0; i < pieces.length; i++) {
        const rect = pieces[i].getBoundingClientRect();

        const x = rect.right - mapRect.left + 8;
        const y = rect.top - mapRect.top - 10;

        pieces[i].numberLabel.style.left = x + "px";
        pieces[i].numberLabel.style.top = y + "px";
    }

    requestAnimationFrame(updateLines);
}

// 12. Toggle frames
function toggleFrames() {
    map.classList.toggle("showFrames");
}

// 13. Click to rearrange
document.addEventListener("click", rearrange);

// 14. Initialize
rearrange();
updateLines();
generateGeographicData();
