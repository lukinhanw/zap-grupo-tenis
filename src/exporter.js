import fs from 'fs/promises';
import path from 'path';
import { config } from './config.js';

const ASSETS_DIR = 'assets';

/**
 * Salva MessageMedia em disco.
 * @param {import('whatsapp-web.js').MessageMedia} media
 * @param {string} filepath
 */
async function saveMedia(media, filepath) {
  const ext = media.mimetype?.split('/')[1] || 'jpg';
  const fullPath = path.join(config.OUTPUT_DIR, ASSETS_DIR, filepath + (filepath.includes('.') ? '' : `.${ext}`));
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const buf = Buffer.from(media.data, 'base64');
  await fs.writeFile(fullPath, buf);
  return path.join(ASSETS_DIR, path.basename(fullPath)).replace(/\\/g, '/');
}

/**
 * Baixa mídia de uma mensagem e salva. Retorna path relativo ou null.
 * @param {import('whatsapp-web.js').Message} message
 * @param {string} baseName
 * @returns {Promise<string|null>}
 */
async function downloadAndSave(message, baseName) {
  try {
    const media = await message.downloadMedia();
    if (!media || !media.data) return null;
    return saveMedia(media, baseName);
  } catch {
    return null;
  }
}

/**
 * Formata sizes para exibição.
 * @param {{ min: number, max: number } | null} sizes
 * @returns {string}
 */
function formatSizes(sizes) {
  if (!sizes) return '';
  return `Disponível ${sizes.min} ao ${sizes.max}`;
}

/**
 * Formata preço para exibição.
 * @param {string | null} price
 * @returns {string}
 */
function formatPrice(price) {
  if (!price) return '';
  const n = parseFloat(price);
  return isNaN(n) ? price : `Rs ${n.toFixed(2)} atacado`;
}

const PLACEHOLDER_SVG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="%23222" width="400" height="400"/><text x="50%" y="50%" fill="%23555" text-anchor="middle" dy=".3em" font-size="18" font-family="sans-serif">Sem imagem</text></svg>');

/**
 * Gera o HTML do catálogo com os dados injetados (funciona em file://).
 * Layout responsivo, lightbox ao clicar na foto, imagens padronizadas.
 */
function generateHtml(catalog) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Catálogo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    :root {
      --bg: #0c0c0c;
      --surface: #161616;
      --surface-hover: #1e1e1e;
      --text: #f0f0f0;
      --text-muted: #888;
      --accent: #22c55e;
      --radius: 14px;
      --shadow: 0 4px 24px rgba(0,0,0,0.4);
      --img-size: 280px;
    }
    body {
      margin: 0;
      font-family: 'DM Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: clamp(1rem, 4vw, 2rem);
    }
    .header {
      text-align: center;
      margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
    }
    .header h1 {
      font-size: clamp(1.5rem, 4vw, 2rem);
      font-weight: 700;
      margin: 0 0 0.25rem;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 0;
      font-size: 0.95rem;
      color: var(--text-muted);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--img-size)), 1fr));
      gap: clamp(1rem, 3vw, 1.5rem);
      max-width: 1400px;
      margin: 0 auto;
    }
    .card {
      background: var(--surface);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
    }
    .card-thumb-wrap {
      position: relative;
      aspect-ratio: 1;
      width: 100%;
      overflow: hidden;
      cursor: pointer;
      background: #1a1a1a;
    }
    .card-thumb-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .card-thumb-wrap:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .card-thumb-badges {
      position: absolute;
      bottom: 8px;
      left: 8px;
      display: flex;
      gap: 4px;
    }
    .card-thumb-badges span {
      background: rgba(0,0,0,0.7);
      color: #fff;
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .card-body {
      padding: 1rem 1.1rem;
    }
    .card-name {
      font-weight: 600;
      font-size: 1rem;
      line-height: 1.35;
      margin-bottom: 0.35rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-info {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .card-price {
      margin-top: 0.5rem;
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--accent);
    }
    /* Lightbox */
    .lightbox {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0,0,0,0.92);
      align-items: center;
      justify-content: center;
      padding: 1rem;
      touch-action: pan-y pinch-zoom;
    }
    .lightbox.is-open { display: flex; }
    .lightbox-content {
      position: relative;
      max-width: 95vw;
      max-height: 90vh;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
    }
    .lightbox-content img {
      max-width: 100%;
      max-height: 90vh;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
      user-select: none;
      pointer-events: none;
    }
    .lightbox-close {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 10000;
      width: 44px;
      height: 44px;
      border: none;
      background: rgba(255,255,255,0.2);
      color: #fff;
      font-size: 1.75rem;
      line-height: 1;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.2s;
    }
    .lightbox-close:hover { background: rgba(255,255,255,0.35); transform: scale(1.05); }
    .lightbox-prev, .lightbox-next {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10000;
      width: 56px;
      height: 56px;
      border: none;
      background: rgba(0,0,0,0.55);
      color: #fff;
      font-size: 1.75rem;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.2s;
      box-shadow: 0 2px 12px rgba(0,0,0,0.4);
    }
    .lightbox-prev { left: 20px; }
    .lightbox-next { right: 20px; }
    .lightbox-prev:hover, .lightbox-next:hover {
      background: rgba(0,0,0,0.75);
      transform: translateY(-50%) scale(1.08);
    }
    @media (max-width: 600px) {
      .lightbox-prev { left: 12px; width: 48px; height: 48px; font-size: 1.5rem; }
      .lightbox-next { right: 12px; width: 48px; height: 48px; font-size: 1.5rem; }
    }
    .lightbox-counter {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      font-size: 0.9rem;
      color: rgba(255,255,255,0.9);
      background: rgba(0,0,0,0.5);
      padding: 6px 14px;
      border-radius: 20px;
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>Catálogo</h1>
    <p>Clique na imagem para ampliar</p>
  </header>
  <div class="grid" id="catalog"></div>

  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Visualizar imagem">
    <div class="lightbox-content">
      <button type="button" class="lightbox-close" id="lightboxClose" aria-label="Fechar">&times;</button>
      <button type="button" class="lightbox-prev" id="lightboxPrev" aria-label="Anterior">&lsaquo;</button>
      <img id="lightboxImg" src="" alt="">
      <button type="button" class="lightbox-next" id="lightboxNext" aria-label="Próxima">&rsaquo;</button>
      <span class="lightbox-counter" id="lightboxCounter"></span>
    </div>
  </div>

  <script>
    const CATALOG = ${JSON.stringify(catalog)};
    const root = document.getElementById('catalog');
    const placeholder = ${JSON.stringify(PLACEHOLDER_SVG)};

    function getImgs(p) {
      return (p.images && p.images.length) ? p.images : [placeholder];
    }

    let lightboxImgs = [];
    let lightboxIndex = 0;
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightboxImg');
    const lbClose = document.getElementById('lightboxClose');
    const lbPrev = document.getElementById('lightboxPrev');
    const lbNext = document.getElementById('lightboxNext');
    const lbCounter = document.getElementById('lightboxCounter');

    function openLightbox(imgs, idx) {
      lightboxImgs = imgs;
      lightboxIndex = idx;
      lb.classList.add('is-open');
      lbImg.src = lightboxImgs[lightboxIndex];
      lbCounter.textContent = lightboxImgs.length > 1 ? (lightboxIndex + 1) + ' / ' + lightboxImgs.length : '';
      lbPrev.style.visibility = lightboxImgs.length > 1 ? 'visible' : 'hidden';
      lbNext.style.visibility = lightboxImgs.length > 1 ? 'visible' : 'hidden';
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
    }
    function showPrev() {
      if (lightboxImgs.length <= 1) return;
      lightboxIndex = (lightboxIndex - 1 + lightboxImgs.length) % lightboxImgs.length;
      lbImg.src = lightboxImgs[lightboxIndex];
      lbCounter.textContent = (lightboxIndex + 1) + ' / ' + lightboxImgs.length;
    }
    function showNext() {
      if (lightboxImgs.length <= 1) return;
      lightboxIndex = (lightboxIndex + 1) % lightboxImgs.length;
      lbImg.src = lightboxImgs[lightboxIndex];
      lbCounter.textContent = (lightboxIndex + 1) + ' / ' + lightboxImgs.length;
    }

    lbClose.addEventListener('click', closeLightbox);
    lb.addEventListener('click', function(e) { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', function(e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    });
    lbPrev.addEventListener('click', function(e) { e.stopPropagation(); showPrev(); });
    lbNext.addEventListener('click', function(e) { e.stopPropagation(); showNext(); });
    var touchStartX = 0;
    lb.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function(e) {
      if (lightboxImgs.length <= 1 || !e.changedTouches[0]) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (dx > 60) showPrev();
      else if (dx < -60) showNext();
    }, { passive: true });

    CATALOG.forEach(function(p) {
      const imgs = getImgs(p);
      const card = document.createElement('article');
      card.className = 'card';
      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'card-thumb-wrap';
      thumbWrap.tabIndex = 0;
      const img = document.createElement('img');
      img.src = imgs[0];
      img.alt = p.name || 'Produto';
      img.loading = 'lazy';
      thumbWrap.appendChild(img);
      if (imgs.length > 1) {
        const badges = document.createElement('div');
        badges.className = 'card-thumb-badges';
        badges.innerHTML = '<span>' + imgs.length + ' fotos</span>';
        thumbWrap.appendChild(badges);
      }
      thumbWrap.addEventListener('click', function() { openLightbox(imgs, 0); });
      const body = document.createElement('div');
      body.className = 'card-body';
      body.innerHTML = '<div class="card-name">' + (p.name || 'Produto').replace(/</g, '&lt;') + '</div><div class="card-info">' + (p.sizesDisplay || '').replace(/</g, '&lt;') + '</div><div class="card-price">' + (p.priceDisplay || '').replace(/</g, '&lt;') + '</div>';
      card.appendChild(thumbWrap);
      card.appendChild(body);
      root.appendChild(card);
    });
  </script>
</body>
</html>`;
}

/**
 * Exporta produtos para output: baixa imagens, gera catalog.json e index.html.
 * @param {Array<{ name: string, sizes: { min: number, max: number } | null, price: string | null, messages: import('whatsapp-web.js').Message[] }>} products
 */
export async function exportCatalog(products) {
  await fs.mkdir(path.join(config.OUTPUT_DIR, ASSETS_DIR), { recursive: true });

  const catalog = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const images = [];
    for (let j = 0; j < p.messages.length; j++) {
      const rel = await downloadAndSave(p.messages[j], `product_${i}_${j}`);
      if (rel) images.push(rel);
    }
    catalog.push({
      name: p.name,
      sizes: p.sizes,
      sizesDisplay: formatSizes(p.sizes),
      price: p.price,
      priceDisplay: formatPrice(p.price),
      images,
    });
  }

  const catalogPath = path.join(config.OUTPUT_DIR, 'catalog.json');
  await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');

  const htmlPath = path.join(config.OUTPUT_DIR, 'index.html');
  await fs.writeFile(htmlPath, generateHtml(catalog), 'utf8');

  console.log(`Catálogo gerado: ${catalog.length} produtos`);
  console.log(`  - ${catalogPath}`);
  console.log(`  - ${htmlPath}`);
  return catalog;
}
