/* === Chart.js Wrappers === */

(function () {
  'use strict';

  /* global Chart */

  var chartInstances = {};

  function destroyChart(canvasId) {
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
      delete chartInstances[canvasId];
    }
  }

  function destroyAllCharts() {
    Object.keys(chartInstances).forEach(destroyChart);
  }

  function getChartDefaults() {
    var style = getComputedStyle(document.body);
    return {
      text3: style.getPropertyValue('--text3').trim() || '#555552',
      gridColor: 'rgba(255,255,255,0.05)',
      bg3: style.getPropertyValue('--bg3').trim() || '#1e1e1e',
      accent: style.getPropertyValue('--accent').trim() || '#888884',
      accentDim: style.getPropertyValue('--accent-dim').trim() || 'rgba(136,136,132,0.08)',
      fontMono: "'DM Mono', monospace",
    };
  }

  function createDistributionChart(canvasId, distData) {
    destroyChart(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    var d = getChartDefaults();

    var colors = [
      '#60a0f0', '#7ab0f0', '#94c0f0', '#b0d0f0',
      '#999999',
      '#f0c080', '#f0a060', '#f06060'
    ];

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: distData.map(function (b) { return b.label; }),
        datasets: [{
          data: distData.map(function (b) { return b.count; }),
          backgroundColor: colors,
          borderRadius: 3,
          maxBarThickness: 40,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
            grid: { color: d.gridColor },
          },
          y: {
            ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
            grid: { color: d.gridColor },
            beginAtZero: true,
          },
        },
      },
    });
  }

  function createCoverageChart(canvasId, compCoverage) {
    destroyChart(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    var d = getChartDefaults();

    var entries = Object.entries(compCoverage)
      .sort(function (a, b) { return b[1] - a[1]; });
    var labels = entries.map(function (e) { return e[0]; });
    var values = entries.map(function (e) { return e[1]; });

    var compColors = [
      '#60a0f0', '#f0a040', '#4ecdc4', '#f06060',
      '#c8f060', '#a080f0', '#f060a0', '#80d0f0'
    ];

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: compColors.slice(0, labels.length),
          borderRadius: 3,
          maxBarThickness: 28,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
            grid: { color: d.gridColor },
            beginAtZero: true,
          },
          y: {
            ticks: { color: d.text3, font: { family: d.fontMono, size: 11 } },
            grid: { display: false },
          },
        },
      },
    });
  }

  function createLineChart(canvasId, labels, values, yLabel) {
    destroyChart(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    var d = getChartDefaults();

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          borderColor: d.accent,
          backgroundColor: d.accentDim,
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: d.accent,
          pointBorderColor: d.accent,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
            grid: { color: d.gridColor },
          },
          y: {
            ticks: {
              color: d.text3,
              font: { family: d.fontMono, size: 10 },
              callback: function (v) { return v + '%'; },
            },
            grid: { color: d.gridColor },
          },
        },
      },
    });
  }

  function createCompCoverageLineChart(canvasId, dates, analyses) {
    destroyChart(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    var d = getChartDefaults();

    var compColors = [
      '#60a0f0', '#f0a040', '#4ecdc4', '#f06060',
      '#c8f060', '#a080f0', '#f060a0', '#80d0f0'
    ];

    // Collect all competitor names from all analyses
    var competitors = [];
    analyses.forEach(function (a) {
      if (a.compCoverage) {
        Object.keys(a.compCoverage).forEach(function (c) {
          if (competitors.indexOf(c) === -1) competitors.push(c);
        });
      }
    });

    var datasets = competitors.map(function (comp, i) {
      var color = compColors[i % compColors.length];
      return {
        label: comp,
        data: analyses.map(function (a) {
          return a.compCoverage ? (a.compCoverage[comp] || 0) : 0;
        }),
        borderColor: color,
        backgroundColor: color + '18',
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: color,
        pointBorderColor: color,
        borderWidth: 2,
      };
    });

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels: dates, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
            grid: { color: d.gridColor },
          },
          y: {
            ticks: { color: d.text3, font: { family: d.fontMono, size: 10 } },
            grid: { color: d.gridColor },
            beginAtZero: true,
          },
        },
      },
    });

    return chartInstances[canvasId];
  }

  // Expose globals
  window.destroyChart = destroyChart;
  window.destroyAllCharts = destroyAllCharts;
  window.createDistributionChart = createDistributionChart;
  window.createCoverageChart = createCoverageChart;
  window.createLineChart = createLineChart;
  window.createCompCoverageLineChart = createCompCoverageLineChart;
})();
