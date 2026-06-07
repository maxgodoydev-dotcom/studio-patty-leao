/* =========================================================
   STUDIO PATTY LEÃO — admin.js
   Sidebar mobile + helpers para páginas internas (admin)
   ========================================================= */

(function () {
  'use strict';

  /* --- SIDEBAR MOBILE --- */

  const sidebar  = document.getElementById('sidebarAdmin');
  const overlay  = document.getElementById('sidebarOverlay');
  const btnAbrir = document.getElementById('sidebarOpen');
  const btnFechar = document.getElementById('sidebarClose');

  function abrirSidebar() {
    sidebar?.classList.add('aberta');
    overlay?.classList.add('ativo');
    document.body.style.overflow = 'hidden';
  }

  function fecharSidebar() {
    sidebar?.classList.remove('aberta');
    overlay?.classList.remove('ativo');
    document.body.style.overflow = '';
  }

  btnAbrir?.addEventListener('click', abrirSidebar);
  btnFechar?.addEventListener('click', fecharSidebar);
  overlay?.addEventListener('click', fecharSidebar);

  /* Fecha ao clicar em link (mobile) */
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 992) fecharSidebar();
    });
  });

  /* --- UTILITÁRIO: inicializar gráfico Chart.js genérico --- */

  function normalizarDataset(data, fallback = [0]) {
    return Array.isArray(data) && data.length ? data : fallback;
  }

  function normalizarLabels(labels, fallback = ['Sem dados']) {
    return Array.isArray(labels) && labels.length ? labels : fallback;
  }

  function chartDisponivel(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return null;
    return ctx;
  }

  window.StudioCharts = {
    linha(canvasId, labels, datasets, opcoes = {}) {
      const ctx = chartDisponivel(canvasId);
      if (!ctx) return null;
      return new Chart(ctx, {
        type: 'line',
        data: { labels: normalizarLabels(labels), datasets },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#fcfcfc' } },
            ...opcoes.plugins,
          },
          scales: {
            x: { ticks: { color: '#9a9a9a' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#9a9a9a' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          },
          ...opcoes,
        },
      });
    },

    barra(canvasId, labels, datasets, opcoes = {}) {
      const ctx = chartDisponivel(canvasId);
      if (!ctx) return null;
      return new Chart(ctx, {
        type: 'bar',
        data: { labels: normalizarLabels(labels), datasets },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#fcfcfc' } },
            ...opcoes.plugins,
          },
          scales: {
            x: { ticks: { color: '#9a9a9a' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#9a9a9a' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          },
          ...opcoes,
        },
      });
    },

    rosca(canvasId, labels, data, cores) {
      const ctx = chartDisponivel(canvasId);
      if (!ctx) return null;
      return new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: normalizarLabels(labels),
          datasets: [{ data: normalizarDataset(data, [1]), backgroundColor: cores, borderWidth: 0 }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#fcfcfc' } },
          },
        },
      });
    },
  };

})();
