/**
 * graph.js — 路線図描画エンジン
 * SVGで路線図のノード・ライン・ラベルを描画する
 */

const Graph = (() => {
  let svg = null;
  let states = {};
  let currentState = null;

  function init(svgElement) {
    svg = svgElement;
  }

  function loadStates(data) {
    states = data;
  }

  function draw(stateKey, animate = true) {
    const state = states[stateKey];
    if (!state) return;
    currentState = stateKey;

    // SVGサイズ計算
    let maxX = 200, maxY = 160;
    state.nodes.forEach(n => {
      maxX = Math.max(maxX, n.x + 100);
      maxY = Math.max(maxY, n.y + 60);
    });
    (state.labels || []).forEach(l => {
      maxX = Math.max(maxX, l.x + 80);
      maxY = Math.max(maxY, l.y + 20);
    });
    svg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
    svg.innerHTML = '';

    // グリッド背景（薄い点）
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // グローフィルター
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'glow');
    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '3');
    blur.setAttribute('result', 'glow');
    filter.appendChild(blur);
    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const m1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    m1.setAttribute('in', 'glow');
    const m2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    m2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(m1);
    merge.appendChild(m2);
    filter.appendChild(merge);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // ライン描画
    state.lines.forEach((l, i) => {
      const line = _createLine(l);
      if (animate) {
        line.style.opacity = '0';
        line.style.transition = `opacity 0.4s ease ${i * 0.1}s`;
        requestAnimationFrame(() => { line.style.opacity = '1'; });
      }
      svg.appendChild(line);
    });

    // ノード描画
    state.nodes.forEach((n, i) => {
      const g = _createNode(n);
      if (animate) {
        g.style.opacity = '0';
        g.style.transition = `opacity 0.4s ease ${(state.lines.length * 0.1) + i * 0.12}s`;
        requestAnimationFrame(() => { g.style.opacity = '1'; });
      }
      svg.appendChild(g);
    });

    // ブランチラベル描画
    (state.labels || []).forEach((l, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', l.x);
      text.setAttribute('y', l.y);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', l.color);
      text.setAttribute('class', 'branch-label');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-family', "'Share Tech Mono', monospace");
      text.setAttribute('opacity', '0.7');
      text.textContent = l.text;
      if (animate) {
        text.style.opacity = '0';
        text.style.transition = `opacity 0.5s ease ${0.5 + i * 0.1}s`;
        requestAnimationFrame(() => { text.style.opacity = '0.7'; });
      }
      svg.appendChild(text);
    });
  }

  function _createLine(l) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', l.x1);
    line.setAttribute('y1', l.y1);
    line.setAttribute('x2', l.x2);
    line.setAttribute('y2', l.y2);
    line.setAttribute('stroke', l.color);
    line.setAttribute('stroke-width', '2.5');
    line.setAttribute('stroke-linecap', 'round');
    if (l.dashed) line.setAttribute('stroke-dasharray', '6,4');
    return line;
  }

  function _createNode(n) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // 発光エフェクト（glowノード）
    if (n.glow) {
      const glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glowCircle.setAttribute('cx', n.x);
      glowCircle.setAttribute('cy', n.y);
      glowCircle.setAttribute('r', '16');
      glowCircle.setAttribute('fill', n.color);
      glowCircle.setAttribute('opacity', '0.15');
      glowCircle.setAttribute('filter', 'url(#glow)');
      g.appendChild(glowCircle);
    }

    // 外枠（破線ノード）
    if (n.dashed) {
      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outer.setAttribute('cx', n.x);
      outer.setAttribute('cy', n.y);
      outer.setAttribute('r', '12');
      outer.setAttribute('fill', 'none');
      outer.setAttribute('stroke', n.color);
      outer.setAttribute('stroke-width', '1.5');
      outer.setAttribute('stroke-dasharray', '3,2');
      outer.setAttribute('opacity', '0.5');
      g.appendChild(outer);
    }

    // メインの丸
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', n.x);
    circle.setAttribute('cy', n.y);
    circle.setAttribute('r', n.dashed ? '6' : '8');
    circle.setAttribute('fill', n.dashed ? 'transparent' : n.color);
    circle.setAttribute('stroke', n.color);
    circle.setAttribute('stroke-width', n.dashed ? '1.5' : '0');
    g.appendChild(circle);

    // ラベル
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', n.x);
    text.setAttribute('y', n.y + 24);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', n.color);
    text.setAttribute('font-size', '10');
    text.setAttribute('font-family', "'M PLUS 1p', sans-serif");
    text.setAttribute('opacity', '0.9');
    text.textContent = n.label;
    g.appendChild(text);

    return g;
  }

  function drawLegend(container, items) {
    container.innerHTML = items.map(item =>
      `<div style="display:flex;align-items:center;gap:6px;font-size:0.72rem;color:${item.color};font-family:'Share Tech Mono',monospace">
        <div style="width:20px;height:3px;background:${item.color};border-radius:2px"></div>
        ${item.label}
      </div>`
    ).join('');
  }

  return { init, loadStates, draw, drawLegend };
})();
