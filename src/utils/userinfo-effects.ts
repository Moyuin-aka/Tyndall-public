const initEnderHero = () => {
  const root = document.querySelector('.ender-hero') as HTMLElement | null;
  if (!root || root.dataset.initialized === 'true') {
    return () => {}; // Return an empty cleanup function
  }
  root.dataset.initialized = 'true';

  requestAnimationFrame(() => root.classList.add('is-mounted'));

  const measureHeaderAndSetVars = () => {
    const header =
      document.querySelector('header, .site-header, [data-role="header"], nav[aria-label="Primary"]') as HTMLElement | null;
    const h = header ? Math.round(header.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--header-offset', h + 'px');
    document.documentElement.style.setProperty('--hero-avail-h', Math.max(0, window.innerHeight - h) + 'px');
  }
  measureHeaderAndSetVars();
  window.addEventListener('resize', measureHeaderAndSetVars);
  const hdr = document.querySelector('header, .site-header, [data-role="header"], nav[aria-label="Primary"]') as HTMLElement | null;
  let resizeObserver: ResizeObserver | null = null;
  if (hdr && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(measureHeaderAndSetVars);
    resizeObserver.observe(hdr);
  }

  const canvasGrain = root?.querySelector('.grain-canvas') as HTMLCanvasElement | null;
  const canvasP = root?.querySelector('.particles-canvas') as HTMLCanvasElement | null;

  let rafGrain = 0;
  let rafParticles = 0;

  if (root && canvasGrain && canvasP) {
    const ctxGMaybe = canvasGrain.getContext('2d');
    const ctxPMaybe = canvasP.getContext('2d');
    if (!ctxGMaybe || !ctxPMaybe) {
      console.warn('[EnderHero] canvas 2D context unavailable.');
      return () => {};
    }
    const ctxG: CanvasRenderingContext2D = ctxGMaybe;
    const ctxP: CanvasRenderingContext2D = ctxPMaybe;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const enableParticles = (root.getAttribute('data-particles') || 'on') !== 'off';
    let width = 0, height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      canvasGrain.width = Math.floor(width * DPR);
      canvasGrain.height = Math.floor(height * DPR);
      canvasGrain.style.width = width + 'px';
      canvasGrain.style.height = height + 'px';
      ctxG.setTransform(DPR, 0, 0, DPR, 0, 0);

      canvasP.width = Math.floor(width * DPR);
      canvasP.height = Math.floor(height * DPR);
      canvasP.style.width = width + 'px';
      canvasP.style.height = height + 'px';
      ctxP.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    const tileW = 140, tileH = 90;
    const tile = document.createElement('canvas');
    tile.width = tileW; tile.height = tileH;
    const tctx = tile.getContext('2d', { willReadFrequently: true })!;

    function makeNoiseTile() {
      const img = tctx.createImageData(tileW, tileH);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        const a = (Math.random() * 42) | 0;
        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = a;
      }
      tctx.putImageData(img, 0, 0);
    }

    let lastGrain = 0;
    function drawGrain(t: number) {
      if (prefersReduced.matches) return;
      if (t - lastGrain > 66) {
        lastGrain = t;
        makeNoiseTile();
        const pat = ctxG.createPattern(tile, 'repeat');
        ctxG.globalCompositeOperation = 'source-over';
        const style = getComputedStyle(document.body);
        const op = Number(style.getPropertyValue('--grain-opacity')) || 0.09;
        ctxG.globalAlpha = Math.max(0, Math.min(0.35, op));
        ctxG.clearRect(0, 0, width, height);
        if (pat) {
          ctxG.fillStyle = pat;
          const dx = Math.sin(t * 0.0002) * 10;
          const dy = Math.cos(t * 0.00017) * 10;
          ctxG.save();
          ctxG.translate(dx, dy);
          ctxG.fillRect(-40, -40, width + 80, height + 80);
          ctxG.restore();
        }
      }
      rafGrain = requestAnimationFrame(drawGrain);
    }

    const start = performance.now();
    function drawParticles(t: number) {
      if (!enableParticles || prefersReduced.matches) return;
      const elapsed = (t - start) / 1000;
      ctxP.clearRect(0, 0, width, height);

      const count = Math.max(12, Math.floor(width * height / 16000));
      ctxP.fillStyle = '#fff';
      for (let i = 0; i < count; i++) {
        const x = Math.sin(i * 0.37 + elapsed * 0.15) * width * 0.42 + width * 0.5;
        const y = Math.cos(i * 0.29 + elapsed * 0.18) * height * 0.42 + height * 0.5;
        const size = (Math.sin(elapsed * 0.11 + i) + 1) * 0.8 + 0.6;
        const alpha = Math.sin(elapsed * 0.23 + i * 0.31) * 0.25 + 0.35;
        ctxP.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctxP.beginPath();
        ctxP.arc(x, y, size, 0, Math.PI * 2);
        ctxP.fill();
      }
      rafParticles = requestAnimationFrame(drawParticles);
    }

    resize();
    window.addEventListener('resize', resize);
    if (!prefersReduced.matches) {
      rafGrain = requestAnimationFrame(drawGrain);
      rafParticles = requestAnimationFrame(drawParticles);
    }

    const initParticlesBG = async () => {
      try {
        const [{ tsParticles }, { loadSlim }] = await Promise.all([
          import('tsparticles-engine'),
          import('tsparticles-slim')
        ]);
        await loadSlim(tsParticles);
        await tsParticles.load('ender-particles', {
          fpsLimit: 45,
          detectRetina: true,
          background: { color: 'transparent' },
          fullScreen: { enable: false },
          particles: {
            number: { value: 45, density: { enable: true, area: 1400 } },
            color: { value: ['#a259ec', '#b589f6', '#7b3bb8'] },
            shape: { type: 'square' },
            opacity: { value: { min: 0.18, max: 0.45 }, animation: { enable: true, speed: 0.4, minimumValue: 0.12, sync: false } },
            size: { value: { min: 1, max: 2.8 } },
            links: { enable: false },
            move: { enable: true, speed: 0.2, direction: 'top', random: true, straight: false, outModes: { default: 'out' }, drift: 0.2, angle: { offset: 0, value: 360 } }
          },
          interactivity: { events: { resize: true }, modes: {} }
        });
      } catch (e) {
        console.warn('[EnderParticles] init failed', e);
      }
    };

    initParticlesBG();

    const cleanup = () => {
      window.removeEventListener('resize', measureHeaderAndSetVars);
      window.removeEventListener('resize', resize);
      if (resizeObserver && hdr) resizeObserver.unobserve(hdr);
      cancelAnimationFrame(rafGrain);
      cancelAnimationFrame(rafParticles);
      if (root) {
        root.dataset.initialized = 'false';
        root.classList.remove('is-mounted');
      }
    };
    return cleanup;
  }
  return () => {}; // Return empty cleanup if canvas block failed
};

let cleanup = initEnderHero();
document.addEventListener('astro:after-swap', () => {
  if (cleanup) cleanup();
  cleanup = initEnderHero();
});
