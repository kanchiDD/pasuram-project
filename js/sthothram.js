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
  // one sarga / dasakam of a long work
  function fetchPart(id, part, sc) {
    var key = sc + "|" + id + "|" + part;
    if (stotraCache[key]) return Promise.resolve(stotraCache[key]);
    return fetch(API + "?id=" + id + "&part=" + part + "&script=" + sc).then(function (r) {
      if (!r.ok) throw new Error("API " + r.status);
      return r.json();
    }).then(function (j) { stotraCache[key] = j; return j; });
  }
  // what the parts of a long work are called
  function partWord(s) { return /Kandam/i.test(s.name_en || "") ? "sargas" : "dasakams"; }
  // Kaisika Puranam: its two parts are not chapters but the Tenkalai and Vadakalai
  // recitals (part 1 / part 2), shown as two tabs; the reader's sect opens first.
  function isSectTabs(s) { return !!s.by_part && /Kaisika/i.test(s.name_en || ""); }
  function sectPart() { return store("sect") === "V" ? 2 : 1; }

  // Commentary pages (Kaisika Puranam Vyakhyanam): sloka, commentary and the plain
  // Tamil explanation each get their own look. They are stored as line_type 'prose'
  // with a negative sloka_no naming the style (the table allows only fixed line types).
  var PROSE = { "-1": "vyakhyanam", "-2": "eased", "-3": "note", "-4": "avatarika", "-5": "quote" };
  var PROSE_LABEL = { vyakhyanam: "வ்யாக்யானம்", eased: "எளிய நடை — பாராயணத்தில் சேர்க்க வேண்டாம்" };
  function addKaiCss() {
    if (document.getElementById("sth-kai-css")) return;
    var lk = document.createElement("link");
    lk.rel = "stylesheet";
    lk.href = "https://fonts.googleapis.com/css2?family=Noto+Serif+Tamil:wght@400;600&display=swap";
    document.head.appendChild(lk);
    var st = document.createElement("style");
    st.id = "sth-kai-css";
    st.textContent =
      ".sth-tabs{display:flex;gap:8px;margin:10px 0 4px}" +
      ".sth-tab{flex:1;text-align:center;padding:9px 6px;border:1.5px solid #b8860b;border-radius:10px;" +
        "text-decoration:none;color:#7a1f1f;font-weight:600;background:#fffaf0}" +
      ".sth-tab.on{background:#7a1f1f;border-color:#7a1f1f;color:#fff}" +
      ".sth-note,.sth-avatarika{font-size:calc(var(--sth-font,18px)*.9);line-height:1.9;margin:.55em 0;color:#2b2b2b}" +
      ".sth-quote{font-size:calc(var(--sth-font,18px)*.92);line-height:1.8;margin:.15em 0 .15em .9em;padding-left:.7em;" +
        "border-left:3px solid #d4b45a;color:#6b3a00}" +
      ".sth-vyakhyanam{font-family:'Noto Serif Tamil','Noto Sans Tamil',serif;font-size:calc(var(--sth-font,18px)*.92);" +
        "line-height:1.95;color:#1d3567;background:#f3f6fc;border-left:4px solid #3c5fa3;border-radius:8px;" +
        "padding:.7em .9em;margin:.6em 0}" +
      ".sth-eased{font-size:calc(var(--sth-font,18px)*.85);line-height:1.85;color:#4d4434;background:#f8f4e8;" +
        "border-left:4px dashed #b39654;border-radius:8px;padding:.65em .9em;margin:.4em 0 1.3em}" +
      ".sth-plabel{display:block;font-family:'Noto Sans Tamil',sans-serif;font-size:.78em;font-weight:700;" +
        "letter-spacing:.02em;margin-bottom:.3em}" +
      ".sth-vyakhyanam .sth-plabel{color:#3c5fa3}.sth-eased .sth-plabel{color:#8a6d2b}";
    document.head.appendChild(st);
  }

  // ── index view ────────────────────────────────────────────
  var openGroups = {};
  try { openGroups = JSON.parse(store("sthOpen") || "{}") || {}; } catch (e) { openGroups = {}; }

  function itemHtml(s) {
    return '<a class="sth-item" href="#s' + s.stotra_id + '">' +
      '<span class="sth-item-title">' + esc(s.title) + "</span>" +
      '<span class="sth-item-en">' + esc(s.name_en) +
        (s.by_part && !isSectTabs(s) ? " · " + s.part_count + " " + partWord(s)
                   : (s.item_count ? " · " + s.item_count + " slokas" : "")) + "</span>" +
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
  //   nav (only for one part of a long work): { listHref, listLabel, prevHref, nextHref, pos }
  function renderStotra(s, nav) {
    var backHref = nav ? nav.listHref : "#";
    var backLabel = nav ? nav.listLabel : "← All stotras";
    var pager = !nav ? "" : nav.tabs ? nav.tabs : '<div class="sth-pager">' +
      (nav.prevHref ? '<a class="sth-back" href="' + nav.prevHref + '">◀ Previous</a>' : '<span></span>') +
      '<span class="sth-pos">' + esc(nav.pos) + "</span>" +
      (nav.nextHref ? '<a class="sth-back" href="' + nav.nextHref + '">Next ▶</a>' : '<span></span>') +
      "</div>";
    var blocks = [], cur = null;
    (s.lines || []).forEach(function (l) {
      var key = l.part_no + "|" + l.block_no;
      if (!cur || cur.key !== key) { cur = { key: key, lines: [] }; blocks.push(cur); }
      cur.lines.push(l);
    });

    var html = '<div class="sth-nav">' +
        '<a class="sth-back" href="' + backHref + '">' + esc(backLabel) + "</a>" +
        '<span class="sth-size"><button type="button" data-size="2" aria-label="Larger text">A+</button>' +
        '<button type="button" data-size="-2" aria-label="Smaller text">A−</button></span>' +
      "</div>" +
      '<div class="content-heading sth-title">' + esc(s.title) + "</div>" +
      '<div class="sth-sub">' + esc(s.name_en) + (s.group_name ? " · " + esc(s.group_name) : "") + "</div>" +
      pager +
      '<div class="sth-body">';

    blocks.forEach(function (b) {
      var card = [], num = null, lastProse = null;
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
        var pk = l.line_type === "prose" && l.sloka_no < 0 ? PROSE[String(l.sloka_no)] : null;
        if (pk) {
          html += flush(); addKaiCss();
          var lab = PROSE_LABEL[pk] && pk !== lastProse
            ? '<span class="sth-plabel">' + PROSE_LABEL[pk] + "</span>" : "";
          html += '<div class="sth-' + pk + '">' + lab + t + "</div>";
          lastProse = pk; return;
        }
        lastProse = null;
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

    html += "</div>" + pager +
      '<div class="sth-foot"><a class="sth-back" href="' + backHref + '">' + esc(backLabel) + "</a></div>";
    $("sthBody").innerHTML = html;
  }

  // ── list of parts: a kanda's sargas, Narayaneeyam's dasakams ──
  function renderParts(s) {
    var back = '<a class="sth-back" href="#">← All stotras</a>';
    var html = '<div class="sth-nav">' + back + "</div>" +
      '<div class="content-heading sth-title">' + esc(s.title) + "</div>" +
      '<div class="sth-sub">' + esc(s.name_en) + " · " + (s.parts || []).length + " " + partWord(s) + "</div>" +
      '<div class="sth-partlist">';
    (s.parts || []).forEach(function (p) {
      if (p.section) html += '<div class="sth-section">' + esc(p.section) + "</div>";
      html += '<a class="sth-partitem" href="#s' + s.stotra_id + "p" + p.part_no + '">' +
        '<span class="sth-partno">' + p.part_no + "</span>" +
        '<span class="sth-parttitle">' + esc(p.title) + "</span></a>";
    });
    html += "</div>" + '<div class="sth-foot">' + back + "</div>";
    $("sthBody").innerHTML = html;
  }

  // ── routing ───────────────────────────────────────────────
  function show() {
    var sc = getScript();
    loadFont(sc);
    $("sthRoot").style.fontFamily = FONT[sc];
    var m = /^#s(\d+)(?:p(\d+))?$/.exec(location.hash || "");
    $("sthBody").innerHTML = '<div class="sth-msg">Loading…</div>';

    if (m && m[2]) {
      // one sarga / dasakam
      var id = +m[1], part = +m[2];
      fetchPart(id, part, sc).then(function (s) {
        if (!s || !s.lines) throw new Error("no data");
        if (isSectTabs(s)) {                       // Tenkalai / Vadakalai tabs instead of a pager
          return fetchStotra(id, sc).then(function (all) {
            addKaiCss();
            var tabs = '<div class="sth-tabs">' + (all.parts || []).map(function (p) {
              return '<a class="sth-tab' + (p.part_no === part ? " on" : "") + '" href="#s' + id + "p" + p.part_no + '">' +
                esc(p.title) + "</a>";
            }).join("") + "</div>";
            renderStotra(s, { listHref: "#", listLabel: "← All stotras", tabs: tabs });
            window.scrollTo(0, 0);
            document.title = (s.name_en || "Sthothram") + " — Arulicheyal";
          });
        }
        var total = s.part_count || 1;
        renderStotra(s, {
          listHref: "#s" + id, listLabel: "← All " + partWord(s),
          prevHref: part > 1 ? "#s" + id + "p" + (part - 1) : "",
          nextHref: part < total ? "#s" + id + "p" + (part + 1) : "",
          pos: part + " / " + total
        });
        window.scrollTo(0, 0);
        document.title = (s.name_en || "Sthothram") + " " + part + " — Arulicheyal";
      }).catch(function () {
        $("sthBody").innerHTML = '<div class="sth-msg">This part could not be loaded. ' +
          '<a class="sth-back" href="#s' + id + '">Back to the list</a></div>';
      });
    } else if (m) {
      fetchStotra(+m[1], sc).then(function (s) {
        if (s && s.parts && isSectTabs(s)) {      // open the reader's own sect tab
          location.replace("#s" + s.stotra_id + "p" + sectPart());
          return;
        }
        if (s && s.parts) {                       // a long work: show its list of parts
          renderParts(s);
          document.title = (s.name_en || "Sthothram") + " — Arulicheyal";
          var py = parseInt(store("sthPartScroll" + s.stotra_id) || "0", 10);
          window.scrollTo(0, py > 0 ? py : 0);
          return;
        }
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
      var tab = e.target.closest(".sth-tab");
      if (tab) {                                    // switching sect tabs: no extra back-button step
        e.preventDefault();
        if (!tab.classList.contains("on")) location.replace(tab.getAttribute("href"));
        return;
      }
      var pitem = e.target.closest(".sth-partitem");
      if (pitem) {                                  // remember the place in the sarga list
        var pm = /^#s(\d+)p/.exec(pitem.getAttribute("href") || "");
        if (pm) store("sthPartScroll" + pm[1], String(window.scrollY || 0));
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