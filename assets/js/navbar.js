/* =========================================================
   STUDIO PATTY LEÃO — navbar.js
   Comportamento da navbar: scroll + mobile toggler
   ========================================================= */

(function () {
  'use strict';

  const navbar = document.getElementById('navbar-principal');

  /* Scroll: intensifica o fundo ao rolar */
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) {
        navbar.style.backgroundColor = 'rgba(4, 4, 4, 0.97)';
        navbar.style.boxShadow = '0 8px 40px rgba(0,0,0,0.60)';
      } else {
        navbar.style.backgroundColor = '';
        navbar.style.boxShadow = '';
      }
    }, { passive: true });
  }

  /* Fecha o menu mobile ao clicar em um link */
  const navLinks = document.querySelectorAll('#navbarPrincipal .nav-link:not(.dropdown-toggle)');
  const navCollapse = document.getElementById('navbarPrincipal');

  if (navCollapse) {
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
        if (bsCollapse) bsCollapse.hide();
      });
    });
  }

})();
