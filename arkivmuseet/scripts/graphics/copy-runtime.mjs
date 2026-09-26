import {mkdirSync,copyFileSync} from 'node:fs';
const out='public/assets/visual-preview/basis';mkdirSync(out,{recursive:true});
for(const file of ['basis_transcoder.js','basis_transcoder.wasm'])copyFileSync('node_modules/three/examples/jsm/libs/basis/'+file,out+'/'+file);
