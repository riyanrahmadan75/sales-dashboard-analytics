/* =========================================================
   Dashboard Penjualan 2024 — script.js
   Charts: Sales Trend, Revenue/Region, Revenue/Category,
           Sales/Salesperson, Customer Type, Payment Method,
           Sales Channel, Discount vs Revenue (Scatter),
           Top 10 Transactions, Qty per Category
   ========================================================= */

'use strict';

// ── Palette ──────────────────────────────────────────────
const PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1',
];

// ── Chart registry: keep instances for destruction/update ─
const charts = {};

// ── Formatter helpers ─────────────────────────────────────
const fmtIDR = (n) =>
  n >= 1_000_000_000
    ? `Rp ${(n / 1_000_000_000).toFixed(1)} M`
    : n >= 1_000_000
    ? `Rp ${(n / 1_000_000).toFixed(1)} Jt`
    : `Rp ${n.toLocaleString('id-ID')}`;

const fmtShort = (n) =>
  n >= 1_000_000_000
    ? `${(n / 1_000_000_000).toFixed(1)} M`
    : n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} Jt`
    : n.toLocaleString('id-ID');

// ── Shared Chart.js defaults ──────────────────────────────
Chart.defaults.font.family = '-apple-system, "Segoe UI", system-ui, sans-serif';
Chart.defaults.font.size   = 11;
Chart.defaults.color       = '#6b7280';
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding  = 14;

// ── Utility: destroy old instance before re-creating ─────
function newChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id).getContext('2d');
  charts[id] = new Chart(ctx, config);
}

// ── Utility: group/aggregate data ────────────────────────
function groupBy(data, key, valueFn) {
  const map = {};
  data.forEach(row => {
    const k = row[key];
    map[k] = (map[k] || 0) + valueFn(row);
  });
  return map;
}

function sortedEntries(obj, desc = true) {
  const entries = Object.entries(obj).map(([k, v]) => ({ k, v }));
  return entries.sort((a, b) => desc ? b.v - a.v : a.v - b.v);
}

// ─────────────────────────────────────────────────────────
//  KPI
// ─────────────────────────────────────────────────────────
function renderKPIs(data) {
  const totalRevenue   = data.reduce((s, r) => s + r.revenue, 0);
  const totalTx        = data.length;
  const totalQty       = data.reduce((s, r) => s + r.qty, 0);
  const avgDiscount    = data.length
    ? (data.reduce((s, r) => s + r.discount, 0) / data.length * 100).toFixed(1)
    : 0;

  document.getElementById('kpiRevenue').textContent  = fmtIDR(totalRevenue);
  document.getElementById('kpiTx').textContent        = totalTx.toLocaleString('id-ID');
  document.getElementById('kpiQty').textContent       = totalQty.toLocaleString('id-ID');
  document.getElementById('kpiDiscount').textContent  = `${avgDiscount}%`;

  document.getElementById('kpiRevenueSub').textContent   = `dari ${totalTx} transaksi`;
  document.getElementById('kpiTxSub').textContent        = 'transaksi tercatat';
  document.getElementById('kpiQtySub').textContent       = 'unit produk';
  document.getElementById('kpiDiscountSub').textContent  = 'rata-rata per transaksi';
}

// ─────────────────────────────────────────────────────────
//  1. SALES TREND (Line chart — monthly revenue)
// ─────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function renderTrend(data) {
  const monthly = Array(12).fill(0);
  data.forEach(r => {
    const m = new Date(r.date).getMonth();
    monthly[m] += r.revenue;
  });

  newChart('chartTrend', {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [{
        label: 'Revenue',
        data: monthly,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${fmtIDR(c.raw)}` } }
      },
      scales: {
        y: { ticks: { callback: v => fmtShort(v) }, grid: { color: '#f3f4f6' } },
        x: { grid: { display: false } },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────
//  2. REVENUE PER REGION (Doughnut)
// ─────────────────────────────────────────────────────────
function renderRegion(data) {
  const map  = groupBy(data, 'region', r => r.revenue);
  const entries = sortedEntries(map);
  newChart('chartRegion', {
    type: 'doughnut',
    data: {
      labels: entries.map(e => e.k),
      datasets: [{ data: entries.map(e => e.v), backgroundColor: PALETTE, borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${fmtIDR(c.raw)}` } },
      },
      cutout: '62%',
    },
  });
}

// ─────────────────────────────────────────────────────────
//  3. REVENUE PER CATEGORY (Horizontal Bar)
// ─────────────────────────────────────────────────────────
function renderCategory(data) {
  const map = groupBy(data, 'category', r => r.revenue);
  const entries = sortedEntries(map);
  newChart('chartCategory', {
    type: 'bar',
    data: {
      labels: entries.map(e => e.k),
      datasets: [{
        label: 'Revenue',
        data: entries.map(e => e.v),
        backgroundColor: PALETTE.slice(0, entries.length),
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${fmtIDR(c.raw)}` } },
      },
      scales: {
        x: { ticks: { callback: v => fmtShort(v) }, grid: { color: '#f3f4f6' } },
        y: { grid: { display: false } },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────
//  4. SALES PER SALESPERSON (Bar)
// ─────────────────────────────────────────────────────────
function renderSalesperson(data) {
  const map = groupBy(data, 'salesperson', r => r.revenue);
  const entries = sortedEntries(map);
  newChart('chartSalesperson', {
    type: 'bar',
    data: {
      labels: entries.map(e => e.k),
      datasets: [{
        label: 'Revenue',
        data: entries.map(e => e.v),
        backgroundColor: PALETTE.slice(0, entries.length),
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${fmtIDR(c.raw)}` } },
      },
      scales: {
        y: { ticks: { callback: v => fmtShort(v) }, grid: { color: '#f3f4f6' } },
        x: { grid: { display: false } },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────
//  5. CUSTOMER TYPE DISTRIBUTION (Pie)
// ─────────────────────────────────────────────────────────
function renderCustomer(data) {
  const map = groupBy(data, 'customer_type', r => r.revenue);
  const entries = sortedEntries(map);
  newChart('chartCustomer', {
    type: 'pie',
    data: {
      labels: entries.map(e => e.k),
      datasets: [{ data: entries.map(e => e.v), backgroundColor: ['#3b82f6','#10b981'], borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${fmtIDR(c.raw)}` } },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────
//  6. PAYMENT METHOD USAGE (Doughnut)
// ─────────────────────────────────────────────────────────
function renderPayment(data) {
  const map = groupBy(data, 'payment', r => 1);
  const entries = sortedEntries(map);
  newChart('chartPayment', {
    type: 'doughnut',
    data: {
      labels: entries.map(e => e.k),
      datasets: [{ data: entries.map(e => e.v), backgroundColor: ['#f59e0b','#3b82f6','#10b981'], borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw} transaksi` } },
      },
      cutout: '55%',
    },
  });
}

// ─────────────────────────────────────────────────────────
//  7. SALES CHANNEL DISTRIBUTION (Bar)
// ─────────────────────────────────────────────────────────
function renderChannel(data) {
  const map = groupBy(data, 'channel', r => r.revenue);
  const entries = sortedEntries(map);
  newChart('chartChannel', {
    type: 'bar',
    data: {
      labels: entries.map(e => e.k),
      datasets: [{
        label: 'Revenue',
        data: entries.map(e => e.v),
        backgroundColor: ['#6366f1','#f97316'],
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${fmtIDR(c.raw)}` } },
      },
      scales: {
        y: { ticks: { callback: v => fmtShort(v) }, grid: { color: '#f3f4f6' } },
        x: { grid: { display: false } },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────
//  8. DISCOUNT vs REVENUE — Scatter Plot
// ─────────────────────────────────────────────────────────
function renderScatter(data) {
  // Group by category for colour coding
  const categories = [...new Set(data.map(r => r.category))];
  const datasets = categories.map((cat, i) => ({
    label: cat,
    data: data
      .filter(r => r.category === cat)
      .map(r => ({ x: +(r.discount * 100).toFixed(1), y: r.revenue })),
    backgroundColor: PALETTE[i] + 'cc',
    pointRadius: 5,
    pointHoverRadius: 7,
  }));

  newChart('chartScatter', {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: c => ` Diskon: ${c.parsed.x}% · Revenue: ${fmtIDR(c.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Diskon (%)', font: { size: 10 } },
          grid: { color: '#f3f4f6' },
        },
        y: {
          ticks: { callback: v => fmtShort(v) },
          title: { display: true, text: 'Revenue', font: { size: 10 } },
          grid: { color: '#f3f4f6' },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────
//  9. TOP 10 HIGHEST SALES (Horizontal Bar)
// ─────────────────────────────────────────────────────────
function renderTop10(data) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const labels = sorted.map(r => `#${r.id} ${r.product} · ${r.region}`);
  newChart('chartTop10', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: sorted.map(r => r.revenue),
        backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${fmtIDR(c.raw)}` } },
      },
      scales: {
        x: { ticks: { callback: v => fmtShort(v) }, grid: { color: '#f3f4f6' } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────
//  10. QTY SOLD PER CATEGORY (Bar)
// ─────────────────────────────────────────────────────────
function renderQtyCategory(data) {
  const map = groupBy(data, 'category', r => r.qty);
  const entries = sortedEntries(map);
  newChart('chartQtyCategory', {
    type: 'bar',
    data: {
      labels: entries.map(e => e.k),
      datasets: [{
        label: 'Qty',
        data: entries.map(e => e.v),
        backgroundColor: PALETTE.slice(0, entries.length),
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.raw.toLocaleString('id-ID')} unit` } },
      },
      scales: {
        y: { grid: { color: '#f3f4f6' } },
        x: { grid: { display: false } },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────
//  FILTER ENGINE
// ─────────────────────────────────────────────────────────
let allData = [];

function applyFilters() {
  const month    = document.getElementById('filterMonth').value;
  const region   = document.getElementById('filterRegion').value;
  const category = document.getElementById('filterCategory').value;
  const customer = document.getElementById('filterCustomer').value;

  const filtered = allData.filter(r => {
    const m = new Date(r.date).getMonth() + 1;
    if (month    !== 'all' && m !== +month)           return false;
    if (region   !== 'all' && r.region   !== region)  return false;
    if (category !== 'all' && r.category !== category) return false;
    if (customer !== 'all' && r.customer_type !== customer) return false;
    return true;
  });

  renderAll(filtered);
}

function renderAll(data) {
  renderKPIs(data);
  renderTrend(data);
  renderRegion(data);
  renderCategory(data);
  renderSalesperson(data);
  renderCustomer(data);
  renderPayment(data);
  renderChannel(data);
  renderScatter(data);
  renderTop10(data);
  renderQtyCategory(data);
}

// ─────────────────────────────────────────────────────────
//  BOOTSTRAP — load JSON then init
// ─────────────────────────────────────────────────────────
async function init() {
  try {
    const res  = await fetch('data/sales.json');
    allData    = await res.json();
    renderAll(allData);

    // Wire up filters
    ['filterMonth','filterRegion','filterCategory','filterCustomer'].forEach(id => {
      document.getElementById(id).addEventListener('change', applyFilters);
    });

    document.getElementById('resetFilters').addEventListener('click', () => {
      ['filterMonth','filterRegion','filterCategory','filterCustomer'].forEach(id => {
        document.getElementById(id).value = 'all';
      });
      renderAll(allData);
    });
  } catch (err) {
    console.error('Gagal memuat data:', err);
    alert('Gagal memuat data penjualan. Pastikan file data/sales.json tersedia dan Anda membuka halaman melalui server lokal (bukan file://).');
  }
}

document.addEventListener('DOMContentLoaded', init);
