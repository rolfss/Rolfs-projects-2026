import { Source } from "@/types";

export const NOARK5_SYSTEM_PROMPT = `Du er en ekspertassistent for norske arkivarer som spesialiserer seg på NOARK 5-standarden og offisielle norske arkivforskrifter.

INSTRUKSJONER:
1. Svar KUN basert på de oppgitte kildedokumentene. Bruk ALDRI generell kunnskap som ikke er forankret i kildene.
2. Gi korte, konsise svar. Maks 3-4 setninger per svar med mindre mer detalj er strengt nødvendig.
3. Bruk direkte sitater fra kildedokumentene, markert med anførselstegn.
4. Oppgi ALLTID kildehenvisninger: dokumentnavn, sidetall og avsnittsnummer for hvert påstand.
5. Hvis informasjonen ikke finnes i kildedokumentene, si tydelig: "Denne informasjonen finnes ikke i de oppgitte kildedokumentene."
6. Godkjente fallback-kilder (kun hvis dokumentene er utilstrekkelige): Arkivverket (arkivverket.no), Riksarkivet, offisielle NOARK-standarder fra Standard Norge.
7. Formater kildehenvisninger slik: [Dokument: <navn>, Side: <nr>, Avsnitt: <nr>]

KONTEKST: Du hjelper norske arkivarer med å forstå NOARK 5-standarden og relaterte forskrifter som arkivforskriften og arkivloven.`;

/**
 * Regex that matches inline source citations in the format:
 * [Dokument: <name>, Side: <page>, Avsnitt: <section>]
 * Returns a new RegExp instance (with the global flag) on each call so it is
 * safe to use in multiple concurrent `exec` loops.
 */
export function citationRegex(): RegExp {
  return /\[Dokument:\s*([^,\]]+),\s*Side:\s*(\d+)(?:,\s*Avsnitt:\s*([^\]]+))?\]/g;
}

export function parseSourcesFromResponse(
  content: string,
  rawSources?: Source[]
): { cleanContent: string; sources: Source[] } {
  if (rawSources && rawSources.length > 0) {
    return { cleanContent: content, sources: rawSources };
  }

  // Parse inline citations from response
  const sources: Source[] = [];
  const regex = citationRegex();
  let match: RegExpExecArray | null;
  let idCounter = 1;

  while ((match = regex.exec(content)) !== null) {
    const existing = sources.find(
      (s) =>
        s.document === match![1].trim() &&
        s.page === parseInt(match![2]) &&
        s.section === match![3]?.trim()
    );
    if (!existing) {
      sources.push({
        id: `source-${idCounter++}`,
        title: match[1].trim(),
        document: match[1].trim(),
        page: parseInt(match[2]),
        section: match[3]?.trim(),
        quote: "",
      });
    }
  }

  return { cleanContent: content, sources };
}

export const NOARK5_DOCUMENTS = [
  {
    name: "NOARK 5 versjon 5.0",
    shortName: "NOARK 5",
    url: "https://www.arkivverket.no/forvaltning-og-utvikling/noark-standarden/noark-5",
    description: "Den offisielle NOARK 5-standarden for elektronisk arkivering",
  },
  {
    name: "Arkivforskriften",
    shortName: "Arkivforskriften",
    url: "https://lovdata.no/dokument/SF/forskrift/1998-12-11-1193",
    description: "Forskrift om offentlege arkiv",
  },
  {
    name: "Arkivloven",
    shortName: "Arkivloven",
    url: "https://lovdata.no/dokument/NL/lov/1992-12-04-126",
    description: "Lov om arkiv",
  },
];
