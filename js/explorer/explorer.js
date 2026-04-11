import { fetchPasuramByFilter } from "./dataService.js";
import { mergePasurams, buildTree } from "./transformer.js";
import { renderTree } from "./renderer.js";

export async function openAzhwarExplorer(author_id) {
  const raw = await fetchPasuramByFilter({ author_id });

  const merged = mergePasurams(raw);

  const tree = buildTree(merged);

  renderTree(tree);
}

export async function openDivyadesamExplorer(divyadesam_id) {
  const raw = await fetchPasuramByFilter({ divyadesam_id });

  const merged = mergePasurams(raw);

  const tree = buildTree(merged);

  renderTree(tree);
}