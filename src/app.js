const chartInstances = {};
const MAX_ROWS = 100000;

const COLORS = [
    "rgba(144, 200, 240, 0.8)", "rgba(91, 164, 212, 0.8)",
    "rgba(59, 130, 246, 0.8)",  "rgba(147, 197, 253, 0.8)",
    "rgba(125, 211, 252, 0.8)", "rgba(56, 189, 248, 0.8)",
    "rgba(14, 165, 233, 0.8)",  "rgba(186, 230, 253, 0.8)",
];
const BORDERS = COLORS.map(c => c.replace("0.8", "1"));

Chart.defaults.color = "#4a7fa5";
Chart.defaults.font.family = "Inter, Segoe UI, sans-serif";
Chart.defaults.font.size = 12;

// ── State ─────────────────────────────────────────────
let currentRows   = [];
let currentFields = [];
let currentFileName = "";
let activeFilters = [];

// ── Toast ─────────────────────────────────────────────
function toast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("visible"));
    setTimeout(() => {
        el.classList.remove("visible");
        setTimeout(() => el.remove(), 300);
    }, 3500);
}

// ── Loading ───────────────────────────────────────────
function showLoading() { document.getElementById("loading-overlay").classList.remove("hidden"); }
function hideLoading() { document.getElementById("loading-overlay").classList.add("hidden"); }

// ── Nav state ─────────────────────────────────────────
function setNavDashboard(fileName) {
    document.getElementById("nav-right").innerHTML = `
        <span class="nav-filename">${fileName}</span>
        <button class="nav-btn-ghost" id="nav-reset-btn">← New file</button>
    `;
    document.getElementById("nav-reset-btn").addEventListener("click", resetToLanding);
}

function setNavLanding() {
    document.getElementById("nav-right").innerHTML = `
        <button class="nav-btn-ghost" id="nav-sample-btn">Try sample data</button>
        <label for="file-input" class="nav-btn-primary">Upload CSV</label>
    `;
    document.getElementById("nav-sample-btn").addEventListener("click", loadSampleData);
}

// ── Setup ─────────────────────────────────────────────
function setup() {
    const fileInput = document.getElementById("file-input");
    const dropZone  = document.getElementById("drop-zone");

    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener("change", (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });

    document.getElementById("sample-data-btn").addEventListener("click", loadSampleData);
    document.getElementById("nav-sample-btn").addEventListener("click", loadSampleData);
    document.getElementById("reset-btn").addEventListener("click", resetToLanding);
    document.getElementById("export-btn").addEventListener("click", exportCSV);
    document.getElementById("share-btn").addEventListener("click", copyShareLink);
    document.getElementById("footer-upload").addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); });
    document.getElementById("footer-sample").addEventListener("click", (e) => { e.preventDefault(); loadSampleData(); });

    setupFilterBar();
}

function resetToLanding() {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("landing-screen").classList.remove("hidden");
    document.getElementById("file-input").value = "";
    setNavLanding();
    history.replaceState(null, "", window.location.pathname);
}

// ── Sample data ───────────────────────────────────────
function loadSampleData() {
    const regions  = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"];
    const products = ["Analytics Pro", "Data Suite", "Insights Basic", "Enterprise Plan", "Starter Pack"];
    const statuses = ["Completed", "Pending", "Cancelled", "Refunded"];
    const rows = ["date,region,product,status,revenue,quantity,profit_margin"];

    for (let i = 0; i < 200; i++) {
        const d = new Date(2022, 0, 1);
        d.setDate(d.getDate() + Math.floor(Math.random() * 730));
        const date    = d.toISOString().split("T")[0];
        const region  = regions[Math.floor(Math.random() * regions.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        const status  = statuses[Math.floor(Math.random() * statuses.length)];
        const revenue = Math.floor(Math.random() * 9000 + 500);
        const qty     = Math.floor(Math.random() * 50 + 1);
        const margin  = (Math.random() * 0.55 + 0.1).toFixed(2);
        rows.push(`${date},${region},${product},${status},${revenue},${qty},${margin}`);
    }

    handleCSVText(rows.join("\n"), "sample-data.csv");
    toast("Sample data loaded — 200 rows, 7 columns", "success");
}

// ── File handling ─────────────────────────────────────
function handleFile(file) {
    if (!file.name.endsWith(".csv")) {
        toast("Please upload a .csv file", "error");
        return;
    }
    showLoading();
    setTimeout(() => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
                hideLoading();
                if (!result.data.length) { toast("The file appears to be empty", "error"); return; }
                currentRows = result.data;
                currentFields = result.meta.fields;
                currentFileName = file.name;
                renderDashboard(file.name, result.data, result.meta.fields);
            },
            error: (err) => { hideLoading(); toast("Could not parse file: " + err.message, "error"); },
        });
    }, 50); // allow loading overlay to paint first
}

function handleCSVText(text, fileName) {
    showLoading();
    setTimeout(() => {
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
                hideLoading();
                currentRows = result.data;
                currentFields = result.meta.fields;
                currentFileName = fileName;
                renderDashboard(fileName, result.data, result.meta.fields);
            },
        });
    }, 50);
}

// ── Export ────────────────────────────────────────────
function exportCSV() {
    if (!currentRows.length) return;
    const csv  = Papa.unparse({ fields: currentFields, data: currentRows });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = currentFileName || "export.csv"; a.click();
    URL.revokeObjectURL(url);
    toast("CSV exported", "success");
}

function copyShareLink() {
    if (!currentRows.length) return;
    const csv  = Papa.unparse({ fields: currentFields, data: currentRows });
    const data = btoa(encodeURIComponent(csv));
    const url  = `${location.origin}${location.pathname}?data=${data}&name=${encodeURIComponent(currentFileName)}`;
    navigator.clipboard.writeText(url).then(() => {
        toast("Link copied to clipboard", "success");
        const btn = document.getElementById("share-btn");
        const orig = btn.textContent;
        btn.textContent = "✓ Copied!";
        setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => toast("Could not copy — try manually", "error"));
}

function loadFromURL() {
    const params = new URLSearchParams(location.search);
    const data   = params.get("data");
    const name   = params.get("name") || "shared.csv";
    if (!data) return;
    try { handleCSVText(decodeURIComponent(atob(data)), name); }
    catch { toast("Could not load shared data", "error"); }
}

// ── Date helpers ──────────────────────────────────────
function isDateLike(v) {
    if (!v || typeof v !== "string") return false;
    if (!/[-\/.]/.test(v) && !/^\d{4}$/.test(v)) return false;
    const d = new Date(v);
    return !isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2200;
}

function groupByDate(values) {
    const dates = values.map(v => new Date(v)).filter(d => !isNaN(d));
    if (!dates.length) return null;
    const rangeYears = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24 * 365);
    const freq = {};
    dates.forEach(d => {
        const key = rangeYears > 2
            ? String(d.getFullYear())
            : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        freq[key] = (freq[key] || 0) + 1;
    });
    const sorted = Object.entries(freq).sort((a, b) => a[0].localeCompare(b[0]));
    return { labels: sorted.map(e => e[0]), counts: sorted.map(e => e[1]) };
}

// ── Stats helpers ─────────────────────────────────────
function median(sorted) {
    const m = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[m - 1] + sorted[m]) / 2 : sorted[m];
}
function fmt(n) {
    return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// ── Large file sampling ───────────────────────────────
function sampleRows(rows, n) {
    const step = rows.length / n;
    return Array.from({ length: n }, (_, i) => rows[Math.floor(i * step)]);
}

// ── Column analysis ───────────────────────────────────
function analyzeColumns(fields, rows) {
    const chartable = [];
    const skipped   = [];

    fields.forEach(field => {
        const raw    = rows.map(r => r[field]).filter(v => v != null && v.toString().trim() !== "");
        const unique = [...new Set(raw)];
        const sample = raw.slice(0, 50);

        if (sample.filter(isDateLike).length / sample.length > 0.8) {
            const grouped = groupByDate(raw);
            if (grouped) { chartable.push({ field, type: "date", ...grouped }); return; }
        }

        const numeric   = raw.map(v => parseFloat(v)).filter(v => !isNaN(v));
        const isNumeric = raw.length > 0 && numeric.length / raw.length > 0.8;
        if (isNumeric) {
            const sorted = [...numeric].sort((a, b) => a - b);
            chartable.push({
                field, type: "numeric", values: numeric,
                min: sorted[0], max: sorted[sorted.length - 1],
                mean: numeric.reduce((a, b) => a + b, 0) / numeric.length,
                median: median(sorted),
            });
            return;
        }

        if (unique.length >= 2 && unique.length <= 30) {
            const freq = {};
            raw.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
            const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
            chartable.push({ field, type: "categorical", freq: Object.fromEntries(sorted) });
            return;
        }

        const reason = unique.length <= 1
            ? "only one unique value"
            : unique.length > 30
                ? `${unique.length} unique text values — too varied to chart`
                : "could not determine type";
        skipped.push({ field, reason });
    });

    return { chartable, skipped };
}

// ── Filters ───────────────────────────────────────────
function applyFilters(rows) {
    if (!activeFilters.length) return rows;
    return rows.filter(row =>
        activeFilters.every(({ field, op, value }) => {
            const cell = (row[field] ?? "").toString();
            const v    = value.toLowerCase();
            const n    = parseFloat(cell);
            switch (op) {
                case "is":       return cell.toLowerCase() === v;
                case "is not":   return cell.toLowerCase() !== v;
                case "contains": return cell.toLowerCase().includes(v);
                case ">":        return n > parseFloat(value);
                case "<":        return n < parseFloat(value);
                case ">=":       return n >= parseFloat(value);
                case "<=":       return n <= parseFloat(value);
                default:         return true;
            }
        })
    );
}

function setupFilterBar() {
    document.getElementById("add-filter-btn").addEventListener("click", () => {
        const form = document.getElementById("filter-form");
        form.classList.remove("hidden");

        const colSel = document.getElementById("filter-col");
        colSel.innerHTML = currentFields.map(f => `<option value="${f}">${f}</option>`).join("");
        updateFilterOps();
        colSel.addEventListener("change", updateFilterOps);
    });

    document.getElementById("filter-cancel-btn").addEventListener("click", closeFilterForm);

    document.getElementById("filter-apply-btn").addEventListener("click", () => {
        const field = document.getElementById("filter-col").value;
        const op    = document.getElementById("filter-op").value;
        const value = document.getElementById("filter-val").value.trim();
        if (!value) { toast("Enter a value to filter by", "error"); return; }
        activeFilters.push({ field, op, value });
        closeFilterForm();
        rerender();
    });
}

function updateFilterOps() {
    const field   = document.getElementById("filter-col").value;
    const sample  = currentRows.slice(0, 20).map(r => r[field]).filter(Boolean);
    const numeric = sample.filter(v => !isNaN(parseFloat(v))).length / sample.length > 0.8;
    const ops     = numeric
        ? [["is", "="], ["is not", "≠"], [">", ">"], ["<", "<"], [">=", "≥"], ["<=", "≤"]]
        : [["is", "is"], ["is not", "is not"], ["contains", "contains"]];
    document.getElementById("filter-op").innerHTML = ops.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
}

function closeFilterForm() {
    document.getElementById("filter-form").classList.add("hidden");
    document.getElementById("filter-val").value = "";
}

function renderFilterChips() {
    const container = document.getElementById("filter-chips");
    container.innerHTML = activeFilters.map((f, i) => `
        <div class="filter-chip">
            <span>${f.field} <strong>${f.op}</strong> "${f.value}"</span>
            <button class="chip-remove" data-index="${i}">×</button>
        </div>
    `).join("");
    container.querySelectorAll(".chip-remove").forEach(btn => {
        btn.addEventListener("click", () => {
            activeFilters.splice(parseInt(btn.dataset.index), 1);
            rerender();
        });
    });
}

function rerender() {
    renderFilterChips();
    const filtered = applyFilters(currentRows);
    renderCharts(filtered, currentFields);
}

function histogram(values, bins = 10) {
    const min = Math.min(...values), max = Math.max(...values);
    if (min === max) return { labels: [String(min)], counts: [values.length] };
    const size = (max - min) / bins;
    const counts = Array(bins).fill(0);
    const labels = Array.from({ length: bins }, (_, i) => {
        const lo = min + i * size;
        return `${lo % 1 === 0 ? lo : lo.toFixed(1)}`;
    });
    values.forEach(v => { counts[Math.min(Math.floor((v - min) / size), bins - 1)]++; });
    return { labels, counts };
}

// ── Chart config ──────────────────────────────────────
function buildChartConfig(type, rawLabels, rawData, colorIndex) {
    const color  = COLORS[colorIndex % COLORS.length];
    const border = BORDERS[colorIndex % BORDERS.length];
    const isPie  = type === "doughnut" || type === "pie";

    let labels = rawLabels, data = rawData;
    if (isPie && rawLabels.length > 10) {
        labels = [...rawLabels.slice(0, 10), "Other"];
        data   = [...rawData.slice(0, 10), rawData.slice(10).reduce((a, b) => a + b, 0)];
    }

    const multiColor = labels.map((_, i) => COLORS[i % COLORS.length]);

    return {
        type,
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: isPie ? multiColor : color,
                borderColor:     isPie ? multiColor.map(c => c.replace("0.8", "1")) : border,
                borderWidth: 1,
                fill:    type === "line" ? true : undefined,
                tension: type === "line" ? 0.3  : undefined,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: isPie,
                    position: "right",
                    labels: { boxWidth: 12, font: { size: 11 }, padding: 8 },
                },
                tooltip: { callbacks: { label: ctx => ` ${ctx.formattedValue}` } },
            },
            scales: isPie ? {} : {
                x: { ticks: { maxRotation: 45, font: { size: 11 } } },
                y: { beginAtZero: true, ticks: { precision: 0 } },
            },
        },
    };
}

function renderChart(canvasId, type, labels, data, colorIndex) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = new Chart(document.getElementById(canvasId), buildChartConfig(type, labels, data, colorIndex));
}

// ── Chart card ────────────────────────────────────────
function createChartCard(field, labels, data, colorIndex, defaultType, stats = null, isDate = false) {
    const id = `chart-${field.replace(/[^a-z0-9]/gi, "-")}`;

    const typeBtns = [
        { key: "bar",      label: "Bar" },
        { key: "line",     label: "Line" },
        ...(!isDate ? [{ key: "doughnut", label: "Pie" }] : []),
    ].map(t => `<button class="type-btn ${t.key === defaultType ? "active" : ""}" data-type="${t.key}">${t.label}</button>`).join("");

    const statsHtml = stats ? `
        <div class="stats-panel">
            <div class="stat-chip"><span class="chip-label">Min</span><span class="chip-value">${fmt(stats.min)}</span></div>
            <div class="stat-chip"><span class="chip-label">Max</span><span class="chip-value">${fmt(stats.max)}</span></div>
            <div class="stat-chip"><span class="chip-label">Mean</span><span class="chip-value">${fmt(stats.mean)}</span></div>
            <div class="stat-chip"><span class="chip-label">Median</span><span class="chip-value">${fmt(stats.median)}</span></div>
        </div>` : "";

    const card = document.createElement("div");
    card.className = "chart-section";
    card.innerHTML = `
        <div class="card-header">
            <h2>${field}</h2>
            <div class="card-actions">
                <div class="type-switcher">${typeBtns}</div>
                <button class="download-btn" title="Download chart as PNG">↓</button>
            </div>
        </div>
        <div class="chart-wrapper"><canvas id="${id}"></canvas></div>
        ${statsHtml}
    `;

    document.getElementById("charts-grid").appendChild(card);

    card.querySelectorAll(".type-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            card.querySelectorAll(".type-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderChart(id, btn.dataset.type, labels, data, colorIndex);
        });
    });

    card.querySelector(".download-btn").addEventListener("click", () => {
        const canvas = document.getElementById(id);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `${field.replace(/\s+/g, "-")}-chart.png`;
        a.click();
        toast(`Chart downloaded`, "success");
    });

    renderChart(id, defaultType, labels, data, colorIndex);
}

// ── Chart rendering (called on load + filter changes) ──
function renderCharts(rows, fields) {
    Object.values(chartInstances).forEach(c => c.destroy());
    Object.keys(chartInstances).forEach(k => delete chartInstances[k]);
    document.getElementById("charts-grid").innerHTML = "";

    const { chartable, skipped } = analyzeColumns(fields, rows);
    const dateCols        = chartable.filter(c => c.type === "date");
    const categoricalCols = chartable.filter(c => c.type === "categorical");
    const numericCols     = chartable.filter(c => c.type === "numeric");

    // Skipped columns notice
    const notice = document.getElementById("skipped-notice");
    if (skipped.length) {
        notice.classList.remove("hidden");
        notice.innerHTML = `
            <span class="skipped-label">⚠ ${skipped.length} column${skipped.length > 1 ? "s" : ""} skipped:</span>
            ${skipped.map(s => `<span class="skipped-chip" title="${s.reason}">${s.field}</span>`).join("")}
            <span class="skipped-why">Hover chips for details</span>
        `;
    } else {
        notice.classList.add("hidden");
    }

    // Update row count card to reflect filtered count
    const rowCard = document.querySelector(".stat-card .stat-value");
    if (rowCard && activeFilters.length) {
        rowCard.textContent = rows.length.toLocaleString();
        rowCard.closest(".stat-card").classList.add("filtered");
    } else if (rowCard) {
        rowCard.closest(".stat-card").classList.remove("filtered");
    }

    dateCols.forEach((col, i) =>
        createChartCard(col.field, col.labels, col.counts, i, "line", null, true));

    categoricalCols.forEach((col, i) => {
        const top = Object.entries(col.freq).slice(0, 10);
        createChartCard(col.field, top.map(e => e[0]), top.map(e => e[1]), dateCols.length + i, "bar");
    });

    numericCols.forEach((col, i) => {
        const { labels, counts } = histogram(col.values);
        createChartCard(col.field, labels, counts, dateCols.length + categoricalCols.length + i, "bar",
            { min: col.min, max: col.max, mean: col.mean, median: col.median });
    });
}

// ── Dashboard (first load only) ───────────────────────
function renderDashboard(fileName, allRows, fields) {
    activeFilters = [];
    document.getElementById("filter-chips").innerHTML = "";
    document.getElementById("filter-form").classList.add("hidden");
    document.getElementById("summary-cards").innerHTML = "";

    let rows = allRows, sampledFrom = null;
    if (allRows.length > MAX_ROWS) {
        rows = sampleRows(allRows, MAX_ROWS);
        sampledFrom = allRows.length;
    }

    const { chartable } = analyzeColumns(fields, rows);
    const dateCols        = chartable.filter(c => c.type === "date");
    const categoricalCols = chartable.filter(c => c.type === "categorical");
    const numericCols     = chartable.filter(c => c.type === "numeric");

    if (!chartable.length) {
        toast("No chartable columns found — check your CSV format", "error");
        return;
    }

    document.getElementById("landing-screen").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("file-title").textContent = fileName.replace(/\.csv$/i, "");
    setNavDashboard(fileName);

    // Sample banner
    const existingBanner = document.getElementById("sample-banner");
    if (existingBanner) existingBanner.remove();
    if (sampledFrom) {
        const banner = document.createElement("div");
        banner.id = "sample-banner";
        banner.className = "sample-banner";
        banner.textContent = `Large file — showing a representative sample of ${MAX_ROWS.toLocaleString()} rows from ${sampledFrom.toLocaleString()} total.`;
        document.querySelector(".page-header").appendChild(banner);
    }

    // Summary cards
    const summaryEl = document.getElementById("summary-cards");
    [
        { label: "Rows",        value: (sampledFrom || allRows.length).toLocaleString() },
        { label: "Columns",     value: fields.length },
        { label: "Numeric",     value: numericCols.length },
        { label: "Categorical", value: categoricalCols.length },
        { label: "Date",        value: dateCols.length },
    ].forEach(({ label, value }) => {
        summaryEl.innerHTML += `<div class="stat-card"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
    });

    renderCharts(rows, fields);
    toast(`${chartable.length} charts generated from ${fields.length} columns`, "success");
}

// ── Init ──────────────────────────────────────────────
window.addEventListener("load", () => {
    setup();
    loadFromURL();
});
