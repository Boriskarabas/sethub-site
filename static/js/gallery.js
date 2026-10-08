/* Set Hub gallery — iPhone Photos-style zoomable grid (FLIP-animated) */

(function () {
  "use strict";

  var SETS = [
    { slug: "set-hub", name: "16 Set Studio" },
    { slug: "roof-top", name: "The Rooftop" },
    { slug: "car-set", name: "Car Set" }
  ];
  var MIN_COLS = 2, MAX_COLS = 8;
  var state = { cols: 5, photos: [], filter: "all", lbIndex: 0 };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function getJSON(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error(path + ": " + r.status);
      return r.json();
    });
  }

  function visiblePhotos() {
    return state.filter === "all"
      ? state.photos
      : state.photos.filter(function (p) { return p.set === state.filter; });
  }

  function renderGrid() {
    var grid = $("zgrid");
    grid.innerHTML = "";
    visiblePhotos().forEach(function (p, i) {
      var d = document.createElement("div");
      d.className = "zitem";
      d.innerHTML = '<img src="' + p.src + '" alt="' + esc(p.setName) + ' photo" loading="lazy">';
      d.addEventListener("click", function () { openLB(i); });
      grid.appendChild(d);
    });
  }

  /* smooth zoom via FLIP */
  function setCols(n, animate) {
    n = clamp(Math.round(n), MIN_COLS, MAX_COLS);
    if (n === state.cols) return;
    var grid = $("zgrid");
    var items = Array.prototype.slice.call(grid.children);
    var first = animate ? items.map(function (el) { return el.getBoundingClientRect(); }) : null;
    state.cols = n;
    grid.style.setProperty("--cols", n);
    $("zoomRange").value = n;
    if (first) {
      items.forEach(function (el, i) {
        var f = first[i], l = el.getBoundingClientRect();
        if (!f.width || !l.width) return;
        var dx = f.left - l.left, dy = f.top - l.top;
        var sx = f.width / l.width, sy = f.height / l.height;
        el.animate(
          [
            { transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")", transformOrigin: "top left" },
            { transform: "translate(0,0) scale(1,1)", transformOrigin: "top left" }
          ],
          { duration: 240, easing: "cubic-bezier(.25,.8,.3,1)" }
        );
      });
    }
  }

  /* lightbox */
  function openLB(i) {
    state.lbIndex = i;
    syncLB();
    $("glb").classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLB() {
    $("glb").classList.remove("open");
    document.body.style.overflow = "";
  }
  function syncLB() {
    var list = visiblePhotos();
    var p = list[state.lbIndex];
    if (p) $("glbImg").src = p.src;
  }
  function stepLB(d) {
    var list = visiblePhotos();
    state.lbIndex = (state.lbIndex + d + list.length) % list.length;
    syncLB();
  }

  function init() {
    if (!$("zgrid")) return;

    /* filters */
    var filters = $("galFilters");
    [{ slug: "all", name: "All" }].concat(SETS).forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "gfilter" + (s.slug === "all" ? " on" : "");
      b.textContent = s.name;
      b.dataset.slug = s.slug;
      b.addEventListener("click", function () {
        state.filter = s.slug;
        filters.querySelectorAll(".gfilter").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        renderGrid();
      });
      filters.appendChild(b);
    });

    /* zoom controls */
    $("zoomIn").addEventListener("click", function () { setCols(state.cols - 1, true); });
    $("zoomOut").addEventListener("click", function () { setCols(state.cols + 1, true); });
    $("zoomRange").addEventListener("input", function (e) { setCols(+e.target.value, true); });

    /* ctrl/cmd + wheel = zoom, plain wheel = scroll */
    var grid = $("zgrid");
    grid.addEventListener("wheel", function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setCols(state.cols + (e.deltaY > 0 ? 1 : -1), true);
    }, { passive: false });

    /* pinch to zoom */
    var pinchD = 0;
    grid.addEventListener("touchmove", function (e) {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (pinchD && Math.abs(d - pinchD) > 28) {
        setCols(state.cols + (d < pinchD ? 1 : -1), true);
        pinchD = d;
      } else if (!pinchD) { pinchD = d; }
    }, { passive: false });
    grid.addEventListener("touchend", function () { pinchD = 0; });

    /* lightbox wiring */
    $("glbClose").addEventListener("click", closeLB);
    $("glbPrev").addEventListener("click", function (e) { e.stopPropagation(); stepLB(-1); });
    $("glbNext").addEventListener("click", function (e) { e.stopPropagation(); stepLB(1); });
    $("glb").addEventListener("click", function (e) { if (e.target.id === "glb") closeLB(); });
    document.addEventListener("keydown", function (e) {
      if (!$("glb").classList.contains("open")) return;
      if (e.key === "Escape") closeLB();
      if (e.key === "ArrowLeft") stepLB(-1);
      if (e.key === "ArrowRight") stepLB(1);
    });
    /* swipe in lightbox */
    var sx = 0;
    $("glb").addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    $("glb").addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) stepLB(dx > 0 ? -1 : 1);
    }, { passive: true });

    /* deep link ?set= */
    var pre = new URLSearchParams(location.search).get("set");
    if (pre && SETS.some(function (s) { return s.slug === pre; })) {
      state.filter = pre;
      filters.querySelectorAll(".gfilter").forEach(function (x) {
        x.classList.toggle("on", x.dataset.slug === pre);
      });
    }

    /* load photos from all sets */
    Promise.all(SETS.map(function (s) {
      return getJSON("content/sets/" + s.slug + ".json")
        .then(function (d) {
          return { slug: s.slug, name: s.name, gallery: d.gallery || [] };
        })
        .catch(function () { return { slug: s.slug, name: s.name, gallery: [] }; });
    })).then(function (res) {
      var seen = {};
      res.forEach(function (r) {
        r.gallery.forEach(function (src) {
          if (seen[src]) return;
          seen[src] = 1;
          state.photos.push({ src: src, set: r.slug, setName: r.name });
        });
      });
      /* seed extra variety until CMS adds more: reuse nothing, keep honest count */
      grid.style.setProperty("--cols", state.cols);
      renderGrid();
    }).catch(function (e) { console.error(e); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
