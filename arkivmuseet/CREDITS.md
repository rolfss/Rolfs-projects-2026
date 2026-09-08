# Opphav og lisenser

- **Konsept og prosjekt:** Rolf Selås. Gjennomført med Codex etter oppdragsbeskrivelsen om Arkivmuseet.
- **Arkitektur og 3D-modeller:** Originale modeller laget for prosjektet i Blender 4.5.9 LTS. Genereringsoppskrift: `scripts/make-assets.py`. Modeller: riflede søyler, buer, monterunderstell, arkivskap, mapper, serverrack og papirskulptur. Ingen eksterne museumsmodeller er brukt. Fargede gallerivegger, utstillingsrammer, bannere og leselys er bygget for museet.
- **Materialer:** Originale, deterministisk genererte teksturer i nettleseren. Fotografier omtalt nedenfor brukes i tillegg som utstillingsbilder.
- **Lyd:** Originalt generert med Web Audio: filtrert støy, ventilasjonslignende romlyd, fottrinn og forsinket ekko. Ingen lydopptak, sampling eller musikk fra andre.
- **Typografi:** Lokale systemfonter: Georgia, Times New Roman, Segoe UI og Arial. Fontfiler distribueres ikke.
- **Three.js 0.185.1:** MIT-lisens. Opphavsrett til Three.js-forfatterne; lisens kopiert til `public/THREE-LICENSE.txt` og distribuert på nettstedet. GLTFLoader, Sky, RoomEnvironment og BufferGeometryUtils tilhører Three.js.
- **Vite 8.2.2:** MIT; byggeverktøy, ikke en egen 3D-motor. TypeScript 5.9.3: Apache-2.0; byggeverktøy. Typedefinisjoner følger sine egne pakklisenser. Avhengigheter er låst i `pnpm-lock.yaml`.
- **Blender:** GPL; brukt til produksjon av originale modeller. Programmet distribueres ikke med museet.
- **Historiske og juridiske kilder:** Rettigheter ligger hos utgiverne. Museet distribuerer korte sitater, selvstendige sammendrag og lenker. Fem hele rapportsider fra tre rapporter vises som merkede faksimiler. Fotografiene nedenfor er gjengitt under sine oppgitte lisenser. Korte autentiske nyhetsoverskrifter vises i museets egen utforming.

Prosjektets egen kode, originale modeller, lydoppskrifter og genererte materialer følger MIT-lisensen i `LICENSE`. Det gir ikke lisens til originalkildenes innhold, tredjeparts varemerker eller fonter.

## Fotografier og faksimiler · lederreisen

- **Hanekleivtunnelen:** Foto Peter Fiskerstrand, 4. juni 2010. [Original og kreditering](https://commons.wikimedia.org/wiki/File:Hanekleivtunnelen.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Sørportalene, ikke raset i 2006.
- **Dalen i Tokke:** Foto Eirik Solheim, 21. juli 2008. [Original og kreditering](https://commons.wikimedia.org/wiki/File:Dalen_i_Telemark.jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/). Stedsbilde, ikke dokumentasjon av arkivtilsynet eller elevsystemet.
- Fotografiene er nedskalert til høyst 1280 px og konvertert til WebP. Ingen beskjæring. De beholder sine CC BY-SA-lisenser; prosjektets MIT-lisens erstatter dem ikke.
- **Osen, Tokke og NPE:** Side 1 og 3 (Osen), side 7 (Tokke), og side 1 og 6 (NPE) fra Arkivverkets endelige rapporter, uendret bortsett fra tapsfri filformatkonvertering. Originaler lenkes i bildet og `cases/cases.json`. Grunnlaget for gjengivelse er at offentlige tilsynsvedtak vurderes å være omfattet av unntaket for offentlige myndigheters dokumenter i åndsverkloven § 14; dette er en vurdering av dokumenttypen, ikke en CC-lisens fra utgiver. Riksvåpenet beholdes i dokumentet og brukes ikke som museets merke.
- Fullstendige bildetekster, dimensjoner, originalkilder og lisenslenker følger bildene i `public/assets/cases/credits.json`.

- **Steinsdalselva i Osen:** Foto Einar Faanes (Emuzesto), 2. juli 2005. [Original og kreditering](https://commons.wikimedia.org/wiki/File:Osen_river.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Stedsbilde, ikke arkivtilsynet.

## Presseomtale og atmosfære

- [«Derfor raste Hanekleivtunnelen»](https://www.forskning.no/samferdsel-sikkerhet-geofag/derfor-raste-hanekleivtunnelen/1010691), forskning.no, 15. februar 2007.
- [«Klager på hemmelighold om Hanekleivtunnelen»](https://www.vg.no/nyheter/i/zWbV4/klager-paa-hemmelighold-om-hanekleivtunnelen), VG/NTB, 22. februar 2007.

Panelene gjengir bare overskriften og et selvstendig sammendrag med lenke. De er tydelig merket som kuraterte utdrag; avisenes layout, logoer og bilder er ikke kopiert. Rasfotografiene er utelatt fordi gjenbruksrett til de konkrete filene ikke ble avklart. Det lisensierte stedsbildet fra 2010 har egen dato og motivtekst.

Rom, fokusert lys, lyd og bevisst tempo er inspirert av formidlingsmetoder beskrevet for [War Remains hos National WWI Museum](https://www.theworldwar.org/exhibitions/war-remains). Ingen stemme, lydopptak, grafikk, manus eller modeller derfra er brukt. Arkivmuseets innhold og lyd er laget for offentlig dokumentasjon og lederlæring.
