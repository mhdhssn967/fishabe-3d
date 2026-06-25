const fs = require('fs');
const { NodeIO } = require('@gltf-transform/core');
const io = new NodeIO();
async function main() {
  const document = await io.read('public/fishanim.glb');
  const root = document.getRoot();
  const nodes = root.listNodes();
  nodes.forEach(n => console.log(n.getName()));
}
main();
