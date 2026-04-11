export async function fetchPasuramByFilter(filter) {
  let url = "/api/pasuram?";

  if (filter.author_id) {
    url += `author_id=${filter.author_id}&`;
  }

  if (filter.divyadesam_id) {
    url += `divyadesam_id=${filter.divyadesam_id}&`;
  }

  const res = await fetch(url);
  return await res.json();
}