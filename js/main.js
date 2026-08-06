(function() {
  'use strict';

  const intro = document.getElementById('intro');
  const introBtn = document.getElementById('introBtn');
  const musicBtn = document.getElementById('musicBtn');
  const audio = document.getElementById('bgAudio');
  const toast = document.getElementById('toast');
  const confettiLayer = document.getElementById('confetti');

  const cakeScene = document.getElementById('cakeScene');
  const oven = document.getElementById('oven');
  const creamBowl = document.getElementById('creamBowl');
  const pipeBag = document.getElementById('pipeBag');
  const layers = Array.from(document.querySelectorAll('.g-layer'));
  const svgEl = document.querySelector('.cake-svg');
  const steps = Array.from(document.querySelectorAll('.step'));
  const stepLines = Array.from(document.querySelectorAll('.step-line'));
  const toolPanels = Array.from(document.querySelectorAll('.tool-panel'));
  const bakeBtn = document.getElementById('bakeBtn');
  const toppingPalette = document.getElementById('toppingPalette');
  const decoCountEl = document.getElementById('decoCount');
  const litNumEl = document.getElementById('litNum');
  const stepHintEl = document.getElementById('stepHint');
  const candlesBox = document.getElementById('candles');
  const blowBtn = document.getElementById('blowBtn');
  const wish = document.getElementById('wish');
  const wishBlow = document.getElementById('wishBlow');
  const envelope = document.getElementById('envelope');
  const bakeryPanel = document.getElementById('bakeryPanel');
  const envPanel = document.getElementById('envPanel');
  const bottomBar = document.getElementById('bottomBar');

  // SVG坐标 → 实际像素坐标的转换辅助
  function svgPoint(clientX, clientY) {
    const pt = svgEl.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svgEl.getScreenCTM().inverse());
  }

  const stepHints = ['bake', 'cream', 'pipe', 'decorate'];

  const colors = ['#E59AA8','#F0BFA0','#B79FD0','#9DC7B0','#F0CD7A','#A04040','#C9A961','#FF8A3D','#FFD86B','#D9A4AB'];
  const sparkleChars = ['✦','✧','♡','❀','✿','★','◆','●'];

  let currentStep = 0;
  let topping = 'strawberry';
  let decoCount = 0;
  let candles = [];
  let litCount = 0;
  let musicOn = false;

  // 蜡烛定位：同步 candles 容器位置到 SVG 顶部蛋糕顶层
  function syncCandlesPos() {
    if (candlesBox.classList.contains('hidden')) return;
    const svgRect = svgEl.getBoundingClientRect();
    const sceneRect = cakeScene.getBoundingClientRect();
    // 蛋糕顶层中心位于 viewBox y≈176（顶层 ellipse cy=190, ry=14 → 顶面 y=176）
    const topY = (176 / 360) * svgRect.height;
    candlesBox.style.left = (svgRect.left - sceneRect.left + svgRect.width / 2) + 'px';
    candlesBox.style.top = (svgRect.top - sceneRect.top + topY) + 'px';
  }
  window.addEventListener('resize', syncCandlesPos);

  /* ---------- INTRO ---------- */
  introBtn.addEventListener('click', () => {
    intro.classList.add('hide');
    setTimeout(() => intro.style.display = 'none', 700);
    tryPlayMusic();
    initBakery();
    initEnvelope();
  });

  /* ---------- MUSIC ---------- */
  function tryPlayMusic() {
    audio.volume = 0.6;
    audio.play().then(() => { musicOn = true; musicBtn.classList.add('on'); })
      .catch(() => showToast('♡ tap music to play'));
  }
  musicBtn.addEventListener('click', () => {
    if (musicOn) { audio.pause(); musicOn = false; musicBtn.classList.remove('on'); }
    else { audio.play().then(() => { musicOn = true; musicBtn.classList.add('on'); }).catch(() => {}); }
  });

  /* ---------- BAKERY ---------- */
  function initBakery() {
    bakeBtn.addEventListener('click', doBake);
    cakeScene.addEventListener('click', e => {
      // 仅装饰步骤可点击蛋糕（裱花已改为自动动画）
      if (currentStep !== 3) return;
      const p = svgPoint(e.clientX, e.clientY);
      const layer = pickLayerByY(p.y);
      if (!layer) return;
      addTopping(layer, p);
    });

    // 鼠标悬停时显示当前饰品预览（提升操作连贯性）
    cakeScene.addEventListener('mousemove', e => {
      if (currentStep !== 3) return;
      const p = svgPoint(e.clientX, e.clientY);
      const layer = pickLayerByY(p.y);
      if (!layer) return;
      showDecoPreview(layer, p, e);
    });
    cakeScene.addEventListener('mouseleave', () => hideDecoPreview());
    toppingPalette.addEventListener('click', e => {
      const b = e.target.closest('.topping');
      if (!b) return;
      topping = b.dataset.t;
      toppingPalette.querySelectorAll('.topping').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  }

  // 根据SVG y坐标选择最近的可装饰蛋糕层
  function pickLayerByY(y) {
    // 各层顶面y：L3=276, L2=230, L1=190（加高蛋糕后贴合）
    const candidates = [
      { layer: layers.find(l => l.classList.contains('g-l1') && l.classList.contains('shown') && l.classList.contains('creamed')), cy: 190, range: 32 },
      { layer: layers.find(l => l.classList.contains('g-l2') && l.classList.contains('shown') && l.classList.contains('creamed')), cy: 230, range: 36 },
      { layer: layers.find(l => l.classList.contains('g-l3') && l.classList.contains('shown') && l.classList.contains('creamed')), cy: 276, range: 40 }
    ].filter(c => c.layer);
    let best = null, bestDist = Infinity;
    candidates.forEach(c => {
      const d = Math.abs(y - c.cy);
      if (d < c.range && d < bestDist) { best = c; bestDist = d; }
    });
    return best ? best.layer : (candidates[0] && candidates[0].layer);
  }

  // 饰品预览（跟随鼠标）
  let decoPreview = null;
  function showDecoPreview(layer, p, e) {
    if (!decoPreview) {
      decoPreview = document.createElement('div');
      decoPreview.className = 'deco-preview';
      decoPreview.style.cssText = 'position:fixed;pointer-events:none;z-index:50;opacity:.6;transform:translate(-50%,-50%);transition:opacity .2s';
      document.body.appendChild(decoPreview);
    }
    decoPreview.innerHTML = getToppingSvg(topping, 28);
    decoPreview.style.left = e.clientX + 'px';
    decoPreview.style.top = e.clientY + 'px';
  }
  function hideDecoPreview() {
    if (decoPreview) { decoPreview.remove(); decoPreview = null; }
  }

  // 生成饰品SVG字符串（HTML用）
  function getToppingSvg(type, size) {
    const s = size || 20;
    if (type === 'strawberry') {
      return `<svg viewBox="0 0 20 20" width="${s}" height="${s}"><path d="M10 4 C7 4 5 7 5 11 C5 15 7 17 10 17 C13 17 15 15 15 11 C15 7 13 4 10 4 Z" fill="#E8788C"/><path d="M7 4 L8 2 L10 3 L12 2 L13 4 L10 5 Z" fill="#7CB342"/><circle cx="8" cy="9" r=".6" fill="#fff"/><circle cx="11" cy="10" r=".6" fill="#fff"/><circle cx="9" cy="12" r=".6" fill="#fff"/><circle cx="12" cy="13" r=".6" fill="#fff"/></svg>`;
    }
    if (type === 'macaron') {
      return `<svg viewBox="0 0 20 20" width="${s}" height="${s}"><ellipse cx="10" cy="7" rx="6" ry="2.5" fill="#F7C8D2"/><ellipse cx="10" cy="13" rx="6" ry="2.5" fill="#F7C8D2"/><rect x="4" y="8.5" width="12" height="3" fill="#FBE0D0"/><ellipse cx="10" cy="7" rx="6" ry="2.5" fill="none" stroke="#E8B0BC" stroke-width=".5"/></svg>`;
    }
    if (type === 'flower') {
      return `<svg viewBox="0 0 20 20" width="${s}" height="${s}"><g fill="#F7C8D2"><circle cx="10" cy="6" r="3"/><circle cx="6" cy="10" r="3"/><circle cx="14" cy="10" r="3"/><circle cx="8" cy="14" r="3"/><circle cx="12" cy="14" r="3"/></g><circle cx="10" cy="10" r="2" fill="#FBE3A0"/></svg>`;
    }
    if (type === 'star') {
      return `<svg viewBox="0 0 20 20" width="${s}" height="${s}"><path d="M10 3 L12 8 L17 8.5 L13 12 L14 17 L10 14.5 L6 17 L7 12 L3 8.5 L8 8 Z" fill="#FBE3A0" stroke="#E8C878" stroke-width=".5"/></svg>`;
    }
    return '';
  }

  // 生成饰品SVG字符串（用于嵌入蛋糕SVG内）
  function getToppingInnerSvg(type) {
    if (type === 'strawberry') {
      return `
        <g transform="translate(-9,-9) scale(1.05)">
          <path d="M9 3 C6 3 4 6 4 10 C4 14 6 16 9 16 C12 16 14 14 14 10 C14 6 12 3 9 3 Z" fill="#E8788C"/>
          <path d="M6 3 L7 1 L9 2 L11 1 L12 3 L9 4 Z" fill="#7CB342"/>
          <circle cx="7" cy="8" r=".6" fill="#fff"/>
          <circle cx="10" cy="9" r=".6" fill="#fff"/>
          <circle cx="8" cy="11" r=".6" fill="#fff"/>
          <circle cx="11" cy="12" r=".6" fill="#fff"/>
        </g>`;
    }
    if (type === 'macaron') {
      return `
        <g transform="translate(-9,-9) scale(1.1)">
          <ellipse cx="9" cy="6" rx="6" ry="2.5" fill="#F7C8D2"/>
          <ellipse cx="9" cy="12" rx="6" ry="2.5" fill="#F7C8D2"/>
          <rect x="3" y="7.5" width="12" height="3" fill="#FBE0D0"/>
          <ellipse cx="9" cy="6" rx="6" ry="2.5" fill="none" stroke="#E8B0BC" stroke-width=".5"/>
        </g>`;
    }
    if (type === 'flower') {
      return `
        <g transform="translate(-9,-9) scale(1.05)">
          <g fill="#F7C8D2">
            <circle cx="9" cy="5" r="3"/>
            <circle cx="5" cy="9" r="3"/>
            <circle cx="13" cy="9" r="3"/>
            <circle cx="7" cy="13" r="3"/>
            <circle cx="11" cy="13" r="3"/>
          </g>
          <circle cx="9" cy="9" r="2" fill="#FBE3A0"/>
        </g>`;
    }
    if (type === 'star') {
      return `
        <g transform="translate(-9,-9) scale(1.1)">
          <path d="M9 2 L11 7 L16 7.5 L12 11 L13 16 L9 13.5 L5 16 L6 11 L2 7.5 L7 7 Z" fill="#FBE3A0" stroke="#E8C878" stroke-width=".5"/>
        </g>`;
    }
    return '';
  }

  function setStep(n) {
    currentStep = n;
    steps.forEach((s, i) => {
      s.classList.toggle('active', i === n);
      s.classList.toggle('done', i < n);
    });
    stepLines.forEach((l, i) => l.classList.toggle('done', i < n));
    toolPanels.forEach(p => p.classList.toggle('active', +p.dataset.step === n));
    cakeScene.classList.toggle('clickable', n === 2 || n === 3);
    if (litNumEl) litNumEl.textContent = Math.min(n + 1, 4);
    if (stepHintEl && stepHints[n]) stepHintEl.textContent = stepHints[n];
    // 工具元素显隐
    creamBowl.classList.toggle('show', n === 1);
    pipeBag.classList.toggle('show', n === 2);
  }

  // 步骤1：烤胚（完成后自动抹奶油）
  function doBake() {
    bakeBtn.disabled = true;
    oven.classList.add('baking');
    oven.querySelector('.oven-text').textContent = 'baking...';
    showToast('baking · 烘烤中…');
    setTimeout(() => {
      oven.classList.remove('baking');
      oven.classList.add('hide');
      oven.querySelector('.oven-text').textContent = 'done';
      // 三层蛋糕胚逐层升起
      layers.forEach((l, i) => {
        setTimeout(() => {
          l.classList.add('shown');
          spawnSparkles(l, 6);
        }, i * 200);
      });
      setTimeout(() => {
        showToast('sponge ready · 自动抹奶油中…');
        setStep(1);
        bakeBtn.disabled = false;
        // 自动抹奶油（无需点击）
        setTimeout(doCream, 700);
      }, 900);
    }, 1800);
  }

  // 步骤2：抹奶油（自动播放丝滑动画）
  function doCream() {
    layers.forEach((l, i) => {
      setTimeout(() => {
        l.classList.add('creamed');
        spawnSparkles(l, 6);
      }, i * 350);
    });
    setTimeout(() => {
      showToast('frosted · 抹奶油完成');
      setStep(2);
      // 自动开始裱花（无需点击）
      setTimeout(doPipe, 600);
    }, 2000);
  }

  // 步骤3：裱花（连续扇贝贝壳边，沿蛋糕层底部边缘一气呵成）
  function doPipe() {
    pipeBag.classList.add('piping');
    const svgEl = document.querySelector('.cake-svg');
    const defs = svgEl.querySelector('defs');

    const creamDefs = `
      <radialGradient id="creamG1" cx="50%" cy="15%" r="80%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="45%" stop-color="#FFF0F3"/>
        <stop offset="100%" stop-color="#E892A4"/>
      </radialGradient>
      <radialGradient id="creamG2" cx="50%" cy="15%" r="80%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="45%" stop-color="#FFF6E8"/>
        <stop offset="100%" stop-color="#EDB890"/>
      </radialGradient>
      <radialGradient id="creamG3" cx="50%" cy="15%" r="80%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="45%" stop-color="#F4ECFC"/>
        <stop offset="100%" stop-color="#B898D4"/>
      </radialGradient>
      <filter id="creamShadow" x="-20%" y="-20%" width="140%" height="160%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
        <feOffset dx="0" dy="1.5"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    `;
    const defsTmp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    defsTmp.innerHTML = creamDefs;
    defs.appendChild(defsTmp);

    // 三层连续扇贝边
    const configs = [
      { layer: layers[2], cx: 200, cy: 276, rx: 148, ry: 20, count: 14, depth: 14, gradId: 'creamG1' },
      { layer: layers[1], cx: 200, cy: 230, rx: 114, ry: 16, count: 12, depth: 10, gradId: 'creamG2' },
      { layer: layers[0], cx: 200, cy: 190, rx: 80, ry: 12, count: 9, depth: 8, gradId: 'creamG3' }
    ];

    let totalDelay = 0;
    configs.forEach((cfg) => {
      setTimeout(() => addScallopBorder(cfg), totalDelay);
      totalDelay += 800;
    });

    setTimeout(() => {
      pipeBag.classList.remove('piping');
      showToast('piping done · 裱花完成');
      setStep(3);
    }, totalDelay + 400);
  }

  // 连续扇贝贝壳边：一条 path 画出整条边，每个贝壳下凸弧形 + 辐射脊线
  function addScallopBorder(cfg) {
    const NS = 'http://www.w3.org/2000/svg';
    const zone = cfg.layer.querySelector('.deco-zone');
    const { cx, cy, rx, ry, count, depth, gradId } = cfg;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'shell-border');

    const startTheta = 0.05 * Math.PI;
    const endTheta = 0.95 * Math.PI;

    // 沿椭圆前半圈取边缘点
    const pts = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const theta = startTheta + t * (endTheta - startTheta);
      pts.push({ x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta) });
    }

    // 连续扇贝 path：上边缘直线 + 下边缘弧形（从右到左）
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) d += ` L${pts[i].x},${pts[i].y}`;
    for (let i = pts.length - 1; i > 0; i--) {
      const p1 = pts[i], p2 = pts[i - 1];
      const mx = (p1.x + p2.x) / 2;
      const my = Math.max(p1.y, p2.y) + depth;
      d += ` Q${mx},${my} ${p2.x},${p2.y}`;
    }
    d += ' Z';

    // 主形状
    const body = document.createElementNS(NS, 'path');
    body.setAttribute('d', d);
    body.setAttribute('fill', `url(#${gradId})`);
    body.setAttribute('stroke', 'rgba(255,255,255,.55)');
    body.setAttribute('stroke-width', '.5');
    body.setAttribute('stroke-linejoin', 'round');
    body.setAttribute('filter', 'url(#creamShadow)');
    g.appendChild(body);

    // 每个贝壳的辐射脊线（从底部中心向顶部边缘辐射，像扇子骨架）
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i], p2 = pts[i + 1];
      const bx = (p1.x + p2.x) / 2;
      const by = Math.max(p1.y, p2.y) + depth;
      const ty = (p1.y + p2.y) / 2;
      const seg = Math.abs(p2.x - p1.x);
      for (const pos of [-0.35, 0, 0.35]) {
        const tx = bx + pos * seg;
        const ridge = document.createElementNS(NS, 'path');
        ridge.setAttribute('d', `M${bx},${by} Q${bx + pos * seg * 0.3},${(by + ty) / 2} ${tx},${ty}`);
        ridge.setAttribute('stroke', pos === 0 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.35)');
        ridge.setAttribute('stroke-width', pos === 0 ? '.45' : '.35');
        ridge.setAttribute('fill', 'none');
        ridge.setAttribute('stroke-linecap', 'round');
        g.appendChild(ridge);
      }
    }

    zone.appendChild(g);
    spawnSparkles(g, 5);
  }

  // 步骤4：装饰 - 使用奶油风SVG饰品（草莓/马卡龙/小花/星星糖珠）
  function addTopping(layer, p) {
    if (decoCount >= 5) return;
    const zone = layer.querySelector('.deco-zone');
    if (!zone) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'deco-item');
    g.setAttribute('transform', `translate(${p.x},${p.y})`);
    // 解析SVG片段并附加到g
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tmp.innerHTML = getToppingInnerSvg(topping);
    while (tmp.firstChild) g.appendChild(tmp.firstChild);
    zone.appendChild(g);
    spawnSparkles(g, 5);
    decoCount++;
    decoCountEl.textContent = decoCount;
    if (decoCount >= 5) {
      showToast('decorated · 装饰完成');
      setTimeout(finishCake, 700);
    }
  }

  // 完成：生成5根蜡烛
  function finishCake() {
    setStep(4);
    candlesBox.classList.remove('hidden');
    candlesBox.classList.add('appear');
    const candleColors = ['', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
    candlesBox.innerHTML = candleColors.map((c, i) => `
      <div class="candle" data-i="${i}">
        <div class="flame-wrap">
          <div class="flame-glow"></div>
          <div class="flame-outer"></div>
          <div class="flame-mid"></div>
          <div class="flame-inner"></div>
        </div>
        <div class="wick"></div>
        <div class="stick ${c}">
          <span class="stripe s1"></span><span class="stripe s2"></span>
          <span class="stripe s3"></span><span class="stripe s4"></span>
          <span class="drip d1"></span><span class="drip d2"></span>
        </div>
        <div class="smoke"></div>
      </div>
    `).join('');
    // 同步蜡烛位置到蛋糕顶层
    requestAnimationFrame(() => {
      syncCandlesPos();
      candlesBox.classList.add('ready');
    });
    candles = Array.from(candlesBox.querySelectorAll('.candle'));
    candles.forEach(c => c.addEventListener('click', ev => {
      ev.stopPropagation();
      if (c.classList.contains('blown')) return;
      const on = c.classList.toggle('on');
      updateLit();
      if (on) {
        spawnSparkles(c, 12);
        if (litCount === candles.length) showToast('all lit · 许愿吧');
      }
    }));
    showToast('cake done ♡ 点蜡烛');
    spawnConfetti(40);
  }

  function updateLit() {
    litCount = candles.filter(c => c.classList.contains('on')).length;
    blowBtn.disabled = litCount < candles.length;
  }

  blowBtn.addEventListener('click', () => {
    if (litCount < candles.length) {
      showToast(`light all candles · ${litCount}/${candles.length}`);
      return;
    }
    wish.classList.add('show');
  });
  wishBlow.addEventListener('click', () => {
    wish.classList.remove('show');
    doBlow();
  });

  function doBlow() {
    candles.forEach((c, i) => {
      setTimeout(() => {
        c.classList.remove('on');
        c.classList.add('blown');
        const smoke = c.querySelector('.smoke');
        smoke.style.animation = 'none';
        smoke.offsetHeight;
        smoke.style.animation = '';
        spawnSoftBurst(c);
        if (i === candles.length - 1) {
          updateLit();
          showToast('天天开心 ♡');
          spawnConfetti(120);
          // 1.4秒后切换到信封界面
          setTimeout(switchToEnvelope, 1400);
        }
      }, i * 170);
    });
  }

  // 切换到信封界面：隐藏蛋糕制作台，显示信封
  function switchToEnvelope() {
    bakeryPanel.classList.add('fade-out');
    bottomBar.classList.add('fade-out');
    setTimeout(() => {
      bakeryPanel.hidden = true;
      bottomBar.hidden = true;
      envPanel.hidden = false;
      envPanel.classList.add('fade-in');
      // 信封出现时来一波彩纸
      setTimeout(() => spawnConfetti(50), 200);
    }, 500);
  }

  /* ---------- ENVELOPE (抽拉式) ---------- */
  function initEnvelope() {
    let opened = false;
    envelope.addEventListener('click', () => {
      opened = !opened;
      if (opened) {
        envelope.classList.add('open');
        // 信纸开始上移后，允许溢出封套显示（避免被 overflow:hidden 裁切）
        setTimeout(() => envelope.classList.add('show-overflow'), 350);
        const r = envelope.getBoundingClientRect();
        confettiBurst(r.left + r.width / 2, r.top + r.height / 2, 30);
      } else {
        envelope.classList.remove('show-overflow');
        setTimeout(() => envelope.classList.remove('open'), 100);
      }
    });
  }

  /* ---------- EFFECTS ---------- */
  function spawnSparkles(el, n) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle-p';
      s.textContent = sparkleChars[Math.floor(Math.random() * sparkleChars.length)];
      const size = 8 + Math.random() * 10;
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 40;
      s.style.cssText = `left:${cx}px;top:${cy}px;font-size:${size}px;color:${colors[Math.floor(Math.random()*colors.length)]};--dx:${Math.cos(angle)*dist}px;--dy:${Math.sin(angle)*dist}px;animation-duration:${.55+Math.random()*.45}s;`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    }
  }
  function spawnSoftBurst(candle) {
    const rect = candle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top - 4;
    for (let i = 0; i < 6; i++) {
      const el = document.createElement('span');
      el.className = 'sparkle-p';
      el.textContent = Math.random() > .5 ? '~' : '·';
      el.style.cssText = `left:${cx}px;top:${cy}px;font-size:${10+Math.random()*6}px;color:rgba(160,140,130,.8);--dx:${(Math.random()-.5)*50}px;--dy:${-30-Math.random()*40}px;animation-duration:${1+Math.random()*.6}s;`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1800);
    }
  }
  function confettiBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      const radius = Math.random() > .5 ? '50%' : '';
      p.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${4+Math.random()*5}px;height:${7+Math.random()*7}px;border-radius:${radius};background:${colors[Math.floor(Math.random()*colors.length)]};z-index:110;pointer-events:none;`;
      document.body.appendChild(p);
      const a = -Math.PI/2 + (Math.random()-.5)*Math.PI;
      const d = 50 + Math.random()*120;
      p.animate([{transform:'translate(0,0) rotate(0)',opacity:1},
        {transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d+100}px) rotate(${Math.random()*360}deg)`,opacity:0}],
        {duration:950+Math.random()*450,easing:'cubic-bezier(.22,1,.36,1)'});
      setTimeout(() => p.remove(), 1600);
    }
  }
  function spawnConfetti(n) {
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      const radius = Math.random() > .5 ? '50%' : '';
      p.style.cssText = `left:${5+Math.random()*90}%;width:${4+Math.random()*7}px;height:${8+Math.random()*9}px;border-radius:${radius};background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${2.5+Math.random()*2.8}s;animation-delay:${Math.random()*1.5}s;`;
      confettiLayer.appendChild(p);
      setTimeout(() => p.remove(), 6500);
    }
  }

  /* ---------- TOAST ---------- */
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

})();
