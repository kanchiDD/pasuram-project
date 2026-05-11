// munnadiIndex.js
// Worker output shape:
//   pathu sections:      groups[{type:'pathu',      id:pathu_id,      label, children:[{id:pathu_id, label}]}]
//   thirumozhi sections: groups[{type:'thirumozhi', id:thirumozhi_id, label, sub}]
//   simple sections:     groups[] empty
//
// Content anchors:
//   pathu group    → id="mp-grp-{pathu_id}"
//   thirumozhi grp → id="mp-grp-{thirumozhi_id}"
//
// Navigation:
//   section click           → expand L1 accordion
//   thirumozhi L1 click     → scroll to mp-grp-{grp.id}
//   pathu L1 click (hasL2)  → expand L2 accordion
//   pathu L1 click (no L2)  → scroll to mp-grp-{grp.id}
//   pathu child L2 click    → scroll to mp-grp-{child.id}

export function buildMunnadiIndex(data) {
  const { index } = data;

  let html = `<div class="mp-index">`;
  html += `<div class="mp-index-title">Index</div>`;

  index.forEach(sec => {
    const hasGroups = sec.groups && sec.groups.length > 0;
    const skey = `mp-idx-sec-${sec.section_id}`;

    // ── Level 0: section ──
    html += `
      <div class="mp-idx-item ${hasGroups ? 'mp-idx-group' : ''}"
           onclick="window._mpSecClick(${sec.section_id}, ${hasGroups})">
        ${sec.section_name}
        ${hasGroups ? `<span class="mp-idx-arrow" id="mp-arr-${sec.section_id}">▶</span>` : ''}
      </div>`;

    if (!hasGroups) return;
    html += `<div class="mp-idx-children" id="${skey}">`;

    sec.groups.forEach(grp => {
      // pathu groups have children[] from Worker; thirumozhi groups do not
      const isPathu = grp.type === 'pathu';
      const children = isPathu && Array.isArray(grp.children) && grp.children.length > 0
        ? grp.children : null;
      const hasL2 = children !== null;
      const pkey  = `mp-idx-pathu-${grp.id}`;

      // ── Level 1 ──
      // Use data-type attribute to avoid quote escaping issues in onclick
      html += `
        <div class="mp-idx-child"
             data-grpid="${grp.id}"
             data-grptype="${grp.type}"
             data-hasl2="${hasL2}"
             data-secid="${sec.section_id}"
             onclick="window._mpL1Click(this)">
          <span class="mp-idx-child-label">
            ${grp.label}${grp.sub ? `<span class="mp-idx-child-sub"> — ${grp.sub}</span>` : ''}
          </span>
          ${hasL2 ? `<span class="mp-idx-child-arrow" id="mp-parr-${grp.id}">▶</span>` : ''}
        </div>`;

      if (!hasL2) return;

      // ── Level 2: pathu children → each child.id = pathu_id in content ──
      html += `<div class="mp-idx-grandchildren" id="${pkey}">`;
      children.forEach(ch => {
        html += `
          <div class="mp-idx-grandchild"
               data-pattid="${ch.id}"
               onclick="event.stopPropagation();window._mpL2Click(this)">
            ${ch.label}
          </div>`;
      });
      html += `</div>`;
    });

    html += `</div>`;
  });

  html += `</div>`;
  return html;
}

export function registerMunnadiIndexHandlers() {

  function closeAllSections() {
    document.querySelectorAll('.mp-idx-children.open').forEach(el => {
      el.classList.remove('open');
      const sid = el.id.replace('mp-idx-sec-', '');
      const a = document.getElementById(`mp-arr-${sid}`);
      if (a) a.classList.remove('open');
    });
  }

  function closeAllPathuIn(sectionId) {
    const secEl = document.getElementById(`mp-idx-sec-${sectionId}`);
    if (!secEl) return;
    secEl.querySelectorAll('.mp-idx-grandchildren.open').forEach(el => {
      el.classList.remove('open');
      const pid = el.id.replace('mp-idx-pathu-', '');
      const a = document.getElementById(`mp-parr-${pid}`);
      if (a) a.classList.remove('open');
    });
  }

  function scrollToAnchor(id) {
    const el = document.getElementById(`mp-grp-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.warn(`[MP] anchor mp-grp-${id} not found in DOM`);
    }
  }

  // ── Level 0: section ──
  window._mpSecClick = (sectionId, hasGroups) => {
    if (!hasGroups) {
      const el = document.getElementById(`mp-sec-${sectionId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const ch  = document.getElementById(`mp-idx-sec-${sectionId}`);
    const arr = document.getElementById(`mp-arr-${sectionId}`);
    if (!ch) return;
    const isOpen = ch.classList.contains('open');
    closeAllSections();
    if (!isOpen) {
      ch.classList.add('open');
      if (arr) arr.classList.add('open');
    }
  };

  // ── Level 1: reads type from data attribute — no quote issues ──
  window._mpL1Click = (el) => {
    // el may be the child span — always get the parent div that holds data attributes
    const div      = el.closest('.mp-idx-child') || el;
    const grpId    = div.dataset.grpid;
    const grpType  = div.dataset.grptype;
    const hasL2    = div.dataset.hasl2 === 'true';
    const sectionId = div.dataset.secid;

    if (grpType === 'thirumozhi') {
      // thirumozhi anchors use mp-grp-tm-{id} to avoid ID clash with pathu mp-grp-{id}
      const target = document.getElementById(`mp-grp-tm-${grpId}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const secEl = document.getElementById(`mp-sec-${sectionId}`);
        if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.warn(`[MP nav] mp-grp-tm-${grpId} not found`);
      }
      return;
    }

    // pathu type
    if (!hasL2) {
      scrollToAnchor(grpId);
      return;
    }

    // pathu with children — toggle L2 accordion
    const ch  = document.getElementById(`mp-idx-pathu-${grpId}`);
    const arr = document.getElementById(`mp-parr-${grpId}`);
    if (!ch) return;
    const isOpen = ch.classList.contains('open');
    closeAllPathuIn(sectionId);
    if (!isOpen) {
      ch.classList.add('open');
      if (arr) arr.classList.add('open');
    }
  };

  // ── Level 2: pathu child → scroll to pathu_id anchor ──
  window._mpL2Click = (el) => {
    const div = el.closest('.mp-idx-grandchild') || el;
    scrollToAnchor(div.dataset.pattid);
  };
}
