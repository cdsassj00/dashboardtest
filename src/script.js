import Papa from 'papaparse';
import Chart from 'chart.js/auto';
import './index.css';

const COLORS = [
  'rgba(59, 130, 246, 0.8)', // blue-500
  'rgba(16, 185, 129, 0.8)', // emerald-500
  'rgba(245, 158, 11, 0.8)', // amber-500
  'rgba(239, 68, 68, 0.8)',  // red-500
  'rgba(139, 92, 246, 0.8)', // violet-500
  'rgba(236, 72, 153, 0.8)', // pink-500
];

const BORDER_COLORS = [
  'rgb(59, 130, 246)',
  'rgb(16, 185, 129)',
  'rgb(245, 158, 11)',
  'rgb(239, 68, 68)',
  'rgb(139, 92, 246)',
  'rgb(236, 72, 153)',
];

let chartInstances = [];
let scatterInstance = null;

const fileInput = document.getElementById('csv-file');
const dropZone = document.getElementById('drop-zone');
const dropIconContainer = document.getElementById('drop-icon-container');
const dashboardContent = document.getElementById('dashboard-content');
const summaryStats = document.getElementById('summary-stats');
const chartsGrid = document.getElementById('charts-grid');
const advancedAnalytics = document.getElementById('advanced-analytics');
const corrMatrixContainer = document.getElementById('corr-matrix-container');
const corrMatrixGrid = document.getElementById('corr-matrix-grid');
const scatterContainer = document.getElementById('scatter-container');
const scatterTitle = document.getElementById('scatter-title');
const statsTableContainer = document.getElementById('stats-table-container');
const statsTableBody = document.getElementById('stats-table-body');

// Event Listeners
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) processData(file);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('border-blue-500', 'bg-blue-50');
  dropIconContainer.classList.replace('bg-slate-100', 'bg-blue-100');
  dropIconContainer.classList.replace('text-slate-400', 'text-blue-600');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('border-blue-500', 'bg-blue-50');
  dropIconContainer.classList.replace('bg-blue-100', 'bg-slate-100');
  dropIconContainer.classList.replace('text-blue-600', 'text-slate-400');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('border-blue-500', 'bg-blue-50');
  dropIconContainer.classList.replace('bg-blue-100', 'bg-slate-100');
  dropIconContainer.classList.replace('text-blue-600', 'text-slate-400');
  
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.csv')) {
    processData(file);
  }
});

function processData(file) {
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (results) => {
      const data = results.data;
      if (data.length === 0) return;
      const columns = Object.keys(data[0]);
      
      dropZone.classList.add('hidden');
      dashboardContent.classList.remove('hidden');
      
      renderSummary(file.name, data.length, columns.length);
      generateCharts(data, columns);
    }
  });
}

function detectType(values) {
  let numberCount = 0;
  let dateCount = 0;
  const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (validValues.length === 0) return 'string';

  validValues.forEach(v => {
    if (typeof v === 'number') numberCount++;
    else if (typeof v === 'string' && !isNaN(Date.parse(v))) dateCount++;
  });

  if (numberCount / validValues.length > 0.8) return 'number';
  if (dateCount / validValues.length > 0.8) return 'date';
  return 'string';
}

function pearsonCorrelation(x, y) {
  const valid = x.map((v, i) => ({ x: v, y: y[i] })).filter(p => !isNaN(p.x) && !isNaN(p.y));
  if (valid.length === 0) return 0;
  const n = valid.length;
  const sumX = valid.reduce((a, b) => a + b.x, 0);
  const sumY = valid.reduce((a, b) => a + b.y, 0);
  const sumX2 = valid.reduce((a, b) => a + b.x * b.x, 0);
  const sumY2 = valid.reduce((a, b) => a + b.y * b.y, 0);
  const sumXY = valid.reduce((a, b) => a + b.x * b.y, 0);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function renderSummary(fileName, rows, cols) {
  summaryStats.innerHTML = `
    <div class="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
      <div class="bg-blue-50 p-3 rounded-lg text-blue-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg>
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Dataset</p>
        <p class="text-lg font-semibold text-slate-900 truncate max-w-[200px]">${fileName}</p>
      </div>
    </div>
    <div class="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
      <div class="bg-emerald-50 p-3 rounded-lg text-emerald-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Total Rows</p>
        <p class="text-2xl font-bold text-slate-900">${rows.toLocaleString()}</p>
      </div>
    </div>
    <div class="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
      <div class="bg-amber-50 p-3 rounded-lg text-amber-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">Columns Analyzed</p>
        <p class="text-2xl font-bold text-slate-900">${cols}</p>
      </div>
    </div>
  `;
}

function createChartContainer(title) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col';
  
  const h3 = document.createElement('h3');
  h3.className = 'text-lg font-semibold text-slate-800 mb-6';
  h3.textContent = title;
  
  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'relative flex-grow min-h-[300px] w-full';
  
  const canvas = document.createElement('canvas');
  canvasWrapper.appendChild(canvas);
  
  wrapper.appendChild(h3);
  wrapper.appendChild(canvasWrapper);
  chartsGrid.appendChild(wrapper);
  
  return canvas;
}

function generateCharts(data, columns) {
  // Clear old charts
  chartInstances.forEach(c => c.destroy());
  chartInstances = [];
  chartsGrid.innerHTML = '';
  
  const types = {};
  columns.forEach(col => {
    types[col] = detectType(data.map(r => r[col]));
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { family: "'Inter', sans-serif", size: 12 } } },
      tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 8, displayColors: true }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif", size: 11 } } },
      y: { border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { font: { family: "'Inter', sans-serif", size: 11 } } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: chartOptions.plugins,
    cutout: '65%',
  };

  // 1. String columns
  columns.forEach(col => {
    if (types[col] === 'string') {
      const count = {};
      data.forEach(r => {
        const v = String(r[col] || 'Unknown');
        count[v] = (count[v] || 0) + 1;
      });

      const sortedEntries = Object.entries(count).sort((a, b) => b[1] - a[1]);
      const labels = sortedEntries.map(e => e[0]);
      const values = sortedEntries.map(e => e[1]);

      const isDoughnut = labels.length <= 6 && labels.length > 1;
      const canvas = createChartContainer(`${col} Distribution`);
      
      const chart = new Chart(canvas, {
        type: isDoughnut ? 'doughnut' : 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Count',
            data: values,
            backgroundColor: isDoughnut ? COLORS : COLORS[0],
            borderColor: isDoughnut ? BORDER_COLORS : BORDER_COLORS[0],
            borderWidth: 1,
            borderRadius: isDoughnut ? 0 : 4,
          }]
        },
        options: isDoughnut ? doughnutOptions : chartOptions
      });
      chartInstances.push(chart);
    }
  });

  // 2. Number vs String
  columns.forEach(numCol => {
    if (types[numCol] === 'number') {
      columns.forEach(catCol => {
        if (types[catCol] === 'string') {
          const agg = {};
          data.forEach(r => {
            const key = String(r[catCol] || 'Unknown');
            const val = Number(r[numCol]) || 0;
            agg[key] = (agg[key] || 0) + val;
          });

          const sortedEntries = Object.entries(agg).sort((a, b) => b[1] - a[1]);
          const labels = sortedEntries.slice(0, 20).map(e => e[0]);
          const values = sortedEntries.slice(0, 20).map(e => e[1]);

          const canvas = createChartContainer(`Total ${numCol} by ${catCol}`);
          const chart = new Chart(canvas, {
            type: 'bar',
            data: {
              labels,
              datasets: [{
                label: `Sum of ${numCol}`,
                data: values,
                backgroundColor: COLORS[1],
                borderColor: BORDER_COLORS[1],
                borderWidth: 1,
                borderRadius: 4,
              }]
            },
            options: chartOptions
          });
          chartInstances.push(chart);
        }
      });
    }
  });

  // 3. Date vs Number
  columns.forEach(dateCol => {
    if (types[dateCol] === 'date') {
      columns.forEach(numCol => {
        if (types[numCol] === 'number') {
          const agg = {};
          data.forEach(r => {
            const d = String(r[dateCol] || 'Unknown');
            const val = Number(r[numCol]) || 0;
            agg[d] = (agg[d] || 0) + val;
          });

          const sortedEntries = Object.entries(agg).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
          const labels = sortedEntries.map(e => e[0]);
          const values = sortedEntries.map(e => e[1]);

          const canvas = createChartContainer(`${numCol} Trend over ${dateCol}`);
          const chart = new Chart(canvas, {
            type: 'line',
            data: {
              labels,
              datasets: [{
                label: `Sum of ${numCol}`,
                data: values,
                borderColor: BORDER_COLORS[2],
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: labels.length > 50 ? 0 : 3,
                pointHoverRadius: 6,
              }]
            },
            options: chartOptions
          });
          chartInstances.push(chart);
        }
      });
    }
  });

  // --- Advanced Analytics ---
  const numCols = columns.filter(c => types[c] === 'number');
  
  if (numCols.length > 0) {
    advancedAnalytics.classList.remove('hidden');
    
    // Stats
    const stats = numCols.map(col => {
      const vals = data.map(r => Number(r[col])).filter(n => !isNaN(n));
      if (vals.length === 0) return { col, mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / vals.length;
      const sorted = [...vals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      return { col, mean, median, min: sorted[0], max: sorted[sorted.length - 1], stdDev: Math.sqrt(variance) };
    });
    
    statsTableContainer.classList.remove('hidden');
    statsTableBody.innerHTML = stats.map((s, i) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 ${i === stats.length - 1 ? 'border-none' : ''}">
        <td class="px-6 py-4 font-medium text-slate-900">${s.col}</td>
        <td class="px-6 py-4 text-right">${s.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        <td class="px-6 py-4 text-right">${s.median.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        <td class="px-6 py-4 text-right">${s.min.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        <td class="px-6 py-4 text-right">${s.max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        <td class="px-6 py-4 text-right">${s.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    // Correlation
    if (numCols.length >= 2) {
      const matrix = numCols.map(c1 => numCols.map(c2 => pearsonCorrelation(data.map(r => Number(r[c1])), data.map(r => Number(r[c2])))));
      
      corrMatrixContainer.classList.remove('hidden');
      corrMatrixGrid.style.gridTemplateColumns = `auto repeat(${numCols.length}, minmax(60px, 1fr))`;
      
      let gridHTML = `<div class="p-2"></div>`;
      numCols.forEach(c => {
        gridHTML += `<div class="text-xs font-semibold text-slate-600 truncate text-center p-2" title="${c}">${c.length > 10 ? c.substring(0, 8) + '..' : c}</div>`;
      });
      
      numCols.forEach((r, i) => {
        gridHTML += `<div class="text-xs font-semibold text-slate-600 truncate p-2 flex items-center justify-end" title="${r}">${r.length > 12 ? r.substring(0, 10) + '..' : r}</div>`;
        matrix[i].forEach((val, j) => {
          const isSelf = i === j;
          const absVal = Math.abs(val);
          const color = val > 0 ? `rgba(59, 130, 246, ${absVal * 0.8 + 0.1})` : `rgba(239, 68, 68, ${absVal * 0.8 + 0.1})`;
          const textColor = absVal > 0.5 && !isSelf ? 'white' : 'rgb(30, 41, 59)';
          const fontWeight = absVal > 0.7 && !isSelf ? 'bold' : 'normal';
          const bg = isSelf ? '#f8fafc' : color;
          
          gridHTML += `
            <div class="p-2 text-center text-xs rounded-md transition-colors hover:ring-2 hover:ring-slate-400 cursor-default"
                 style="background-color: ${bg}; color: ${textColor}; font-weight: ${fontWeight}"
                 title="${r} vs ${numCols[j]}: ${val.toFixed(4)}">
              ${isSelf ? '-' : val.toFixed(2)}
            </div>
          `;
        });
      });
      corrMatrixGrid.innerHTML = gridHTML;

      // Scatter
      let maxCorr = -1, pair = [0, 1];
      for (let i = 0; i < numCols.length; i++) {
        for (let j = i + 1; j < numCols.length; j++) {
          const corr = Math.abs(matrix[i][j]);
          if (corr > maxCorr && corr < 0.999) { maxCorr = corr; pair = [i, j]; }
        }
      }

      const xCol = numCols[pair[0]], yCol = numCols[pair[1]];
      const scatterData = data.map(r => ({ x: Number(r[xCol]), y: Number(r[yCol]) })).filter(p => !isNaN(p.x) && !isNaN(p.y));

      scatterContainer.classList.remove('hidden');
      scatterTitle.textContent = `${xCol} vs ${yCol} (Correlation: ${matrix[pair[0]][pair[1]].toFixed(2)})`;
      
      if (scatterInstance) scatterInstance.destroy();
      const scatterCanvas = document.getElementById('scatter-chart');
      scatterInstance = new Chart(scatterCanvas, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Data Points',
            data: scatterData,
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: 'rgba(59, 130, 246, 1)',
            pointRadius: 4,
            pointHoverRadius: 6,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 8 } },
          scales: {
            x: { type: 'linear', position: 'bottom', title: { display: true, text: xCol, font: { family: "'Inter', sans-serif", size: 12, weight: 'bold' } }, grid: { color: '#f1f5f9' } },
            y: { title: { display: true, text: yCol, font: { family: "'Inter', sans-serif", size: 12, weight: 'bold' } }, grid: { color: '#f1f5f9' } }
          }
        }
      });
    } else {
      corrMatrixContainer.classList.add('hidden');
      scatterContainer.classList.add('hidden');
    }
  } else {
    advancedAnalytics.classList.add('hidden');
  }
}
