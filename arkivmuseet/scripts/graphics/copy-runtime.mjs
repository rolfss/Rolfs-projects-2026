import {mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
const out='public/assets/visual-preview/basis';mkdirSync(out,{recursive:true});
for(const file of ['basis_transcoder.js','basis_transcoder.wasm'])copyFileSync('node_modules/three/examples/jsm/libs/basis/'+file,out+'/'+file);
// Apache 2.0 standard terms from the pinned toolchain, with the decoder's actual attribution.
// This is licence text only; no Playwright code is distributed by the museum runtime.
const standard=readFileSync('node_modules/@playwright/test/LICENSE','utf8').replace(/\r\n/g,'\n');
const attribution='   Portions Copyright (c) Microsoft Corporation.\n   Portions Copyright 2017 Google Inc.';
if(!standard.includes('Version 2.0, January 2004')||!standard.includes(attribution))throw new Error('Review the decoder licence copy against upstream before building');
writeFileSync('public/BASIS-LICENSE.txt',standard.replace(attribution,'   Copyright 2019-2026 Binomial LLC'));
