export function renderTree(tree) {
  console.log("Render tree here");

  // minimal version:
  Object.values(tree).forEach(thousand => {
    Object.values(thousand.sections).forEach(section => {
      Object.values(section.pathu).forEach(pathu => {
        Object.values(pathu.thirumozhi).forEach(tm => {

          console.log("Thirumozhi:", tm.name);

          tm.pasurams.forEach(p => {
            console.log(p.pasuram_text);
          });

        });
      });
    });
  });
}