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

  const stepHints = ['bake', 'cream', 'pipe', 'decorate', 'sign'];

  const colors = ['#E59AA8','#F0BFA0','#B79FD0','#9DC7B0','#F0CD7A','#A04040','#C9A961','#FF8A3D','#FFD86B','#D9A4AB'];
  const sparkleChars = ['✦','✧','♡','❀','✿','★','◆','●'];

  let currentStep = 0;
  let topping = 'strawberry';
  let decoCount = 0;
  let candles = [];
  let litCount = 0;
  let musicOn = false;

  // 蜡烛定位：用 getScreenCTM 精确换算 SVG坐标→屏幕坐标（避免 preserveAspectRatio 导致偏移）
  function syncCandlesPos() {
    if (candlesBox.classList.contains('hidden')) return;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return;
    // 蛋糕顶层椭圆 cx=200 cy=190 ry=14，蜡烛底部立在顶面中心
    const pt = svgEl.createSVGPoint();
    pt.x = 200; pt.y = 192; // 顶面中心稍下，让蜡烛"插"在蛋糕里
    const screen = pt.matrixTransform(ctm);
    const sceneRect = cakeScene.getBoundingClientRect();
    candlesBox.style.left = (screen.x - sceneRect.left) + 'px';
    candlesBox.style.top = (screen.y - sceneRect.top) + 'px';
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

    initSignature();
  }

  /* ---------- 签名功能（步骤5） ---------- */
  const signCanvas = document.getElementById('signCanvas');
  const signCtx = signCanvas.getContext('2d');
  const signDoneBtn = document.getElementById('signDone');
  const signClearBtn = document.getElementById('signClear');
  let signing = false;
  let hasSigned = false;
  let lastPt = null;

  function initSignature() {
    // 固定内部分辨率（CSS 控制显示尺寸，避免隐藏时 getBoundingClientRect 为 0）
    signCanvas.width = 560;
    signCanvas.height = 180;
    signCtx.strokeStyle = '#7E2E2E';
    signCtx.lineWidth = 2.6;
    signCtx.lineCap = 'round';
    signCtx.lineJoin = 'round';

    function getPos(e) {
      const r = signCanvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      const sx = signCanvas.width / (r.width || 280);
      const sy = signCanvas.height / (r.height || 90);
      return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy };
    }
    function start(e) {
      e.preventDefault();
      signing = true;
      hasSigned = true;
      lastPt = getPos(e);
    }
    function move(e) {
      if (!signing) return;
      e.preventDefault();
      const pt = getPos(e);
      signCtx.beginPath();
      signCtx.moveTo(lastPt.x, lastPt.y);
      signCtx.lineTo(pt.x, pt.y);
      signCtx.stroke();
      lastPt = pt;
    }
    function end() { signing = false; }

    signCanvas.addEventListener('mousedown', start);
    signCanvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    signCanvas.addEventListener('mouseleave', end);
    signCanvas.addEventListener('touchstart', start, { passive: false });
    signCanvas.addEventListener('touchmove', move, { passive: false });
    signCanvas.addEventListener('touchend', end);

    signClearBtn.addEventListener('click', () => {
      signCtx.clearRect(0, 0, signCanvas.width, signCanvas.height);
      hasSigned = false;
    });
    signDoneBtn.addEventListener('click', finishSignature);
  }

  // 完成签名：把签名转图片，做成小卡片插在蛋糕顶层
  function finishSignature() {
    if (!hasSigned) {
      showToast('please sign first · 请先签名');
      return;
    }
    // 裁剪签名非空白区域
    const w = signCanvas.width, h = signCanvas.height;
    const data = signCtx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) { showToast('please sign first · 请先签名'); return; }
    const pad = 6;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w, maxX + pad); maxY = Math.min(h, maxY + pad);
    const cw = maxX - minX, ch = maxY - minY;
    const tmp = document.createElement('canvas');
    tmp.width = cw; tmp.height = ch;
    tmp.getContext('2d').drawImage(signCanvas, minX, minY, cw, ch, 0, 0, cw, ch);
    const dataUrl = tmp.toDataURL('image/png');

    // 在蛋糕顶层 SVG 中插入签名卡片
    const NS = 'http://www.w3.org/2000/svg';
    const topLayer = layers.find(l => l.classList.contains('g-l1'));
    const zone = topLayer.querySelector('.deco-zone');

    // ⭐ 分离定位层和动画层：外层只做translate定位（SVG属性，不被CSS覆盖）
    const posG = document.createElementNS(NS, 'g');
    posG.setAttribute('transform', 'translate(200, 176)'); // 顶层椭圆弧顶附近，牙签插在蛋糕里

    // 内层：动画层 + 所有卡片内容
    const card = document.createElementNS(NS, 'g');
    card.setAttribute('class', 'sign-card');
    posG.appendChild(card);

    // =============== 蕾丝花边（外层，围绕卡片一圈） ===============
    // 卡片外框尺寸（含蕾丝外延）：宽 96，高 44，内部卡片 88x36
    const laceW = 96, laceH = 44;
    const laceX = -laceW / 2, laceY = -56; // 卡片上移一点（卡片bg y=-52, 蕾丝外延再高4）

    // --- 蕾丝主边框（四角扇贝 + 每边齿状花边） ---
    // 思路：画一个大矩形路径，每条边用连续的半圆弧（扇贝）代替直线
    function buildLacePath(x, y, w, h, teeth) {
      // teeth: 每边齿数（横向边用，纵向减半）
      const rX = w / (teeth * 2);  // 横边每个扇贝半径（沿x方向）
      const rY = h / (teeth * 2);  // 竖边每个扇贝半径（沿y方向）
      let d = '';
      // 顶边：从左上 → 右上，扇贝向上凸（用 Q 二次贝塞尔）
      d += `M${x},${y}`;
      for (let i = 0; i < teeth; i++) {
        const sx = x + i * (w / teeth);
        const ex = sx + w / teeth;
        const mx = sx + w / teeth / 2;
        const my = y - rX * 0.9; // 扇贝向上凸出
        d += ` Q${mx},${my} ${ex},${y}`;
      }
      // 右边：右上 → 右下，扇贝向右凸
      d += ` L${x + w},${y}`;
      const vTeeth = Math.round(teeth * h / w);
      for (let i = 0; i < vTeeth; i++) {
        const sy = y + i * (h / vTeeth);
        const ey = sy + h / vTeeth;
        const my = sy + h / vTeeth / 2;
        const mx = x + w + rY * 0.9;
        d += ` Q${mx},${my} ${x + w},${ey}`;
      }
      // 底边：右下 → 左下，扇贝向下凸
      d += ` L${x + w},${y + h}`;
      for (let i = teeth - 1; i >= 0; i--) {
        const sx = x + (i + 1) * (w / teeth);
        const ex = i * (w / teeth) + x;
        const mx = sx - w / teeth / 2;
        const my = y + h + rX * 0.9;
        d += ` Q${mx},${my} ${ex},${y + h}`;
      }
      // 左边：左下 → 左上，扇贝向左凸
      d += ` L${x},${y + h}`;
      for (let i = vTeeth - 1; i >= 0; i--) {
        const sy = y + (i + 1) * (h / vTeeth);
        const ey = y + i * (h / vTeeth);
        const my = sy - h / vTeeth / 2;
        const mx = x - rY * 0.9;
        d += ` Q${mx},${my} ${x},${ey}`;
      }
      d += ' Z';
      return d;
    }

    // 蕾丝外层（扇贝大轮廓，浅粉底+描边）
    const laceOuter = document.createElementNS(NS, 'path');
    laceOuter.setAttribute('d', buildLacePath(laceX, laceY, laceW, laceH, 10));
    laceOuter.setAttribute('fill', '#FBE8EC');     // 莫兰迪浅粉
    laceOuter.setAttribute('stroke', '#D5A5AE');  // 莫兰迪豆沙粉描边
    laceOuter.setAttribute('stroke-width', '.8');
    card.appendChild(laceOuter);

    // 蕾丝内层（比外层小一圈，半透明叠加，增加层次感）
    const laceInner = document.createElementNS(NS, 'path');
    laceInner.setAttribute('d', buildLacePath(laceX + 3, laceY + 3, laceW - 6, laceH - 6, 8));
    laceInner.setAttribute('fill', 'rgba(255,255,255,.35)');
    laceInner.setAttribute('stroke', 'rgba(213,165,174,.45)');
    laceInner.setAttribute('stroke-width', '.5');
    card.appendChild(laceInner);

    // --- 蕾丝小孔：每边扇贝凹处的小圆点（镂空感） ---
    function addLaceHoles() {
      const holes = [];
      const teeth = 10, vTeeth = Math.round(teeth * laceH / laceW);
      // 顶边孔
      for (let i = 1; i < teeth; i++) {
        holes.push({ cx: laceX + i * (laceW / teeth), cy: laceY - 1.5, r: 1 });
      }
      // 底边孔
      for (let i = 1; i < teeth; i++) {
        holes.push({ cx: laceX + i * (laceW / teeth), cy: laceY + laceH + 1.5, r: 1 });
      }
      // 右边孔
      for (let i = 1; i < vTeeth; i++) {
        holes.push({ cx: laceX + laceW + 1.5, cy: laceY + i * (laceH / vTeeth), r: 1 });
      }
      // 左边孔
      for (let i = 1; i < vTeeth; i++) {
        holes.push({ cx: laceX - 1.5, cy: laceY + i * (laceH / vTeeth), r: 1 });
      }
      // 四角大花孔
      holes.push(
        { cx: laceX, cy: laceY, r: 1.3 },
        { cx: laceX + laceW, cy: laceY, r: 1.3 },
        { cx: laceX, cy: laceY + laceH, r: 1.3 },
        { cx: laceX + laceW, cy: laceY + laceH, r: 1.3 }
      );
      holes.forEach(h => {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', h.cx);
        c.setAttribute('cy', h.cy);
        c.setAttribute('r', h.r);
        c.setAttribute('fill', '#D5A5AE');
        c.setAttribute('opacity', '.7');
        card.appendChild(c);
      });
    }
    addLaceHoles();

    // 牙签（下端插在蛋糕里，上端支撑卡片）
    const stick = document.createElementNS(NS, 'line');
    stick.setAttribute('x1', '0'); stick.setAttribute('y1', '12');
    stick.setAttribute('x2', '0'); stick.setAttribute('y2', '-14');
    stick.setAttribute('stroke', '#C9A961');
    stick.setAttribute('stroke-width', '1.8');
    stick.setAttribute('stroke-linecap', 'round');
    card.appendChild(stick);

    // 卡片背景（在蕾丝内部）
    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('x', '-40'); bg.setAttribute('y', '-48');
    bg.setAttribute('width', '80'); bg.setAttribute('height', '28');
    bg.setAttribute('rx', '2');
    bg.setAttribute('fill', '#FFFBF0');
    bg.setAttribute('stroke', '#D5A5AE');
    bg.setAttribute('stroke-width', '.9');
    card.appendChild(bg);

    // 顶部小爱心装饰（在卡片背景上方中央，浮在内层蕾丝上）
    const heart = document.createElementNS(NS, 'text');
    heart.setAttribute('x', '0'); heart.setAttribute('y', '-50');
    heart.setAttribute('text-anchor', 'middle');
    heart.setAttribute('font-size', '7');
    heart.setAttribute('fill', '#D5A5AE');
    heart.textContent = '♡';
    card.appendChild(heart);

    // 签名图片（按比例缩放嵌入卡片中部）
    const maxW = 70, maxH = 16;
    let iw = cw, ih = ch;
    const s = Math.min(maxW / iw, maxH / ih);
    iw *= s; ih *= s;
    const img = document.createElementNS(NS, 'image');
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl);
    img.setAttribute('href', dataUrl);
    img.setAttribute('x', (-iw / 2).toFixed(1));
    img.setAttribute('y', (-34 - ih / 2).toFixed(1));
    img.setAttribute('width', iw.toFixed(1));
    img.setAttribute('height', ih.toFixed(1));
    img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    card.appendChild(img);

    // ⭐ 入场动画：从原点(牙签位置)缩放，卡片从蛋糕上"长"出来
    card.style.opacity = '0';
    card.style.transform = 'scale(.35)';
    card.style.transformOrigin = '0 0';
    card.style.transition = 'opacity .45s, transform .65s cubic-bezier(.34,1.56,.64,1)';
    zone.appendChild(posG);
    requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
    });
    spawnSparkles(card, 14);
    spawnConfetti(30);

    showToast('signed ♡ 签名已留在蛋糕上');
    signDoneBtn.disabled = true;
    setTimeout(() => {
      finishCake(); // 进入蜡烛阶段
    }, 900);
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
        <g transform="translate(-9,-9) scale(1.7)">
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
        <g transform="translate(-9,-9) scale(1.8)">
          <ellipse cx="9" cy="6" rx="6" ry="2.5" fill="#F7C8D2"/>
          <ellipse cx="9" cy="12" rx="6" ry="2.5" fill="#F7C8D2"/>
          <rect x="3" y="7.5" width="12" height="3" fill="#FBE0D0"/>
          <ellipse cx="9" cy="6" rx="6" ry="2.5" fill="none" stroke="#E8B0BC" stroke-width=".5"/>
        </g>`;
    }
    if (type === 'flower') {
      return `
        <g transform="translate(-9,-9) scale(1.7)">
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
        <g transform="translate(-9,-9) scale(1.8)">
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
    if (litNumEl) litNumEl.textContent = Math.min(n + 1, 5);
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
      <!-- 莫兰迪色系·明亮版裱花渐变 -->
      <radialGradient id="creamG1" cx="50%" cy="15%" r="80%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="45%" stop-color="#FCF0F3"/>
        <stop offset="100%" stop-color="#DFB0B9"/>
      </radialGradient>
      <radialGradient id="creamG2" cx="50%" cy="15%" r="80%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="45%" stop-color="#FCF3E9"/>
        <stop offset="100%" stop-color="#E1C0A8"/>
      </radialGradient>
      <radialGradient id="creamG3" cx="50%" cy="15%" r="80%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="45%" stop-color="#F5EFFB"/>
        <stop offset="100%" stop-color="#BBA8D0"/>
      </radialGradient>
      <filter id="creamShadow" x="-20%" y="-20%" width="140%" height="160%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
        <feOffset dx="0" dy="1.5"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.28"/></feComponentTransfer>
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
    const NS = 'http://www.w3.org/2000/svg';
    // ⭐ 分离定位层和动画层：外层只做translate定位（SVG属性，不被CSS覆盖），内层做CSS动画
    const wrap = `<svg xmlns="${NS}"><g transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})"><g class="deco-item">${getToppingInnerSvg(topping)}</g></g></svg>`;
    const doc = new DOMParser().parseFromString(wrap, 'image/svg+xml');
    const posG = doc.documentElement.firstElementChild; // 定位层
    if (!posG) return;
    const importedPos = document.importNode(posG, true);
    const animG = importedPos.firstElementChild; // 动画层
    // 弹出动画：内容已居中在原点(0,0)，用默认 SVG transform-origin 即可，不依赖 fill-box
    animG.style.opacity = '0';
    animG.style.transform = 'scale(.3)';
    animG.style.transformOrigin = '0 0';
    animG.style.transition = 'opacity .35s, transform .5s cubic-bezier(.34,1.56,.64,1)';
    zone.appendChild(importedPos);
    requestAnimationFrame(() => {
      animG.style.opacity = '1';
      animG.style.transform = 'scale(1)';
    });
    spawnSparkles(animG, 6);
    decoCount++;
    decoCountEl.textContent = decoCount;
    if (decoCount >= 5) {
      showToast('decorated · 装饰完成');
      setTimeout(() => setStep(4), 700); // 进入签名步骤
    }
  }

  // 完成：生成7根蜡烛
  function finishCake() {
    setStep(5);
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
