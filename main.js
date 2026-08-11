/* TIE Tech Tree — chart host. No dependencies. */
(() => {
  "use strict";

  const DATA = window.TIE_DATA;
  const LORE = window.TIE_LORE || { ships: {}, edges: {} };
  const WIKI = "https://starwars.fandom.com/wiki/";
  const SEARCH = "https://starwars.fandom.com/wiki/Special:Search?query=";

  const STATUS = {
    both:    { label: "Canon and EU", cls: "both" },
    canon:   { label: "just Canon", cls: "canon" },
    legends: { label: "just EU (Legends)", cls: "legends" },
    hub:     { label: "annotation", cls: "both" }
  };

  const nodesById = new Map(DATA.nodes.map(n => [n.id, n]));

  // ---------- timeline scale ----------
  // piecewise-linear x scale over years relative to the Battle of Yavin
  const T_STOPS = [
    [-70, 0], [-30, 480], [-22, 780], [-18, 1140], [-12, 1520], [-5, 1900],
    [-1, 2260], [0, 2480], [1, 2700], [4, 3120], [11, 3560], [25, 3860],
    [45, 4160], [115, 4420], [140, 4900]
  ];
  const MX = 140, Y0 = 260, ROW_H = 190;
  function xOf(t) {
    const s = T_STOPS;
    if (t <= s[0][0]) return MX + s[0][1];
    for (let i = 1; i < s.length; i++) {
      if (t <= s[i][0]) {
        const f = (t - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
        return MX + s[i - 1][1] + f * (s[i][1] - s[i - 1][1]);
      }
    }
    return MX + s[s.length - 1][1];
  }
  const ERAS = [
    { label: "Republic era", t0: -70, t1: -19 },
    { label: "Rise of the Empire", t0: -19, t1: -5 },
    { label: "Galactic Civil War", t0: -5, t1: 4.9 },
    { label: "New Republic and beyond", t0: 4.9, t1: 50 },
    { label: "Legacy era", t0: 110, t1: 140 }
  ];
  const TL_TOP = 40;
  const TL_BOTTOM = Y0 + 18 * ROW_H + 150;

  // sprite sizing + node placement
  const SPR = window.TIE_SPRITES || {};
  const IMG_MAX = 110;
  for (const n of DATA.nodes) {
    if (typeof n.t === "number") {
      n.x = Math.round(xOf(n.t));
      n.y = Y0 + n.row * ROW_H;
    }
    const s = SPR[n.id];
    if (s) {
      const k = IMG_MAX / Math.max(s[0], s[1]);
      n.dw = Math.round(s[0] * k); n.dh = Math.round(s[1] * k);
    }
  }

  // distance from node center at which edges should stop
  function nodeRadius(n) {
    if (n.st === "hub") return 105;
    return n.dw ? Math.max(n.dw, n.dh) / 2 + 8 : 16;
  }

  // ---------- SVG scaffolding ----------
  const NS = "http://www.w3.org/2000/svg";
  const stage = document.getElementById("stage");
  const svg = document.createElementNS(NS, "svg");
  stage.appendChild(svg);

  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML =
    '<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="#c98500"/></marker>';
  svg.appendChild(defs);

  const gBands = document.createElementNS(NS, "g");
  const gEdges = document.createElementNS(NS, "g");
  const gNodes = document.createElementNS(NS, "g");
  svg.appendChild(gBands);
  svg.appendChild(gEdges);
  svg.appendChild(gNodes);

  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const COLOR = { both: cssVar("--c-both"), canon: cssVar("--c-canon"), legends: cssVar("--c-legends"), hub: "#71717a" };

  // ---------- era bands + Battle of Yavin marker ----------
  for (let i = 0; i < ERAS.length; i++) {
    const e = ERAS[i];
    const x0 = xOf(e.t0), x1 = xOf(e.t1);
    if (i % 2 === 0) {
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("x", x0); r.setAttribute("y", TL_TOP);
      r.setAttribute("width", x1 - x0); r.setAttribute("height", TL_BOTTOM - TL_TOP);
      r.setAttribute("fill", "rgba(255,255,255,0.022)");
      gBands.appendChild(r);
    }
    const edge = document.createElementNS(NS, "line");
    edge.setAttribute("x1", x0); edge.setAttribute("x2", x0);
    edge.setAttribute("y1", TL_TOP); edge.setAttribute("y2", TL_BOTTOM);
    edge.setAttribute("stroke", "#2a2a30"); edge.setAttribute("stroke-width", "1");
    gBands.appendChild(edge);
    for (const y of [TL_TOP + 40, TL_BOTTOM - 24]) {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", (x0 + x1) / 2); t.setAttribute("y", y);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("class", "era-label");
      t.textContent = e.label;
      gBands.appendChild(t);
    }
  }
  {
    const yx = xOf(0);
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", yx); line.setAttribute("x2", yx);
    line.setAttribute("y1", TL_TOP + 66); line.setAttribute("y2", TL_BOTTOM - 44);
    line.setAttribute("stroke", "#e4e4e7"); line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-dasharray", "3 7");
    line.setAttribute("opacity", "0.55");
    gBands.appendChild(line);
    for (const y of [TL_TOP + 84, TL_BOTTOM - 48]) {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", yx); t.setAttribute("y", y);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("class", "yavin-label");
      t.textContent = "◆ BATTLE OF YAVIN · 0 BBY/ABY";
      gBands.appendChild(t);
    }
  }

  // ---------- edges ----------
  const edgeEls = [];
  for (const e of DATA.edges) {
    const a = nodesById.get(e.f), b = nodesById.get(e.t);
    if (!a || !b) continue;
    const path = document.createElementNS(NS, "path");
    // shorten both ends so arrows meet sprite edges, not centers
    let dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const ax = a.x + ux * Math.min(nodeRadius(a), len * 0.4);
    const ay = a.y + uy * Math.min(nodeRadius(a), len * 0.4);
    const bx = b.x - ux * Math.min(nodeRadius(b), len * 0.4);
    const by = b.y - uy * Math.min(nodeRadius(b), len * 0.4);
    dx = bx - ax; dy = by - ay;
    const c1x = ax + dx * 0.5, c1y = ay, c2x = ax + dx * 0.5, c2y = by;
    path.setAttribute("d", `M ${ax} ${ay} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${bx} ${by}`);
    path.setAttribute("class", "edge");
    path.setAttribute("stroke", "#c98500");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("marker-end", "url(#arr)");
    if (e.type === "l") path.setAttribute("stroke-dasharray", "7 6");
    path.setAttribute("opacity", e.type === "l" ? "0.75" : "0.9");
    gEdges.appendChild(path);
    const hit = document.createElementNS(NS, "path");
    hit.setAttribute("d", path.getAttribute("d"));
    hit.setAttribute("class", "edge-hit");
    hit.dataset.key = `${e.f}->${e.t}`;
    gEdges.appendChild(hit);
    let qEl = null;
    if (e.q) {
      qEl = document.createElementNS(NS, "text");
      qEl.setAttribute("x", ax + dx * 0.5);
      qEl.setAttribute("y", ay + dy * 0.5 - 6);
      qEl.setAttribute("text-anchor", "middle");
      qEl.setAttribute("class", "edge-q");
      qEl.textContent = "?";
      gEdges.appendChild(qEl);
    }
    edgeEls.push({ e, path, qEl, hit });
  }
  const edgesByKey = new Map(edgeEls.map(x => [`${x.e.f}->${x.e.t}`, x]));

  // ---------- nodes ----------
  const nodeEls = new Map();
  for (const n of DATA.nodes) {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "node");
    g.setAttribute("data-id", n.id);

    if (n.st === "hub") {
      const r = document.createElementNS(NS, "rect");
      const w = 190, h = 46;
      r.setAttribute("x", n.x - w / 2); r.setAttribute("y", n.y - h / 2);
      r.setAttribute("width", w); r.setAttribute("height", h);
      r.setAttribute("rx", 8);
      r.setAttribute("fill", "#17171b");
      r.setAttribute("stroke", "#3f3f46");
      r.setAttribute("stroke-width", "1.5");
      g.appendChild(r);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", n.x); t.setAttribute("y", n.y - 3);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", "13");
      t.setAttribute("font-weight", "700");
      t.textContent = "Imperial Classified";
      const t2 = document.createElementNS(NS, "text");
      t2.setAttribute("x", n.x); t2.setAttribute("y", n.y + 13);
      t2.setAttribute("text-anchor", "middle");
      t2.setAttribute("font-size", "13");
      t2.setAttribute("font-weight", "700");
      t2.textContent = "Flight Yards";
      g.appendChild(t); g.appendChild(t2);
    } else {
      let labelY;
      if (n.dw) {
        const img = document.createElementNS(NS, "image");
        img.setAttribute("href", `ships/${n.id}.png`);
        img.setAttribute("x", n.x - n.dw / 2);
        img.setAttribute("y", n.y - n.dh / 2);
        img.setAttribute("width", n.dw);
        img.setAttribute("height", n.dh);
        g.appendChild(img);
        labelY = n.y + n.dh / 2 + 18;
      } else {
        // no artwork on the original chart — it shows a "?" placeholder
        const q = document.createElementNS(NS, "text");
        q.setAttribute("x", n.x); q.setAttribute("y", n.y + 10);
        q.setAttribute("text-anchor", "middle");
        q.setAttribute("font-size", "40");
        q.setAttribute("font-weight", "700");
        q.setAttribute("fill", "#71717a");
        q.textContent = "?";
        g.appendChild(q);
        labelY = n.y + 42;
      }

      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", n.x); t.setAttribute("y", labelY);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", "15");
      t.setAttribute("font-weight", "600");
      t.textContent = n.n;
      g.appendChild(t);

      const date = n.dl || n.dc;
      if (date) {
        const d = document.createElementNS(NS, "text");
        d.setAttribute("x", n.x); d.setAttribute("y", labelY + 18);
        d.setAttribute("text-anchor", "middle");
        d.setAttribute("font-size", "12");
        d.setAttribute("class", "n-date");
        d.textContent = date + (n.dc && n.dl ? ` · ${n.dc} (canon)` : "");
        g.appendChild(d);
      }

      // continuity dot beside the label (identity channel; legend explains it)
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cy", labelY - 5);
      dot.setAttribute("r", 4.5);
      dot.setAttribute("fill", COLOR[n.st]);
      dot.setAttribute("stroke", "#08080a");
      dot.setAttribute("stroke-width", "1.5");
      g.appendChild(dot);
      requestAnimationFrame(() => {
        try { dot.setAttribute("cx", n.x - t.getComputedTextLength() / 2 - 12); }
        catch (_) { dot.setAttribute("cx", n.x - 60); }
      });

      // selection ring + invisible hit target
      const halfW = Math.max(n.dw ? n.dw / 2 : 40, 55);
      const topY = n.dw ? n.y - n.dh / 2 : n.y - 25;
      const ring = document.createElementNS(NS, "rect");
      ring.setAttribute("class", "sel-ring");
      ring.setAttribute("x", n.x - halfW - 6); ring.setAttribute("y", topY - 6);
      ring.setAttribute("width", (halfW + 6) * 2);
      ring.setAttribute("height", labelY + 20 - topY + 6);
      ring.setAttribute("rx", 8);
      g.appendChild(ring);
      const hit = document.createElementNS(NS, "rect");
      hit.setAttribute("x", n.x - halfW); hit.setAttribute("y", topY - 4);
      hit.setAttribute("width", halfW * 2);
      hit.setAttribute("height", labelY + 18 - topY + 4);
      hit.setAttribute("fill", "transparent");
      g.appendChild(hit);
    }
    gNodes.appendChild(g);
    nodeEls.set(n.id, g);
  }

  // group labels
  for (const grp of DATA.groups) {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", grp.x); t.setAttribute("y", grp.y);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("class", grp.caption ? "section-caption" : "section-label");
    t.textContent = grp.caption ? `— ${grp.label} —` : grp.label;
    gNodes.appendChild(t);
  }

  // ---------- viewBox pan/zoom ----------
  const PAD = 120;
  const xs = DATA.nodes.map(n => n.x).concat([xOf(-70), xOf(140)]);
  const ys = DATA.nodes.map(n => n.y).concat([TL_TOP, TL_BOTTOM]);
  const world = {
    x: Math.min(...xs) - PAD, y: Math.min(...ys) - PAD,
    w: Math.max(...xs) - Math.min(...xs) + PAD * 2,
    h: Math.max(...ys) - Math.min(...ys) + PAD * 2
  };
  let vb = { ...world };

  function fit() {
    const ar = stage.clientWidth / Math.max(1, stage.clientHeight);
    const war = world.w / world.h;
    if (war > ar) { vb = { x: world.x, w: world.w, h: world.w / ar, y: world.y - (world.w / ar - world.h) / 2 }; }
    else { vb = { y: world.y, h: world.h, w: world.h * ar, x: world.x - (world.h * ar - world.w) / 2 }; }
    apply();
  }
  function apply() { svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); }

  function zoomAt(cx, cy, k) {
    const rect = stage.getBoundingClientRect();
    const wx = vb.x + (cx - rect.left) / rect.width * vb.w;
    const wy = vb.y + (cy - rect.top) / rect.height * vb.h;
    const minW = 300, maxW = world.w * 2.5;
    const nw = Math.min(maxW, Math.max(minW, vb.w * k));
    const nk = nw / vb.w;
    vb = { x: wx - (wx - vb.x) * nk, y: wy - (wy - vb.y) * nk, w: vb.w * nk, h: vb.h * nk };
    apply();
  }

  stage.addEventListener("wheel", ev => {
    ev.preventDefault();
    zoomAt(ev.clientX, ev.clientY, ev.deltaY > 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  // pan starts only after real movement, so clicks/taps on ships/links always land;
  // two touch pointers = pinch zoom
  let pan = null;
  let pinch = null;
  const pointers = new Map();

  stage.addEventListener("pointerdown", ev => {
    if (ev.target.closest(".detail") || ev.target.closest("a")) return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
      pan = null;
      stage.classList.remove("panning");
    } else if (pointers.size === 1 && (ev.button === 0 || ev.pointerType !== "mouse")) {
      pan = { x: ev.clientX, y: ev.clientY, vx: vb.x, vy: vb.y, moved: false, id: ev.pointerId };
    }
  });
  stage.addEventListener("pointermove", ev => {
    if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 20 && pinch.d > 20) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.d / d);
      pinch.d = d;
      return;
    }
    if (!pan || ev.pointerId !== pan.id) return;
    if (!pan.moved) {
      if (Math.abs(ev.clientX - pan.x) + Math.abs(ev.clientY - pan.y) < 7) return;
      pan.moved = true;
      stage.classList.add("panning");
      try { stage.setPointerCapture(pan.id); } catch (_) {}
    }
    const rect = stage.getBoundingClientRect();
    const dx = (ev.clientX - pan.x) / rect.width * vb.w;
    const dy = (ev.clientY - pan.y) / rect.height * vb.h;
    vb.x = pan.vx - dx; vb.y = pan.vy - dy;
    apply();
  });
  for (const evName of ["pointerup", "pointercancel"]) {
    stage.addEventListener(evName, ev => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinch = null;
      stage.classList.remove("panning");
      setTimeout(() => { pan = null; }, 0);
    });
  }

  document.getElementById("btnZoomIn").addEventListener("click", () => {
    const r = stage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.3);
  });
  document.getElementById("btnZoomOut").addEventListener("click", () => {
    const r = stage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.3);
  });
  document.getElementById("btnFit").addEventListener("click", fit);
  window.addEventListener("resize", fit);

  function centerOn(n) {
    vb.x = n.x - vb.w / 2; vb.y = n.y - vb.h / 2;
    if (vb.w > 1400) { const k = 1200 / vb.w, r = stage.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, k); vb.x = n.x - vb.w / 2; vb.y = n.y - vb.h / 2; }
    apply();
  }

  // ---------- Legends toggle ----------
  let showLegends = true;
  const btnLegends = document.getElementById("btnLegends");
  const countEl = document.getElementById("shipCount");

  function refreshVisibility() {
    let visible = 0;
    for (const n of DATA.nodes) {
      const hide = !showLegends && n.st === "legends";
      nodeEls.get(n.id).classList.toggle("dim", hide);
      if (!hide && n.st !== "hub") visible++;
    }
    for (const { e, path, qEl, hit } of edgeEls) {
      const hide = !showLegends &&
        (nodesById.get(e.f).st === "legends" || nodesById.get(e.t).st === "legends");
      path.classList.toggle("dim", hide);
      hit.classList.toggle("dim", hide);
      if (qEl) qEl.classList.toggle("dim", hide);
    }
    countEl.textContent = `${visible} ships`;
    btnLegends.classList.toggle("active", showLegends);
    btnLegends.textContent = showLegends ? "Legends/EU: on" : "Legends/EU: off";
    if (selected && !showLegends && nodesById.get(selected).st === "legends") clearSelection();
  }
  btnLegends.addEventListener("click", () => { showLegends = !showLegends; refreshVisibility(); });

  // ---------- tooltip ----------
  const tip = document.getElementById("tooltip");
  function tipHtml(n) {
    const s = STATUS[n.st];
    const dates = [n.dl && `${n.dl}${n.dc ? " (Legends)" : ""}`, n.dc && `${n.dc}${n.dl ? " (Canon)" : ""}`].filter(Boolean).join(" · ");
    return `<div class="t-name">${esc(n.n)}${n.alt ? ` <span class="t-dates">/ ${esc(n.alt)}</span>` : ""}</div>` +
      `<div class="t-status status-chip ${s.cls}">${s.label}</div>` +
      (dates ? `<div class="t-dates">${esc(dates)}</div>` : "") +
      (n.fan ? `<div class="t-note">image: ${esc(n.fan)}</div>` : "") +
      `<div class="t-hint">click to select — links &amp; notes appear in the side panel</div>`;
  }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  // ---------- selection / detail card ----------
  const detail = document.getElementById("detail");
  let selected = null;

  const tabDetail = document.getElementById("tabDetail");
  const detailPanelBody = document.getElementById("detailPanelBody");

  function activateTab(name) {
    for (const t of document.querySelectorAll(".tab")) {
      t.classList.toggle("active", t.dataset.tab === name);
      t.setAttribute("aria-selected", t.dataset.tab === name ? "true" : "false");
    }
    for (const p of document.querySelectorAll(".panel")) {
      p.classList.toggle("active", p.id === "panel-" + name);
    }
  }

  function clearSelection() {
    selected = null;
    detail.classList.remove("show");
    for (const g of nodeEls.values()) g.classList.remove("selected");
    for (const { path } of edgeEls) path.classList.remove("selected");
    if (!tabDetail.hidden) {
      const wasActive = tabDetail.classList.contains("active");
      tabDetail.hidden = true;
      if (wasActive) activateTab("about");
    }
  }

  function loreHtml(text) {
    if (!text) return "";
    return `<div class="d-sum">${text.split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join("")}</div>`;
  }

  function showPanels(html) {
    document.getElementById("detailBody").innerHTML = html;
    detailPanelBody.innerHTML = html;
    detail.classList.add("show");
    tabDetail.hidden = false;
    activateTab("detail");
    detailPanelBody.closest(".panel-scroll").scrollTop = 0;
  }

  function edgeTypeLabel(e) {
    return (e.type === "l" ? "loose connection" : "direct development") + (e.q ? " · uncertain link" : "");
  }

  function selectEdge(x) {
    const { e, path } = x;
    clearSelection();
    path.classList.add("selected");
    const a = nodesById.get(e.f), b = nodesById.get(e.t);
    const lore = LORE.edges[`${e.f}->${e.t}`];
    showPanels(
      `<h3>${esc(a.n)} <span style="color:#8fb300">→</span> ${esc(b.n)}</h3>` +
      `<div class="d-status" style="color:#c98500">${edgeTypeLabel(e)}</div>` +
      (e.note ? `<div class="d-note">${esc(e.note)}</div>` : "") +
      (lore ? loreHtml(lore) : `<div class="d-note">No write-up for this link yet.</div>`) +
      `<div class="d-edge-ships">` +
      `<button type="button" data-ship="${a.id}">◂ ${esc(a.n)}</button>` +
      `<button type="button" data-ship="${b.id}">${esc(b.n)} ▸</button>` +
      `</div>`
    );
  }

  function select(n) {
    clearSelection();
    selected = n.id;
    for (const [id, g] of nodeEls) g.classList.toggle("selected", id === n.id);
    const s = STATUS[n.st];
    const dates = [n.dl && `${n.dl}${n.dc ? " (Legends)" : ""}`, n.dc && `${n.dc}${n.dl ? " (Canon)" : ""}`].filter(Boolean).join(" · ");
    const links = [];
    if (n.wc) links.push(`<a href="${WIKI}${n.wc}" target="_blank" rel="noopener noreferrer">Wookieepedia (Canon) ↗</a>`);
    if (n.wl) links.push(`<a href="${WIKI}${n.wl}" target="_blank" rel="noopener noreferrer">Wookieepedia${n.wc ? " (Legends)" : ""} ↗</a>`);
    if (!links.length && n.search) links.push(`<a href="${SEARCH}${encodeURIComponent(n.search)}" target="_blank" rel="noopener noreferrer">Search Wookieepedia ↗</a>`);
    const html =
      (SPR[n.id] ? `<img class="d-ship" src="ships/${n.id}.png" alt="" />` : "") +
      `<h3>${esc(n.n)}${n.alt ? ` <span style="font-weight:400;color:#71717a">/ ${esc(n.alt)}</span>` : ""}</h3>` +
      `<div class="d-status status-chip ${s.cls}">${s.label}</div>` +
      (dates ? `<div class="d-dates">${esc(dates)}</div>` : "") +
      (n.fan ? `<div class="d-note">Image: ${esc(n.fan)}.</div>` : "") +
      (n.note ? `<div class="d-note">${esc(n.note)}</div>` : "") +
      `<div class="d-links">${links.join("")}</div>` +
      loreHtml(LORE.ships[n.id]);
    showPanels(html);
  }

  for (const el of [document.getElementById("detailBody"), detailPanelBody]) {
    el.addEventListener("click", ev => {
      const b = ev.target.closest("[data-ship]");
      if (!b) return;
      const n = nodesById.get(b.dataset.ship);
      select(n);
      centerOn(n);
    });
  }

  detail.addEventListener("pointerdown", ev => ev.stopPropagation());
  document.getElementById("detailClose").addEventListener("click", clearSelection);
  document.getElementById("detailPanelClose").addEventListener("click", clearSelection);
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") clearSelection(); });

  gNodes.addEventListener("pointermove", ev => {
    if (ev.pointerType !== "mouse") return;
    const g = ev.target.closest(".node");
    if (!g || g.classList.contains("dim")) { tip.classList.remove("show"); return; }
    const n = nodesById.get(g.dataset.id);
    if (n.st === "hub") {
      tip.innerHTML = `<div class="t-name">${esc(n.n)}</div><div class="t-note">${esc(n.note)}</div>`;
    } else {
      tip.innerHTML = tipHtml(n);
    }
    const r = stage.getBoundingClientRect();
    tip.style.left = Math.min(ev.clientX - r.left + 14, r.width - 310) + "px";
    tip.style.top = (ev.clientY - r.top + 14) + "px";
    tip.classList.add("show");
  });
  gNodes.addEventListener("pointerleave", () => tip.classList.remove("show"));

  // edge hover + click
  let hoveredEdge = null;
  gEdges.addEventListener("pointermove", ev => {
    if (ev.pointerType !== "mouse") return;
    const h = ev.target.closest(".edge-hit");
    if (hoveredEdge && (!h || edgesByKey.get(h.dataset.key) !== hoveredEdge)) {
      hoveredEdge.path.classList.remove("hovered");
      hoveredEdge = null;
    }
    if (!h) { tip.classList.remove("show"); return; }
    const x = edgesByKey.get(h.dataset.key);
    hoveredEdge = x;
    x.path.classList.add("hovered");
    const a = nodesById.get(x.e.f), b = nodesById.get(x.e.t);
    tip.innerHTML =
      `<div class="t-name">${esc(a.n)} → ${esc(b.n)}</div>` +
      `<div class="t-status" style="color:#c98500">${edgeTypeLabel(x.e)}</div>` +
      `<div class="t-hint">click for what changed between them</div>`;
    const r = stage.getBoundingClientRect();
    tip.style.left = Math.min(ev.clientX - r.left + 14, r.width - 310) + "px";
    tip.style.top = (ev.clientY - r.top + 14) + "px";
    tip.classList.add("show");
  });
  gEdges.addEventListener("pointerleave", () => {
    if (hoveredEdge) { hoveredEdge.path.classList.remove("hovered"); hoveredEdge = null; }
    tip.classList.remove("show");
  });
  gEdges.addEventListener("click", ev => {
    if (pan && pan.moved) return;
    const h = ev.target.closest(".edge-hit");
    if (!h) return;
    selectEdge(edgesByKey.get(h.dataset.key));
  });

  gNodes.addEventListener("click", ev => {
    if (pan && pan.moved) return;
    const g = ev.target.closest(".node");
    if (!g || g.classList.contains("dim")) { clearSelection(); return; }
    const n = nodesById.get(g.dataset.id);
    select(n);
  });
  // clicking empty map space (incl. era bands) closes the In Detail tab
  svg.addEventListener("click", ev => {
    if (pan && pan.moved) return;
    if (ev.target.closest(".node") || ev.target.closest(".edge-hit")) return;
    clearSelection();
  });
  stage.addEventListener("dblclick", ev => {
    ev.preventDefault();
    zoomAt(ev.clientX, ev.clientY, 1 / 1.6);
  });

  // ---------- tabs ----------
  for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  }
  const app = document.querySelector(".app");
  const btnInfo = document.getElementById("btnInfo");
  if (btnInfo) btnInfo.addEventListener("click", () => app.classList.toggle("show-info"));
  document.getElementById("sidebarClose").addEventListener("click", () => app.classList.remove("show-info"));

  // ---------- boot ----------
  refreshVisibility();
  fit();
})();
