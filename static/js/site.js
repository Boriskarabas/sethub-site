/* Set Hub site logic — data-driven from content/sets/*.json */

(function () {
  "use strict";

  var SETS = ["set-hub", "car-set", "roof-top"];
  var state = { data: null, cfg: {}, addons: {}, gallery: [] };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function money(n) {
    return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function md(src) {
    if (!src) return "";
    var inline = function (s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); };
    var html = "", inList = false;
    src.split("\n").forEach(function (raw) {
      var line = raw.trim();
      if (/^###\s+/.test(line)) { if (inList) { html += "</ul>"; inList = false; } html += "<p><strong>" + inline(line.replace(/^###\s+/, "")) + "</strong></p>"; }
      else if (/^##\s+/.test(line)) { if (inList) { html += "</ul>"; inList = false; } html += "<p><strong>" + inline(line.replace(/^##\s+/, "")) + "</strong></p>"; }
      else if (/^-\s+/.test(line)) { if (!inList) { html += "<ul>"; inList = true; } html += "<li>" + inline(line.replace(/^-\s+/, "")) + "</li>"; }
      else if (line === "") { if (inList) { html += "</ul>"; inList = false; } }
      else { if (inList) { html += "</ul>"; inList = false; } html += "<p>" + inline(line) + "</p>"; }
    });
    if (inList) html += "</ul>";
    return html;
  }
  function getJSON(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error(path + ": " + r.status);
      return r.json();
    });
  }

  /* ---------- lightbox ---------- */
  var lb = { i: 0 };
  function openLB(i) {
    lb.i = i;
    $("lbImg").src = state.gallery[i];
    $("lightbox").classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLB() {
    $("lightbox").classList.remove("open");
    document.body.style.overflow = "";
  }
  function stepLB(d) {
    lb.i = (lb.i + d + state.gallery.length) % state.gallery.length;
    $("lbImg").src = state.gallery[lb.i];
  }

  /* ---------- shared: sets dropdown ---------- */
  function buildMenu() {
    var menu = $("setsMenu");
    if (!menu) return;
    Promise.all(SETS.map(function (s) {
      return getJSON("content/sets/" + s + ".json").catch(function () { return null; });
    })).then(function (list) {
      menu.innerHTML = "";
      list.forEach(function (d, i) {
        if (!d) return;
        var a = document.createElement("a");
        a.href = "set.html?set=" + SETS[i];
        a.innerHTML = esc(d.title) + "<small>" + esc(d.tagline || "") + "</small>";
        menu.appendChild(a);
      });
    });
    var drop = $("setsDrop");
    $("setsBtn").addEventListener("click", function (e) {
      e.stopPropagation();
      drop.classList.toggle("open");
    });
    document.addEventListener("click", function () { drop.classList.remove("open"); });
  }

  /* ---------- index page ---------- */
  function initIndex() {
    var pill = $("bookPill");
    if (pill) pill.addEventListener("click", function () {
      location.href = "set.html?set=set-hub";
    });
    var wg = $("watchGallery");
    if (wg) wg.addEventListener("click", function () {
      var imgs = document.querySelectorAll(".mosaic img");
      state.gallery = Array.prototype.map.call(imgs, function (im) { return im.getAttribute("src"); });
      if (state.gallery.length) openLB(0);
    });
  }

  /* ---------- set detail page ---------- */
  function initSetPage() {
    if (!$("setTitle")) return;
    var slug = new URLSearchParams(location.search).get("set") || "set-hub";
    Promise.all([
      getJSON("content/sets/" + slug + ".json"),
      getJSON("content/config.json").catch(function () { return {}; })
    ]).then(function (res) {
      state.data = res[0]; state.cfg = res[1] || {};
      renderSet(slug);
    }).catch(function (e) { console.error(e); });
  }

  function renderSet(slug) {
    var d = state.data;
    document.title = d.title + " — Set Hub";
    $("setTitle").textContent = d.title;

    // gallery: hero + thumbs (drive photos when curated, figma seeds otherwise)
    var gal = (d.gallery && d.gallery.length) ? d.gallery.slice() :
      ["static/img/figma/class-hero.jpg", "static/img/figma/class-thumb-1.jpg",
       "static/img/figma/class-thumb-2.jpg", "static/img/figma/class-thumb-3.jpg",
       "static/img/figma/class-thumb-4.jpg"];
    state.gallery = gal;
    $("heroImg").src = gal[0];
    $("heroImg").alt = d.title;
    $("playBtn").style.display = d.video_url ? "flex" : "flex";
    $("playBtn").addEventListener("click", function () {
      if (d.video_url) window.open(d.video_url, "_blank");
      else openLB(0);
    });

    var th = $("thumbs"); th.innerHTML = "";
    gal.slice(0, 6).forEach(function (src, i) {
      var b = document.createElement("button");
      b.innerHTML = '<img src="' + src + '" alt="thumbnail ' + (i + 1) + '" loading="lazy">';
      if (i === 0) b.classList.add("active");
      b.addEventListener("click", function () {
        th.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        $("heroImg").src = src;
        state._heroIdx = i;
      });
      b.addEventListener("dblclick", function () { openLB(i); });
      th.appendChild(b);
    });
    var va = document.createElement("button");
    va.className = "viewall";
    va.innerHTML = "<span style='font-size:22px'>⊞</span>View all";
    va.addEventListener("click", function () { openLB(0); });
    th.appendChild(va);

    // offer
    $("offerProse").innerHTML = md(d.description);

    // accordions
    var acc = $("accordions"); acc.innerHTML = "";
    (d.accordions || []).forEach(function (a) {
      var div = document.createElement("div");
      div.className = "acc";
      div.innerHTML = "<button><span>" + esc(a.title).toUpperCase() +
        '</span><img src="static/img/figma/arrow-caret-down.svg" alt=""></button>' +
        '<div class="acc-body"><div>' + md(a.body) + "</div></div>";
      var btn = div.querySelector("button"), body = div.querySelector(".acc-body");
      btn.addEventListener("click", function () {
        var open = div.classList.toggle("open");
        body.style.maxHeight = open ? body.scrollHeight + "px" : "0";
      });
      acc.appendChild(div);
    });

    // add-ons carousel
    var row = $("addonsRow"); row.innerHTML = "";
    (d.addons || []).forEach(function (a, i) {
      var c = document.createElement("div");
      c.className = "addon-card";
      c.innerHTML = '<div class="im"><img src="' + a.image + '" alt="' + esc(a.name) + '" loading="lazy"></div>' +
        '<div class="tx"><h4>' + esc(a.name) + "</h4>" +
        '<div class="pr">' + money(a.price) + " " + esc(a.price_note || "flat fee") + "</div></div>";
      row.appendChild(c);
    });
    $("adPrev").addEventListener("click", function () { row.scrollBy({ left: -300 }); });
    $("adNext").addEventListener("click", function () { row.scrollBy({ left: 300 }); });

    // footer info
    $("ftSqft").textContent = d.sqft ? Number(d.sqft).toLocaleString("en-US") + " sq ft" : (d.sqft_note || "");

    renderBooking(d);
  }

  /* ---------- booking calculator ---------- */
  function fmtHour(h) {
    var ap = h < 12 ? "am" : "pm", hh = h % 12; if (hh === 0) hh = 12;
    return hh + ":00 " + ap;
  }
  function renderBooking(d) {
    // time selects
    var from = $("bkFrom"), to = $("bkTo");
    for (var h = 0; h < 24; h++) {
      var o1 = document.createElement("option"); o1.value = h; o1.textContent = fmtHour(h);
      var o2 = document.createElement("option"); o2.value = h; o2.textContent = fmtHour(h);
      if (h === 8) o1.selected = true;
      if (h === 12) o2.selected = true;
      from.appendChild(o1); to.appendChild(o2);
    }
    // attendees
    var g = $("bkGuests"); g.innerHTML = "";
    (d.attendee_tiers || [{ label: "1-30 people", multiplier: 1 }]).forEach(function (t, i) {
      var o = document.createElement("option");
      o.value = i; o.textContent = t.label + (t.multiplier > 1 ? "  +" + Math.round((t.multiplier - 1) * 100) + "%" : "");
      g.appendChild(o);
    });
    // date default: tomorrow
    var dt = new Date(Date.now() + 864e5);
    $("bkDate").value = dt.toISOString().slice(0, 10);
    // discount bar
    if (d.discount_note) {
      var parts = d.discount_note.split("—");
      $("discBar").innerHTML = "<span>" + esc(d.discount_note) + "</span><span></span>";
    }
    // add-on cards with ADD TO BOOKING
    var wrap = $("bkAddons"); wrap.innerHTML = "";
    (d.addons || []).forEach(function (a, i) {
      var card = document.createElement("div");
      card.className = "bk-addon";
      card.innerHTML = '<div class="im"><img src="' + a.image + '" alt="' + esc(a.name) + '" loading="lazy"></div>' +
        '<div class="tx"><h4>' + esc(a.name) + "</h4>" +
        '<div class="pr">' + money(a.price) + " " + esc(a.price_note || "flat fee") + "</div>" +
        '<div class="row"><button class="add-btn">ADD TO BOOKING →</button>' +
        '<button class="link-btn">DETAILS</button></div></div>';
      var btn = card.querySelector(".add-btn");
      btn.addEventListener("click", function () {
        if (state.addons[i]) { delete state.addons[i]; btn.classList.remove("added"); btn.textContent = "ADD TO BOOKING →"; }
        else { state.addons[i] = a; btn.classList.add("added"); btn.textContent = "✓ ADDED"; }
        renderSelAddons(); calc();
      });
      wrap.appendChild(card);
    });

    ["bkFrom", "bkTo", "bkGuests", "bkExtraDay", "bkDate"].forEach(function (id) {
      $(id).addEventListener("change", calc);
    });
    $("bookNow").addEventListener("click", submitBooking);
    calc();
  }

  function hours() {
    var d = state.data;
    var f = +$("bkFrom").value, t = +$("bkTo").value;
    var h = t - f; if (h <= 0) h += 24;
    if ($("bkExtraDay").checked) h += 24;
    return Math.max(h, d.min_hours || 1);
  }
  function calc() {
    var d = state.data;
    var h = hours();
    var rate = d.price_min || 0;
    var tiers = d.attendee_tiers || [{ multiplier: 1 }];
    var mult = tiers[+$("bkGuests").value].multiplier || 1;
    var base = rate * h * mult;
    var addonTotal = Object.keys(state.addons).reduce(function (s, k) { return s + (+state.addons[k].price || 0); }, 0);
    var sub = base + addonTotal;
    var disc = (d.discount_hours && h >= d.discount_hours) ? sub * (d.discount_pct || 0) / 100 : 0;
    var total = sub - disc;

    var lines = [];
    lines.push(["" + money(rate) + " × " + h + " hour" + (h > 1 ? "s" : ""), money(rate * h)]);
    if (mult > 1) lines.push(["Attendees (" + tiers[+$("bkGuests").value].label + ")", money(base - rate * h)]);
    Object.keys(state.addons).forEach(function (k) {
      lines.push([esc(state.addons[k].name), money(state.addons[k].price)]);
    });
    if (disc > 0) lines.push(["Discount (" + d.discount_pct + "%)", "−" + money(disc)]);
    $("priceLines").innerHTML = lines.map(function (l) {
      return '<div class="pl"><span>' + l[0] + "</span><b>" + l[1] + "</b></div>";
    }).join("");
    $("bkTotal").textContent = money(total);
    state._total = total; state._hours = h;
    return total;
  }
  function renderSelAddons() {
    var box = $("selAddons");
    var keys = Object.keys(state.addons);
    if (!keys.length) { box.innerHTML = '<p style="color:var(--muted);font-size:13px">No add-ons selected yet.</p>'; return; }
    box.innerHTML = "";
    keys.forEach(function (k) {
      var a = state.addons[k];
      var div = document.createElement("div");
      div.className = "sel-addon";
      div.innerHTML = '<img src="' + a.image + '" alt=""><span>' + esc(a.name) + "<br><b>" + money(a.price) + "</b></span>" +
        '<button class="rm" aria-label="Remove">×</button>';
      div.querySelector(".rm").addEventListener("click", function () {
        delete state.addons[k]; renderSelAddons(); calc();
        var btns = document.querySelectorAll("#bkAddons .add-btn");
        if (btns[k]) { btns[k].classList.remove("added"); btns[k].textContent = "ADD TO BOOKING →"; }
      });
      box.appendChild(div);
    });
  }
  function submitBooking() {
    var d = state.data;
    var name = $("bkName").value.trim(), contact = $("bkContact").value.trim();
    if (!name || !contact) { alert("Please add your name and contact so we can confirm."); return; }
    var total = calc();
    var addonLines = Object.keys(state.addons).map(function (k) {
      return "  - " + state.addons[k].name + " (" + money(state.addons[k].price) + ")";
    });
    var tiers = d.attendee_tiers || [{ label: "1-30 people" }];
    var lines = [
      "New booking request — " + d.title, "",
      "Date: " + $("bkDate").value,
      "Time: " + fmtHour(+$("bkFrom").value) + " → " + fmtHour(+$("bkTo").value) + ($("bkExtraDay").checked ? " (+1 day)" : ""),
      "Hours: " + state._hours,
      "Attendees: " + tiers[+$("bkGuests").value].label,
      "Add-ons:", addonLines.length ? addonLines.join("\n") : "  none",
      "", "Estimated total: " + money(total), "",
      "Name: " + name, "Contact: " + contact
    ];
    var to = (state.cfg && state.cfg.booking_email) || "bookings@example.com";
    location.href = "mailto:" + encodeURIComponent(to) +
      "?subject=" + encodeURIComponent("Booking request — " + d.title + " — " + $("bkDate").value) +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    buildMenu();
    initIndex();
    initSetPage();
    var lbx = $("lightbox");
    if (lbx) {
      $("lbClose").addEventListener("click", closeLB);
      $("lbPrev").addEventListener("click", function (e) { e.stopPropagation(); stepLB(-1); });
      $("lbNext").addEventListener("click", function (e) { e.stopPropagation(); stepLB(1); });
      lbx.addEventListener("click", function (e) { if (e.target === lbx) closeLB(); });
      document.addEventListener("keydown", function (e) {
        if (!lbx.classList.contains("open")) return;
        if (e.key === "Escape") closeLB();
        if (e.key === "ArrowLeft") stepLB(-1);
        if (e.key === "ArrowRight") stepLB(1);
      });
    }
  });
})();
