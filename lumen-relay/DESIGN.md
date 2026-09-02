# Lumen Relay — designnotater

## Grunnideen

Spilleren leser formen på et signal, plukker det opp, frakter det gjennom et felt med bevegelig støy og leverer det til riktig port. Hver tur gir tre små valg:

1. Hvilket signal er tryggest å ta først?
2. Hvilken rute er minst risikabel?
3. Skal dash brukes nå, eller spares til returen?

Du kan bare bære ett signal om gangen, og portene står på samme sted gjennom hele runden. Det gjør spillet lett å lese selv når tempoet øker.

## Vanskelighetsgrad

Hver femte levering starter en ny bølge. Da justeres flere ting:

- tiden mellom nye signaler;
- hvor lenge et signal blir liggende;
- antall støyelementer;
- farten deres;
- hvor sterkt de styrer mot spilleren.

Dette ligger i den rene funksjonen `difficultyFor()`, slik at utviklingen er enkel å teste.

## Poeng

En levering starter på 100 poeng. Rask levering gir bonus. Leveringer på rad øker multiplikatoren med 0,25, opp til en kjede på åtte. Treffer du støy, brytes kjeden.

Tanken er å belønne tempo uten at en rolig, riktig levering blir verdiløs.

## Styring

Tastaturet gir direkte bevegelse. Mus og berøring styrer mot et punkt i banen. Begge ender i samme bevegelsesvektor, så spillreglene er de samme uansett hvordan man spiller.

Dash gir et kort øyeblikk med høy fart og beskyttelse, etterfulgt av nedkjøling. Dash er først og fremst et forsvarsverktøy; støy skyves unna, men ødelegges ikke.

## Visuelt språk

Tre signaltyper brukes samtidig som form og farge:

- cyan sirkel;
- ravgul trekant;
- fiolett firkant.

Støyen er rød og uregelmessig. Spilleren er en lys, retningsbestemt diamant. Når du bærer et signal, vises en stiplet linje mot riktig port.

All grafikk tegnes mens spillet kjører. Det trengs ingen bildefiler, skrifter, lydfiler eller shaders.

## Tilstand og feil

Spillet har fire tydelige faser: `intro`, `playing`, `paused` og `gameover`. De interne navnene er engelske fordi de er kodeverdier. Fanen pauser automatisk når den skjules, og tidssteg begrenses slik at en lang pause ikke flytter objekter tvers gjennom banen.

Tilgang til lokal lagring er pakket inn slik at spillet fortsatt virker dersom nettleseren blokkerer lagring. Lyd opprettes først etter brukerhandling og kan slås av.
