# Lumen Relay — designnotater

## Grunnsløyfen

Spilleren leser formen på et fragment, henter det, krysser et felt med bevegelig interferens og leverer det til riktig port. På hver tur dukker tre små valg opp:

1. Hvilket fragment er tryggest å hente?
2. Hvilken rute går utenom interferensen?
3. Bør dash brukes nå, eller spares til returen?

Du kan bare bære ett fragment om gangen, og de tre portene står på samme sted gjennom runden. Det gjør spillet lett å lese selv når tempoet øker.

## Vanskelighetsgrad

Etter fem vellykkede leveringer går spillet til neste bølge. Flere ting endres samtidig:

- hvor ofte fragmenter dukker opp;
- hvor lenge de blir liggende;
- hvor mye interferens som finnes;
- hastigheten på interferensen;
- hvor kraftig den styrer.

Funksjonen `difficultyFor()` holder denne utviklingen enkel å inspisere og teste.

## Poeng

En levering starter på 100 poeng. Gjenstående levetid gir en fartsbonus. Leveringer på rad øker multiplikatoren med 0,25, opptil en rekke på åtte. Treffer du interferens, brytes rekken.

Tanken er å belønne raske ruter uten å gjøre en treg, men riktig levering verdiløs.

## Inndata

Tastatur gir direkte bevegelse. Med mus eller berøring styrer spilleren mot et punkt i spillverdenen. Begge ender i samme normaliserte bevegelsesvektor, så selve simuleringen er uavhengig av inndataenheten.

Dash gir et kort vindu med høy fart og midlertidig beskyttelse, etterfulgt av nedkjøling. Det er et defensivt verktøy: interferensen skyves unna, men ødelegges ikke.

## Visuelt språk

Arenaen bruker tre signaler som skiller seg både med form og farge:

- cyan sirkel;
- ravgul trekant;
- fiolett firkant.

Interferens tegnes som ujevne røde former. Spilleren er en lys diamant med retning. En stiplet rute vises bare når spilleren bærer et fragment.

All grafikk tegnes mens spillet kjører. Det trengs ingen bilde-, font-, lyd- eller shaderfiler.

## Tilstand og feil

Spillet har fire tydelige faser: `intro`, `playing`, `paused` og `gameover`. Dette er interne tilstandsnavn. En skjult fane setter spillet på pause automatisk. Tidssteget begrenses slik at en lang pause mellom to bilder ikke flytter objekter tvers gjennom spilleren.

Tilgang til lokal lagring er pakket inn slik at spillet fortsatt fungerer hvis lagring er blokkert. Lyd opprettes først etter brukerinteraksjon og kan slås av.
