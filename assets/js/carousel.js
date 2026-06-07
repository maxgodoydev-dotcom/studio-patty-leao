/* =========================================================
   STUDIO PATTY LEÃO — carousel.js
   Controle do carrossel: autoplay, frases animadas, controles
   ========================================================= */

(function () {
  'use strict';

  const INTERVALO_MS = 5500;

  const slides = [
    {
      titulo:    'Nosso Compromisso é Cuidar do Seu Xodó!',
      subtitulo: 'Serviços cheios de amor e dedicação para o cuidado dos seus cabelos.<br>Agende já e garanta um momento de bem-estar e autocuidado!',
    },
    {
      titulo:    'Beleza que Transforma, Cuidado que Fideliza.',
      subtitulo: 'Progressivas, escovas e tratamentos feitos com as melhores técnicas do mercado.',
    },
    {
      titulo:    'Você Merece o Melhor. A Patty Entrega.',
      subtitulo: 'Ambiente acolhedor, profissionais experientes e resultados que encantam.',
    },
  ];

  const tituloEl    = document.getElementById('carousel-titulo');
  const subtituloEl = document.getElementById('carousel-subtitulo');
  const carouselEl  = document.getElementById('carouselHome');

  function atualizarTexto(indice) {
    if (!tituloEl || !subtituloEl) return;
    const slide = slides[indice % slides.length];

    tituloEl.style.opacity    = '0';
    subtituloEl.style.opacity = '0';

    setTimeout(() => {
      tituloEl.innerHTML    = slide.titulo;
      subtituloEl.innerHTML = slide.subtitulo;
      tituloEl.style.opacity    = '1';
      subtituloEl.style.opacity = '1';
    }, 280);
  }

  if (carouselEl) {
    carouselEl.addEventListener('slid.bs.carousel', (e) => {
      atualizarTexto(e.to);
    });

    /* Inicializa Bootstrap Carousel com intervalo */
    new bootstrap.Carousel(carouselEl, {
      interval: INTERVALO_MS,
      ride: 'carousel',
      wrap: true,
    });
  }

})();
