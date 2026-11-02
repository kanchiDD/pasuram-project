// =============================================================
// js/sthothram.js  — Sthothram page (sthothram.html)
//
//   Data:   cdnaalayiram-api  /api/stotra            (index)
//                             /api/stotra?id=N       (one stotra)
//   Look:   the Thirumadal couplet cards — one card per sloka,
//           its number on the right of the last line.
//   Script: the same "script" setting the tree page's "Read in" banner
//           uses, so a choice made on either page carries to the other.
//           Every request carries script= itself.
//   Links:  sthothram.html#s12 opens stotra 12 directly; the phone's
//           back button returns to the list.
// =============================================================

(function () {

  var API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api/stotra";

  var SCRIPTS = [
    { code: "ta",   label: "தமிழ்" },
    { code: "te",   label: "తెలుగు" },
    { code: "kn",   label: "ಕನ್ನಡ" },
    { code: "ml",   label: "മലയാളം" },
    { code: "deva", label: "देवनागरी" },
    { code: "gu",   label: "ગુજરાતી" },
    { code: "bn",   label: "বাংলা" },
    { code: "iast", label: "Roman" }
  ];
  var VALID = ["te", "ml", "kn", "deva", "iast", "gu", "bn"];

  // "Noto Sans" after each script font so the Tamil subscript digits always render.
  var FONT = {
    ta:   '"Noto Sans Tamil","Noto Sans","Latha",sans-serif',
    deva: '"Noto Sans Devanagari","Noto Sans","Mangal",sans-serif',
    te:   '"Noto Sans Telugu","Noto Sans",sans-serif',
    kn:   '"Noto Sans Kannada","Noto Sans",sans-serif',
    ml:   '"Noto Sans Malayalam","Noto Sans",sans-serif',
    bn:   '"Noto Sans Bengali","Noto Sans",sans-serif',
    gu:   '"Noto Sans Gujarati","Noto Sans",sans-serif',
    iast: '"Noto Sans",sans-serif'
  };
  var GFONT = {
    ta: "Noto+Sans+Tamil", deva: "Noto+Sans+Devanagari", te: "Noto+Sans+Telugu",
    kn: "Noto+Sans+Kannada", ml: "Noto+Sans+Malayalam", bn: "Noto+Sans+Bengali",
    gu: "Noto+Sans+Gujarati", iast: "Noto+Sans"
  };

  var indexCache = {}, stotraCache = {};

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  function getScript() {
    var s = (store("script") || "ta").toLowerCase();
    return VALID.indexOf(s) !== -1 ? s : "ta";
  }
  function setScript(s) {
    try {
      if (s && s !== "ta" && VALID.indexOf(s) !== -1) localStorage.setItem("script", s);
      else localStorage.removeItem("script");
    } catch (e) {}
  }

  function loadFont(sc) {
    [sc, "iast"].forEach(function (k) {
      var id = "gfont-sth-" + k;
      if (!GFONT[k] || document.getElementById(id)) return;
      var lk = document.createElement("link");
      lk.id = id; lk.rel = "stylesheet";
      lk.href = "https://fonts.googleapis.com/css2?family=" + GFONT[k] + ":wght@400;700&display=swap";
      document.head.appendChild(lk);
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function $(id) { return document.getElementById(id); }

  // ── script picker ─────────────────────────────────────────
  function drawScriptRow() {
    var cur = getScript();
    $("sthScripts").innerHTML = '<span class="sth-read">Read in:</span>' + SCRIPTS.map(function (s) {
      return '<button type="button" class="sth-sc' + (s.code === cur ? " on" : "") +
        '" data-sc="' + s.code + '">' + s.label + "</button>";
    }).join("");
  }

  // ── font size ─────────────────────────────────────────────
  function applySize() {
    var px = parseInt(store("sthFont") || "18", 10);
    if (!(px >= 13 && px <= 34)) px = 18;
    document.documentElement.style.setProperty("--sth-font", px + "px");
  }
  function bumpSize(step) {
    var px = parseInt(store("sthFont") || "18", 10) + step;
    px = Math.max(13, Math.min(34, px));
    store("sthFont", String(px)); applySize();
  }

  // ── data ──────────────────────────────────────────────────
  function fetchIndex(sc) {
    if (indexCache[sc]) return Promise.resolve(indexCache[sc]);
    return fetch(API + "?script=" + sc).then(function (r) {
      if (!r.ok) throw new Error("API " + r.status);
      return r.json();
    }).then(function (j) { indexCache[sc] = j.stotras || []; return indexCache[sc]; });
  }
  function fetchStotra(id, sc) {
    var key = sc + "|" + id;
    if (stotraCache[key]) return Promise.resolve(stotraCache[key]);
    return fetch(API + "?id=" + id + "&script=" + sc).then(function (r) {
      if (!r.ok) throw new Error("API " + r.status);
      return r.json();
    }).then(function (j) { stotraCache[key] = j; return j; });
  }

  // ── index view ────────────────────────────────────────────
  var openGroups = {};
  try { openGroups = JSON.parse(store("sthOpen") || "{}") || {}; } catch (e) { openGroups = {}; }

  function itemHtml(s) {
    return '<a class="sth-item" href="#s' + s.stotra_id + '">' +
      '<span class="sth-item-title">' + esc(s.title) + "</span>" +
      '<span class="sth-item-en">' + esc(s.name_en) +
        (s.item_count ? " · " + s.item_count + " slokas" : "") + "</span>" +
    "</a>";
  }

  // A stotra with sub_group_id (e.g. Desika Stotras inside Acharya Srisuktis)
  // goes into a tap-to-open box of its own, below the group's plain items.
  function renderIndex(rows) {
    var groups = [], byId = {};
    rows.forEach(function (r) {
      var g = byId[r.group_id];
      if (!g) {
        g = byId[r.group_id] = { id: r.group_id, name: r.group_name || "", order: r.group_order || 999,
                                 items: [], subs: [], subById: {}, total: 0 };
        groups.push(g);
      }
      g.total++;
      if (r.sub_group_id) {
        var sg = g.subById[r.sub_group_id];
        if (!sg) {
          sg = g.subById[r.sub_group_id] = { id: r.sub_group_id, name: r.sub_group_name || "",
                                             order: r.sub_group_order || 999, items: [] };
          g.subs.push(sg);
        }
        sg.items.push(r);
      } else {
        g.items.push(r);
      }
    });
    groups.sort(function (a, b) { return a.order - b.order; });

    var html = '<p class="sth-intro">' + rows.length + " stotras. Tap a group, then a stotra.</p>";
    groups.forEach(function (g) {
      var open = !!openGroups[g.id];
      g.subs.sort(function (a, b) { return a.order - b.order; });
      html += '<div class="sth-group' + (open ? " open" : "") + '" data-g="' + g.id + '">' +
        '<button type="button" class="sth-group-head" aria-expanded="' + open + '">' +
          '<span>' + esc(g.name) + '</span><span class="sth-group-n">' + g.total + "</span>" +
        "</button>" +
        '<div class="sth-list">' +
          g.items.map(itemHtml).join("") +
          g.subs.map(function (sg) {
            var sopen = !!openGroups["sg" + sg.id];
            return '<div class="sth-subgroup' + (sopen ? " open" : "") + '" data-sg="' + sg.id + '">' +
              '<button type="button" class="sth-subgroup-head" aria-expanded="' + sopen + '">' +
                '<span>' + esc(sg.name) + '</span><span class="sth-group-n">' + sg.items.length + "</span>" +
              "</button>" +
              '<div class="sth-sublist">' + sg.items.map(itemHtml).join("") + "</div>" +
            "</div>";
          }).join("") +
        "</div></div>";
    });
    $("sthBody").innerHTML = html;
  }

  // ── stotra view ───────────────────────────────────────────
  // Lines arrive in reading order. A run of lines sharing a block_no is one
  // box: verse lines become a card (number on the last line), a speaker sits
  // as a small label above its card, headings / part titles / closing stand
  // on their own outside the cards.
  function renderStotra(s) {
    var blocks = [], cur = null;
    (s.lines || []).forEach(function (l) {
      var key = l.part_no + "|" + l.block_no;
      if (!cur || cur.key !== key) { cur = { key: key, lines: [] }; blocks.push(cur); }
      cur.lines.push(l);
    });

    var html = '<div class="sth-nav">' +
        '<a class="sth-back" href="#">← All stotras</a>' +
        '<span class="sth-size"><button type="button" data-size="2" aria-label="Larger text">A+</button>' +
        '<button type="button" data-size="-2" aria-label="Smaller text">A−</button></span>' +
      "</div>" +
      '<div class="content-heading sth-title">' + esc(s.title) + "</div>" +
      '<div class="sth-sub">' + esc(s.name_en) + (s.group_name ? " · " + esc(s.group_name) : "") + "</div>" +
      '<div class="sth-body">';

    blocks.forEach(function (b) {
      var card = [], num = null;
      b.lines.forEach(function (l) {
        var t = esc(l.text);
        if (l.line_type === "part_title") { html += flush(); html += '<div class="sth-part">' + t + "</div>"; return; }
        if (l.line_type === "heading" || l.line_type === "sub_heading" || l.line_type === "item_heading") {
          html += flush(); html += '<div class="sth-heading">' + t + "</div>"; return;
        }
        if (l.line_type === "closing") { html += flush(); html += '<div class="section-close sth-close">' + t + "</div>"; return; }
        if (l.line_type === "speaker" || l.line_type === "attribution") {
          html += flush(); html += '<div class="sth-speaker">' + t + "</div>"; return;
        }
        if (l.line_type === "invocation") { html += flush(); html += '<div class="sth-invoc">' + t + "</div>"; return; }
        if (l.sloka_no != null) num = l.sloka_no;
        card.push({ t: t, prose: l.line_type === "prose" });
      });
      html += flush();

      function flush() {
        if (!card.length) return "";
        var out = '<div class="sp-madal-couplet-card sth-card' + (card[0].prose ? " sth-prose" : "") + '">';
        card.forEach(function (c, i) {
          var last = i === card.length - 1;
          if (last && num != null) {
            out += '<div class="sp-madal-line sp-line-with-no"><span>' + c.t +
                   '</span><span class="sp-couplet-no">' + num + "</span></div>";
          } else {
            out += '<div class="sp-madal-line">' + c.t + "</div>";
          }
        });
        out += "</div>";
        card = []; num = null;
        return out;
      }
    });

    html += "</div>" +
      '<div class="sth-foot"><a class="sth-back" href="#">← All stotras</a></div>';
    $("sthBody").innerHTML = html;
  }

  // ── routing ───────────────────────────────────────────────
  function show() {
    var sc = getScript();
    loadFont(sc);
    $("sthRoot").style.fontFamily = FONT[sc];
    var m = /^#s(\d+)$/.exec(location.hash || "");
    $("sthBody").innerHTML = '<div class="sth-msg">Loading…</div>';

    if (m) {
      fetchStotra(+m[1], sc).then(function (s) {
        if (!s || !s.lines) throw new Error("no data");
        renderStotra(s); window.scrollTo(0, 0);
        document.title = (s.name_en || "Sthothram") + " — Arulicheyal";
      }).catch(function () {
        $("sthBody").innerHTML = '<div class="sth-msg">This stotra could not be loaded. ' +
          '<a class="sth-back" href="#">Back to the list</a></div>';
      });
    } else {
      fetchIndex(sc).then(function (rows) {
        renderIndex(rows);
        document.title = "Sthothram — Arulicheyal";
        var y = parseInt(store("sthScroll") || "0", 10);
        if (y > 0) window.scrollTo(0, y);
      }).catch(function () {
        $("sthBody").innerHTML = '<div class="sth-msg">Unable to load Sthothram. Please try again.</div>';
      });
    }
  }

  // ── events (one listener each, delegated) ────────────────
  function wire() {
    $("sthScripts").addEventListener("click", function (e) {
      var b = e.target.closest("[data-sc]"); if (!b) return;
      if (b.getAttribute("data-sc") === getScript()) return;
      setScript(b.getAttribute("data-sc"));
      drawScriptRow(); show();
    });

    $("sthBody").addEventListener("click", function (e) {
      var shead = e.target.closest(".sth-subgroup-head");
      if (shead) {
        var sg = shead.parentNode, skey = "sg" + sg.getAttribute("data-sg");
        var sopen = !sg.classList.contains("open");
        sg.classList.toggle("open", sopen); shead.setAttribute("aria-expanded", sopen);
        if (sopen) openGroups[skey] = 1; else delete openGroups[skey];
        store("sthOpen", JSON.stringify(openGroups));
        return;
      }
      var head = e.target.closest(".sth-group-head");
      if (head) {
        var g = head.parentNode, id = g.getAttribute("data-g");
        var open = !g.classList.contains("open");
        g.classList.toggle("open", open); head.setAttribute("aria-expanded", open);
        if (open) openGroups[id] = 1; else delete openGroups[id];
        store("sthOpen", JSON.stringify(openGroups));
        return;
      }
      var item = e.target.closest(".sth-item");
      if (item) { store("sthScroll", String(window.scrollY || 0)); return; }
      var sz = e.target.closest("[data-size]");
      if (sz) bumpSize(parseInt(sz.getAttribute("data-size"), 10));
      // "← All stotras" is a plain href="#" link: the hash change below
      // redraws the list, and the phone's back button does the same.
    });

    window.addEventListener("hashchange", show);
  }

  window.loadSthothram = function () {
    applySize();
    drawScriptRow();
    wire();
    show();
  };

})();