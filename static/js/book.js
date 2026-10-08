/* Set Hub booking page — 3 set blocks with Peerspace-style calculator */

(function () {
  "use strict";

  var ORDER = ["set-hub", "roof-top", "car-set"];
  var pricing = null, galleries = {};
  var openSlug = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function money(n) {
    return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function getJSON(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error(path + ": " + r.status);
      return r.json();
    });
  }
  function fmtHour(h) {
    var ap = h < 12 ? "am" : "pm", hh = h % 12; if (hh === 0) hh = 12;
    return hh + ":00 " + ap;
  }

  function calcState(slug, root) {
    var p = pricing.sets[slug];
    var date = root.querySelector(".bk-date").value;
    var f = +root.querySelector(".bk-from").value;
    var t = +root.querySelector(".bk-to").value;
    var h = t - f; if (h <= 0) h += 24;
    h = Math.max(h, p.min_hours || 2);
    var tier = p.attendee_tiers[+root.querySelector(".bk-guests").value] || p.attendee_tiers[0];
    var rate = p.base_rate + (tier.per_hour || 0);
    var rental = rate * h;
    var addonHourly = 0, addonFlat = 0, addonNames = [];
    root.querySelectorAll(".addon-chip.on").forEach(function (chip) {
      var a = p.addons[+chip.dataset.i];
      addonNames.push(a.name + " (" + money(a.price) + (a.per === "hour" ? "/hr" : "") + ")");
      if (a.per === "hour") addonHourly += a.price * h; else addonFlat += a.price;
    });
    var sub = rental + addonHourly;
    var disc = (p.discount_hours && h >= p.discount_hours) ? sub * (p.discount_pct || 0) / 100 : 0;
    var cleaning = p.cleaning_fee || 0;
    var svcBase = sub - disc + addonFlat + cleaning;
    var service = svcBase * (pricing.service_fee_pct || 0) / 100;
    var tax = (svcBase + service) * (pricing.tax_pct || 0) / 100;
    var total = svcBase + service + tax;
    return {
      p: p, date: date, from: f, to: t, hours: h, tier: tier, rate: rate,
      rental: rental, addonHourly: addonHourly, addonFlat: addonFlat,
      addonNames: addonNames, disc: disc, cleaning: cleaning,
      service: service, tax: tax, total: total
    };
  }

  function renderBreakdown(slug, root) {
    var s = calcState(slug, root);
    var box = root.querySelector(".price-lines");
    var lines = [];
    lines.push([money(s.rate) + " × " + s.hours + " hour" + (s.hours > 1 ? "s" : "") +
      (s.tier.per_hour ? " (" + esc(s.tier.label) + ")" : ""), money(s.rental)]);
    if (s.addonHourly) lines.push(["Add-ons (hourly)", money(s.addonHourly)]);
    if (s.addonFlat) lines.push(["Add-ons (flat)", money(s.addonFlat)]);
    if (s.cleaning) lines.push(["Cleaning fee", money(s.cleaning)]);
    if (s.disc > 0) lines.push(["8+ hour discount (" + s.p.discount_pct + "%)", "−" + money(s.disc)]);
    lines.push(["Service fee (" + pricing.service_fee_pct + "%)", money(s.service)]);
    lines.push(["Tax (" + pricing.tax_pct + "%)", money(s.tax)]);
    box.innerHTML = lines.map(function (l) {
      return '<div class="pl"><span>' + l[0] + "</span><b>" + l[1] + "</b></div>";
    }).join("");
    root.querySelector(".bk-total").textContent = money(s.total);
    return s;
  }

  function buildCalculator(slug, drop) {
    var p = pricing.sets[slug];
    var dt = new Date(Date.now() + 864e5);
    var defDate = dt.toISOString().slice(0, 10);

    var h = '<div class="calc">';
    h += '<div class="disc"><span>8+ hour discount</span><span>' + p.discount_pct + '% off</span></div>';
    h += '<label>Date and time <span class="req">(required)</span></label>';
    h += '<input type="date" class="bk-date" value="' + defDate + '" />';
    h += '<div class="row2"><select class="bk-from"></select><select class="bk-to"></select></div>';
    h += '<label>Attendees</label><select class="bk-guests"></select>';
    h += '<label>Add-ons <span class="hint">— tap to add</span></label>';
    h += '<div class="addon-grid"></div>';
    h += '<div class="price-lines"></div>';
    h += '<div class="total"><span>TOTAL</span><span class="sum bk-total">$0.00</span></div>';
    h += '<div class="book-cta"><button class="book-now">BOOK NOW <span aria-hidden="true">→</span></button>';
    h += '<p class="fine">You won\'t be charged yet.</p></div>';
    h += '<div class="pay-step" hidden>';
    h += '<label>Your name</label><input type="text" class="bk-name" autocomplete="name" placeholder="Name" />';
    h += '<label>Phone or email</label><input type="text" class="bk-contact" autocomplete="email" placeholder="How do we reach you?" />';
    h += '<label class="rules"><input type="checkbox" class="bk-rules" /> I agree to respect and follow the venue rules.</label>';
    h += '<button class="pay-btn">PAY ' + '<span class="bk-total2"></span>' + ' →</button>';
    h += '<p class="fine">Secure checkout — card, Apple Pay, Google Pay, PayPal.</p>';
    h += '</div></div>';

    drop.innerHTML = h;

    var from = drop.querySelector(".bk-from"), to = drop.querySelector(".bk-to");
    for (var i = 0; i < 24; i++) {
      var o1 = document.createElement("option"); o1.value = i; o1.textContent = fmtHour(i);
      var o2 = document.createElement("option"); o2.value = i; o2.textContent = fmtHour(i);
      if (i === 8) o1.selected = true;
      if (i === 12) o2.selected = true;
      from.appendChild(o1); to.appendChild(o2);
    }
    var g = drop.querySelector(".bk-guests");
    p.attendee_tiers.forEach(function (t, ti) {
      var o = document.createElement("option");
      o.value = ti;
      o.textContent = t.label + (t.per_hour ? "  (+" + money(t.per_hour) + "/hr)" : "");
      g.appendChild(o);
    });
    var grid = drop.querySelector(".addon-grid");
    p.addons.forEach(function (a, ai) {
      var c = document.createElement("button");
      c.type = "button";
      c.className = "addon-chip";
      c.dataset.i = ai;
      c.innerHTML = '<b>' + esc(a.name) + '</b><span>' + esc(a.desc || "") + '</span>' +
        '<em>' + money(a.price) + (a.per === "hour" ? "/hr" : "") + "</em>";
      c.addEventListener("click", function () {
        c.classList.toggle("on");
        refresh();
      });
      grid.appendChild(c);
    });

    function refresh() {
      var s = renderBreakdown(slug, drop);
      var t2 = drop.querySelector(".bk-total2");
      if (t2) t2.textContent = money(s.total);
    }
    ["bk-date", "bk-from", "bk-to", "bk-guests"].forEach(function (cls) {
      drop.querySelector("." + cls).addEventListener("change", refresh);
    });

    drop.querySelector(".book-now").addEventListener("click", function () {
      var s = renderBreakdown(slug, drop);
      if (!s.date) { alert("Please pick a date first."); return; }
      var step = drop.querySelector(".pay-step");
      step.hidden = !step.hidden;
      drop.querySelector(".bk-total2").textContent = money(s.total);
      if (!step.hidden) step.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    drop.querySelector(".pay-btn").addEventListener("click", function () {
      var s = renderBreakdown(slug, drop);
      var name = drop.querySelector(".bk-name").value.trim();
      var contact = drop.querySelector(".bk-contact").value.trim();
      if (!name || !contact) { alert("Please add your name and contact so we can confirm."); return; }
      if (!drop.querySelector(".bk-rules").checked) { alert("Please agree to the venue rules first."); return; }
      startCheckout(slug, s, name, contact, drop);
    });

    refresh();
  }

  function startCheckout(slug, s, name, contact, drop) {
    var btn = drop.querySelector(".pay-btn");
    btn.disabled = true;
    btn.textContent = "Creating secure checkout…";
    var payload = {
      set: slug,
      set_name: s.p.name,
      date: s.date,
      start_hour: s.from,
      end_hour: s.to,
      hours: s.hours,
      attendees: s.tier.label,
      addons: s.addonNames,
      lines: {
        rental: +s.rental.toFixed(2),
        addon_hourly: +s.addonHourly.toFixed(2),
        addon_flat: +s.addonFlat.toFixed(2),
        discount: +s.disc.toFixed(2),
        cleaning: +s.cleaning.toFixed(2),
        service_fee: +s.service.toFixed(2),
        tax: +s.tax.toFixed(2),
        total: +s.total.toFixed(2)
      },
      customer: { name: name, contact: contact }
    };
    fetch("https://sethub-pay.retterium.workers.dev/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.url) { location.href = d.url; return; }
        throw new Error((d && d.error) || "checkout failed");
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = "PAY →";
        alert("Online payments are being connected right now — please use the BOOKING form on the set page and we'll confirm by email.");
      });
  }

  function renderBlocks() {
    var wrap = $("setBlocks");
    wrap.innerHTML = "";
    ORDER.forEach(function (slug) {
      var p = pricing.sets[slug];
      var gal = galleries[slug] || [];
      var block = document.createElement("div");
      block.className = "set-block";
      block.dataset.slug = slug;
      var collage = gal.slice(0, 3).map(function (src) {
        return '<figure><img src="' + src + '" alt="' + esc(p.name) + '" loading="lazy"></figure>';
      }).join("");
      block.innerHTML =
        '<div class="set-collage">' + collage + "</div>" +
        '<div class="set-info"><h2>' + esc(p.name) + "</h2>" +
        '<p class="specs">' + esc(p.specs) + "</p>" +
        '<ul class="includes">' + p.includes.map(function (x) {
          return "<li>" + esc(x) + "</li>";
        }).join("") + "</ul>" +
        '<button class="select-btn" type="button">SELECT THIS SET <span aria-hidden="true">↓</span></button></div>' +
        '<div class="book-drop" hidden></div>';
      block.querySelector(".select-btn").addEventListener("click", function (e) {
        e.stopPropagation();
        toggleBlock(slug, block);
      });
      block.querySelector(".set-collage").addEventListener("click", function () {
        toggleBlock(slug, block);
      });
      wrap.appendChild(block);
    });
  }

  function toggleBlock(slug, block) {
    var drop = block.querySelector(".book-drop");
    var willOpen = drop.hidden;
    document.querySelectorAll(".set-block").forEach(function (b) {
      b.classList.remove("open");
      b.querySelector(".book-drop").hidden = true;
    });
    if (willOpen) {
      block.classList.add("open");
      drop.hidden = false;
      if (!drop.dataset.built) {
        buildCalculator(slug, drop);
        drop.dataset.built = "1";
      }
      openSlug = slug;
      setTimeout(function () {
        drop.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    } else {
      openSlug = null;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!$("setBlocks")) return;
    var loads = [getJSON("content/pricing.json")].concat(ORDER.map(function (s) {
      return getJSON("content/sets/" + s + ".json").catch(function () { return null; });
    }));
    Promise.all(loads).then(function (res) {
      pricing = res[0];
      ORDER.forEach(function (s, i) {
        var d = res[i + 1];
        galleries[s] = (d && d.gallery && d.gallery.length) ? d.gallery : [];
      });
      renderBlocks();
      // deep link: book.html?set=roof-top
      var pre = new URLSearchParams(location.search).get("set");
      if (pre && pricing.sets[pre]) {
        var blk = document.querySelector('.set-block[data-slug="' + pre + '"]');
        if (blk) toggleBlock(pre, blk);
      }
    }).catch(function (e) { console.error(e); });
  });
})();
