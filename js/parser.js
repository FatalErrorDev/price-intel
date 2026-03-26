/* === xlsx Parser & Analysis Engine === */

var BRANCH_CONFIG = {
  sewera: {
    label:       'Sewera',
    ownPrice:    'Sewera B2C KTW',
    diffColumn:  'Sewera-Najtańszy',
    competitors: ['Castorama', 'LeroyMerlin', 'OBI', 'Bednarek', 'Lubar', 'Maldrew', 'Viverto'],
    accent:      'sewera',
    folderId:    FOLDERS.sewera,
  },
  dobromir: {
    label:       'Dobromir',
    ownPrice:    'Dobromir',
    diffColumn:  'Dobromir-Najtańszy',
    competitors: ['BricoMarche', 'Castorama'],
    accent:      'dobromir',
    folderId:    FOLDERS.dobromir,
  },
};

(function () {
  'use strict';

  function parseXlsx(arrayBuffer) {
    /* global XLSX */
    var workbook = XLSX.read(arrayBuffer, { type: 'array' });
    var sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '-' });
  }

  function parsePct(val) {
    if (val === null || val === undefined || val === '-' || val === '' || val === ' ') return null;
    var s = String(val).replace('%', '').replace(',', '.').trim();
    if (s === '' || s === '-') return null;
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function hasPrice(val) {
    return val !== null && val !== undefined && val !== '-' && val !== '' && String(val).trim() !== '' && String(val).trim() !== '-';
  }

  function calcMedian(arr) {
    if (arr.length === 0) return 0;
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function analyzeFile(rows, branch) {
    var config = BRANCH_CONFIG[branch];
    if (!config) throw new Error('Unknown branch: ' + branch);

    var total = rows.length;
    var withComp = 0;
    var noComp = 0;
    var cheaper = 0;
    var expensive = 0;
    var diffs = [];
    var compCoverage = {};
    var segmentMap = {};
    var dist = [
      { label: '\u2264-20%', min: -Infinity, max: -20, count: 0 },
      { label: '-20 to -10%', min: -20, max: -10, count: 0 },
      { label: '-10 to -5%', min: -10, max: -5, count: 0 },
      { label: '-5 to 0%', min: -5, max: 0, count: 0 },
      { label: '0%', min: 0, max: 0, count: 0 },
      { label: '0 to 5%', min: 0, max: 5, count: 0 },
      { label: '5 to 15%', min: 5, max: 15, count: 0 },
      { label: '>15%', min: 15, max: Infinity, count: 0 },
    ];

    // Initialize competitor coverage
    config.competitors.forEach(function (c) { compCoverage[c] = 0; });

    var topExpensiveList = [];
    var topCheapestList = [];

    rows.forEach(function (row) {
      var pct = parsePct(row[config.diffColumn]);
      var hasDiff = pct !== null;

      // Competitor coverage
      config.competitors.forEach(function (c) {
        if (hasPrice(row[c])) compCoverage[c]++;
      });

      // With/without competitor
      if (hasDiff) {
        withComp++;
      } else {
        noComp++;
      }

      // Cheaper/expensive (based on diff column)
      if (hasDiff) {
        if (pct <= 0) {
          cheaper++;
        } else {
          expensive++;
        }
      }

      // Sane range filter for stats
      if (hasDiff && pct > -100 && pct < 200) {
        diffs.push(pct);

        // Distribution
        if (pct <= -20) dist[0].count++;
        else if (pct <= -10) dist[1].count++;
        else if (pct <= -5) dist[2].count++;
        else if (pct < 0) dist[3].count++;
        else if (pct === 0) dist[4].count++;
        else if (pct <= 5) dist[5].count++;
        else if (pct <= 15) dist[6].count++;
        else dist[7].count++;

        // Top expensive (positive diff = we are more expensive)
        if (pct > 0) {
          topExpensiveList.push({
            name: row['Nazwa produktu'] || row['Nazwa'] || row['Product'] || '-',
            producer: row['Producent'] || row['Producer'] || '-',
            pct: pct,
          });
        }

        // Top cheapest (negative diff = we are cheaper)
        if (pct < 0) {
          topCheapestList.push({
            name: row['Nazwa produktu'] || row['Nazwa'] || row['Product'] || '-',
            producer: row['Producent'] || row['Producer'] || '-',
            pct: pct,
          });
        }
      }

      // Segment aggregation
      var segName = row['Segment'] || 'Brak segmentu';
      if (segName === '-') segName = 'Brak segmentu';
      if (!segmentMap[segName]) {
        segmentMap[segName] = { name: segName, total: 0, cheaper: 0, expensive: 0, diffs: [] };
      }
      segmentMap[segName].total++;
      if (hasDiff) {
        if (pct <= 0) segmentMap[segName].cheaper++;
        else segmentMap[segName].expensive++;
        if (pct > -100 && pct < 200) segmentMap[segName].diffs.push(pct);
      }
    });

    // Build segments
    var segments = Object.values(segmentMap).map(function (s) {
      return {
        name: s.name,
        total: s.total,
        cheaper: s.cheaper,
        expensive: s.expensive,
        median: calcMedian(s.diffs),
      };
    }).sort(function (a, b) { return b.total - a.total; });

    // Sort top lists
    topExpensiveList.sort(function (a, b) { return b.pct - a.pct; });
    topCheapestList.sort(function (a, b) { return a.pct - b.pct; });

    return {
      branch: branch,
      total: total,
      withComp: withComp,
      noComp: noComp,
      cheaper: cheaper,
      expensive: expensive,
      median: calcMedian(diffs),
      compCoverage: compCoverage,
      segments: segments,
      dist: dist.map(function (d) { return { label: d.label, count: d.count }; }),
      topExpensive: topExpensiveList.slice(0, 10),
      topCheapest: topCheapestList.slice(0, 10),
    };
  }

  function extractDate(filename) {
    var m = filename.match(/(\d{2}-\d{2}-\d{4})/);
    return m ? m[1] : null;
  }

  function dateSortKey(dateStr) {
    // DD-MM-YYYY → YYYYMMDD
    return dateStr.split('-').reverse().join('');
  }

  // Expose globals
  window.parseXlsx = parseXlsx;
  window.analyzeFile = analyzeFile;
  window.calcMedian = calcMedian;
  window.extractDate = extractDate;
  window.dateSortKey = dateSortKey;
  window.BRANCH_CONFIG = BRANCH_CONFIG;
})();
