export function processDisplayItems(items) {
  let normalItems = [];
  let adivaravuItem = null;

  items.forEach(item => {
    if (item.meta_key === "adivaravu") {
      adivaravuItem = item;
    } else {
      normalItems.push(item);
    }
  });

  return {
    normalItems,
    adivaravuItem
  };
}