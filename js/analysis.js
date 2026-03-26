/* === Analysis Page Logic === */

(function () {
  'use strict';

  var selectedFiles = {};  // { fileId: { id, name, date } }
  var lastBranch = null;

  // Called by nav.js when branch switches
  window.onBranchSwitch = function (branch) {
    selectedFiles = {};
    destroyAllCharts();
    loadFileList(branch);
  };

  async function loadFileList(branch) {
    var config = BRANCH_CONFIG[branch];
    if (!config) return;
    var container = getFileListContainer(branch);
    var resultArea = getResultArea(branch);
    if (!container) return;

    if (!isSignedIn()) {
      container.innerHTML = '<div class="empty-state">Connect your Google Drive account to load files.</div>';
      if (resultArea) resultArea.innerHTML = '';
      return;
    }

    container.innerHTML = '<div class="loading-state"><span class="spinner"></span> Loading files...</div>';
    if (resultArea) resultArea.innerHTML = '<div class="empty-state">Select one or more files above to run analysis.</div>';

    try {
      var files = await listFiles(config.folderId);
      if (files.length === 0) {
        container.innerHTML = '<div class="empty-state">No files found in Drive folder. Drop output files into the correct folder to begin.</div>';
        return;
      }
      renderFileList(container, files, branch);
    } catch (err) {
      container.innerHTML = '<div class="error-msg">' + escHtml(err.message) + '</div>';
    }
  }

  function renderFileList(container, files, branch) {
    var html = '<div class="file-list">';
    files.forEach(function (f) {
      var date = extractDate(f.name) || '';
      html +=
        '<label class="file-item">' +
          '<input type="checkbox" data-id="' + f.id + '" data-name="' + escHtml(f.name) + '" data-date="' + date + '">' +
          '<span class="file-name">' + escHtml(f.name) + '</span>' +
          '<span class="file-date">' + date + '</span>' +
        '</label>';
    });
    html += '</div>';
    html += '<button class="btn btn-accent" id="btn-analyze-' + branch + '" disabled>Analyze selected</button>';
    container.innerHTML = html;

    // Wire up checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (cb.checked) {
          selectedFiles[cb.dataset.id] = { id: cb.dataset.id, name: cb.dataset.name, date: cb.dataset.date };
        } else {
          delete selectedFiles[cb.dataset.id];
        }
        var btn = document.getElementById('btn-analyze-' + branch);
        if (btn) btn.disabled = Object.keys(selectedFiles).length === 0;
      });
    });

    // Wire up analyze button
    var btn = document.getElementById('btn-analyze-' + branch);
    if (btn) {
      btn.addEventListener('click', function () {
        runAnalysis(branch);
      });
    }
  }

  async function runAnalysis(branch) {
    var resultArea = getResultArea(branch);
    if (!resultArea) return;
    var fileList = Object.values(selectedFiles);
    if (fileList.length === 0) return;

    resultArea.innerHTML = '<div class="loading-state"><span class="spinner"></span> Analyzing...</div>';

    try {
      // Sort by date
      fileList.sort(function (a, b) {
        var da = a.date ? dateSortKey(a.date) : '';
        var db = b.date ? dateSortKey(b.date) : '';
        return da.localeCompare(db);
      });

      // Download and analyze all files
      var analyses = [];
      for (var i = 0; i < fileList.length; i++) {
        var buf = await downloadFile(fileList[i].id);
        var rows = parseXlsx(buf);
        var result = analyzeFile(rows, branch);
        result.date = fileList[i].date;
        result.filename = fileList[i].name;
        analyses.push(result);
      }

      if (analyses.length === 1) {
        renderSingleFile(resultArea, analyses[0], branch);
      } else {
        renderTrendView(resultArea, analyses, branch);
      }
    } catch (err) {
      resultArea.innerHTML = '<div class="error-msg">Analysis error: ' + escHtml(err.message) + '</div>';
    }
  }

  /* === Single File Dashboard === */
  function renderSingleFile(container, data, branch) {
    var config = BRANCH_CONFIG[branch];
    var pctCheaper = data.withComp > 0 ? ((data.cheaper / data.withComp) * 100).toFixed(1) : '0';
    var pctExpensive = data.withComp > 0 ? ((data.expensive / data.withComp) * 100).toFixed(1) : '0';
    var medianClass = data.median > 0 ? 'amber' : 'accent';

    var html = '';

    // KPI Cards
    html += '<div class="kpi-grid">';
    html += kpiCard('Total products', data.total, '');
    html += kpiCard('With competitor data', data.withComp, '');
    html += kpiCard('% cheapest/equal', pctCheaper + '%', 'accent');
    html += kpiCard('% more expensive', pctExpensive + '%', 'red');
    html += kpiCard('Median price diff', (data.median >= 0 ? '+' : '') + data.median.toFixed(2) + '%', medianClass);
    html += kpiCard('No competitor data', data.noComp, '');
    html += '</div>';

    // Charts row
    html += '<div class="chart-row">';
    html += '<div class="chart-card"><h2>Competitor Coverage</h2><div style="height:220px"><canvas id="chart-coverage"></canvas></div></div>';
    html += '<div class="chart-card"><h2>Price Distribution</h2><div style="height:220px"><canvas id="chart-dist"></canvas></div></div>';
    html += '</div>';

    // Segment breakdown
    html += '<div class="card" style="margin-bottom:1.5rem"><h2>Segment Breakdown</h2>';
    html += renderSegmentBars(data.segments);
    html += '</div>';

    // Product lists
    html += '<div class="card"><h2>Product Comparison</h2>';
    html += '<div class="product-tabs">';
    html += '<button class="product-tab active" data-list="expensive">' + config.label + ' najdro\u017Csza</button>';
    html += '<button class="product-tab" data-list="cheapest">' + config.label + ' najta\u0144sza</button>';
    html += '</div>';
    html += '<div id="product-list-expensive">' + renderProductTable(data.topExpensive) + '</div>';
    html += '<div id="product-list-cheapest" style="display:none">' + renderProductTable(data.topCheapest) + '</div>';
    html += '</div>';

    container.innerHTML = html;

    // Create charts
    createCoverageChart('chart-coverage', data.compCoverage);
    createDistributionChart('chart-dist', data.dist);

    // Product tab switching
    container.querySelectorAll('.product-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        container.querySelectorAll('.product-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var list = tab.dataset.list;
        document.getElementById('product-list-expensive').style.display = list === 'expensive' ? '' : 'none';
        document.getElementById('product-list-cheapest').style.display = list === 'cheapest' ? '' : 'none';
      });
    });
  }

  function kpiCard(label, value, colorClass) {
    return '<div class="kpi"><div class="kpi-label">' + label + '</div>' +
      '<div class="kpi-value ' + colorClass + '">' + value + '</div></div>';
  }

  function renderSegmentBars(segments) {
    if (segments.length === 0) return '<div class="empty-state">No segment data</div>';
    var maxTotal = segments[0].total;
    var html = '';
    segments.forEach(function (s) {
      var cheaperW = maxTotal > 0 ? (s.cheaper / maxTotal * 100) : 0;
      var expensiveW = maxTotal > 0 ? (s.expensive / maxTotal * 100) : 0;
      html += '<div class="segment-row">' +
        '<span class="segment-name" title="' + escHtml(s.name) + '">' + escHtml(s.name) + '</span>' +
        '<div class="segment-bar-wrap">' +
          '<div class="segment-bar-cheaper" style="width:' + cheaperW + '%"></div>' +
          '<div class="segment-bar-expensive" style="width:' + expensiveW + '%"></div>' +
        '</div>' +
        '<span class="segment-stats">' +
          s.cheaper + ' cheaper &middot; ' + s.expensive + ' expensive &middot; med ' + s.median.toFixed(1) + '%' +
        '</span>' +
      '</div>';
    });
    return html;
  }

  function renderProductTable(items) {
    if (items.length === 0) return '<div class="empty-state">No data</div>';
    var html = '<table class="product-table"><thead><tr><th>Product</th><th>Producer</th><th>Diff</th></tr></thead><tbody>';
    items.forEach(function (item) {
      var cls = item.pct > 0 ? 'positive' : 'negative';
      var sign = item.pct > 0 ? '+' : '';
      html += '<tr><td>' + escHtml(item.name) + '</td><td>' + escHtml(item.producer) + '</td>' +
        '<td><span class="pct-badge ' + cls + '">' + sign + item.pct.toFixed(2) + '%</span></td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  /* === Multi-file Trend View === */
  function renderTrendView(container, analyses, branch) {
    var first = analyses[0];
    var last = analyses[analyses.length - 1];

    var medianChange = last.median - first.median;
    var firstPctCheaper = first.withComp > 0 ? (first.cheaper / first.withComp * 100) : 0;
    var lastPctCheaper = last.withComp > 0 ? (last.cheaper / last.withComp * 100) : 0;
    var pctCheapChange = lastPctCheaper - firstPctCheaper;

    var html = '';

    // Trend KPIs
    html += '<div class="kpi-grid">';
    html += kpiCard('Files analyzed', analyses.length, '');
    html += kpiCard('Median change', (medianChange >= 0 ? '+' : '') + medianChange.toFixed(2) + ' pp', medianChange > 0 ? 'red' : 'green');
    html += kpiCard('% cheapest change', (pctCheapChange >= 0 ? '+' : '') + pctCheapChange.toFixed(1) + ' pp', pctCheapChange >= 0 ? 'green' : 'red');
    html += kpiCard('Products (latest)', last.total, '');
    html += '</div>';

    // Line charts
    var dates = analyses.map(function (a) { return a.date || '?'; });
    var medians = analyses.map(function (a) { return a.median; });
    var pctCheapers = analyses.map(function (a) {
      return a.withComp > 0 ? (a.cheaper / a.withComp * 100) : 0;
    });

    html += '<div class="chart-row">';
    html += '<div class="chart-card"><h2>Median % Over Time</h2><div style="height:250px"><canvas id="chart-trend-median"></canvas></div></div>';
    html += '<div class="chart-card"><h2>% Cheapest Over Time</h2><div style="height:250px"><canvas id="chart-trend-cheapest"></canvas></div></div>';
    html += '</div>';

    // Segment trend table
    html += '<div class="card"><h2>Segment Trend (First \u2192 Last)</h2>';
    html += renderSegmentTrend(first, last);
    html += '</div>';

    container.innerHTML = html;

    createLineChart('chart-trend-median', dates, medians);
    createLineChart('chart-trend-cheapest', dates, pctCheapers);
  }

  function renderSegmentTrend(first, last) {
    // Build map of segments
    var segMap = {};
    first.segments.forEach(function (s) { segMap[s.name] = { first: s.median, last: 0 }; });
    last.segments.forEach(function (s) {
      if (!segMap[s.name]) segMap[s.name] = { first: 0, last: 0 };
      segMap[s.name].last = s.median;
    });

    var entries = Object.entries(segMap).map(function (e) {
      return { name: e[0], first: e[1].first, last: e[1].last, delta: e[1].last - e[1].first };
    }).sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });

    if (entries.length === 0) return '<div class="empty-state">No segment data</div>';

    var html = '<table class="trend-table"><thead><tr><th>Segment</th><th>First</th><th></th><th>Last</th><th>Delta</th></tr></thead><tbody>';
    entries.forEach(function (e) {
      var cls = e.delta > 0 ? 'delta-positive' : 'delta-negative';
      var sign = e.delta > 0 ? '+' : '';
      html += '<tr><td>' + escHtml(e.name) + '</td><td>' + e.first.toFixed(1) + '%</td><td>\u2192</td>' +
        '<td>' + e.last.toFixed(1) + '%</td><td class="' + cls + '">' + sign + e.delta.toFixed(1) + ' pp</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  /* === Helpers === */
  function getFileListContainer(branch) {
    return document.getElementById('file-list-' + branch);
  }

  function getResultArea(branch) {
    return document.getElementById('result-' + branch);
  }

  function escHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
})();
