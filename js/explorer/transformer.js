export function mergePasurams(rows) {
  const map = {};

  rows.forEach(r => {
    if (!map[r.pasuram_id]) {
      map[r.pasuram_id] = {
        ...r,
        divyadesams: []
      };
    }

    if (r.divyadesam_id) {
      map[r.pasuram_id].divyadesams.push({
        id: r.divyadesam_id,
        name: r.divyadesam_name
      });
    }
  });

  return Object.values(map);
}