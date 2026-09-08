# Opphav og lisenser

- **Konsept og prosjekt:** Rolf Selås. Gjennomført med Codex etter oppdragsbeskrivelsen om Arkivmuseet.
- **Arkitektur og 3D-modeller:** Originale modeller laget for prosjektet i Blender 4.5.9 LTS. Genereringsoppskrift: `scripts/make-assets.py`. Modeller: riflede søyler, buer, monterunderstell, arkivskap, mapper, serverrack og papirskulptur. Ingen eksterne museumsmodeller eller originale saksdokumenter er brukt.
- **Materialer:** Originale, deterministisk genererte teksturer i nettleseren. Ingen bilder eller tredjepartsteksturer.
- **Lyd:** Originalt generert med Web Audio: filtrert støy, ventilasjonslignende romlyd, fottrinn og forsinket ekko. Ingen lydopptak, sampling eller musikk fra andre.
- **Typografi:** Lokale systemfonter: Georgia, Times New Roman, Segoe UI og Arial. Fontfiler distribueres ikke.
- **Three.js 0.185.1:** MIT-lisens. Opphavsrett til Three.js-forfatterne; lisens kopiert til `public/THREE-LICENSE.txt` og distribuert på nettstedet. GLTFLoader, Sky, RoomEnvironment og BufferGeometryUtils tilhører Three.js.
- **Vite 8.2.2:** MIT; byggeverktøy, ikke en egen 3D-motor. TypeScript 5.9.3: Apache-2.0; byggeverktøy. Typedefinisjoner følger sine egne pakklisenser. Avhengigheter er låst i `pnpm-lock.yaml`.
- **Blender:** GPL; brukt til produksjon av originale modeller. Programmet distribueres ikke med museet.
- **Historiske og juridiske kilder:** Rettigheter ligger hos utgiverne. Museet distribuerer korte sitater, selvstendige sammendrag og lenker. Hele tilsynsrapporter, foto eller avisartikler er ikke kopiert til nettstedet.

Prosjektets egen kode, originale modeller, lydoppskrifter og genererte materialer følger MIT-lisensen i `LICENSE`. Det gir ikke lisens til originalkildenes innhold, tredjeparts varemerker eller fonter.
