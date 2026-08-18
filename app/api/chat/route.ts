import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { NOARK5_SYSTEM_PROMPT, citationRegex } from "@/lib/noark";
import { Source } from "@/types";

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, userMessage } = await req.json();

    if (!userMessage?.trim()) {
      return NextResponse.json(
        { error: "Tom melding" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      // Demo mode: return a mock response when no API key is configured
      const demoResponse = getDemoResponse(userMessage);
      return NextResponse.json(demoResponse);
    }

    const openai = getOpenAIClient()!;

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: NOARK5_SYSTEM_PROMPT },
      ...messages.map(
        (m: { role: "user" | "assistant"; content: string }) => ({
          role: m.role,
          content: m.content,
        })
      ),
      { role: "user", content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: chatMessages,
      temperature: 0.1,
      max_tokens: 800,
    });

    const rawContent = completion.choices[0].message.content ?? "";
    const sources = extractSources(rawContent);

    return NextResponse.json({
      message: rawContent,
      sources,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Feil ved behandling av forespørsel" },
      { status: 500 }
    );
  }
}

function extractSources(content: string): Source[] {
  const sources: Source[] = [];
  const regex = citationRegex();
  let match: RegExpExecArray | null;
  let idCounter = 1;

  while ((match = regex.exec(content)) !== null) {
    const docName = match[1].trim();
    const page = parseInt(match[2]);
    const section = match[3]?.trim();

    const existing = sources.find(
      (s) => s.document === docName && s.page === page && s.section === section
    );
    if (!existing) {
      const docUrl = getDocumentUrl(docName);
      sources.push({
        id: `source-${idCounter++}`,
        title: `${docName}${section ? ` § ${section}` : ""}`,
        document: docName,
        page,
        section,
        url: docUrl,
        quote: extractQuoteNearCitation(content, match.index),
      });
    }
  }

  return sources;
}

function getDocumentUrl(docName: string): string {
  const lower = docName.toLowerCase();
  if (lower.includes("noark")) {
    return "https://www.arkivverket.no/forvaltning-og-utvikling/noark-standarden/noark-5";
  }
  if (lower.includes("arkivforskriften")) {
    return "https://lovdata.no/dokument/SF/forskrift/1998-12-11-1193";
  }
  if (lower.includes("arkivloven")) {
    return "https://lovdata.no/dokument/NL/lov/1992-12-04-126";
  }
  return "https://www.arkivverket.no";
}

function extractQuoteNearCitation(content: string, index: number): string {
  // Find the nearest quoted text before the citation
  const preceding = content.substring(Math.max(0, index - 200), index);
  const quoteMatch = preceding.match(/«([^»]+)»|"([^"]+)"/);
  if (quoteMatch) {
    return quoteMatch[1] || quoteMatch[2] || "";
  }
  return "";
}

function getDemoResponse(userMessage: string): {
  message: string;
  sources: Source[];
} {
  const lowerMsg = userMessage.toLowerCase();

  if (lowerMsg.includes("noark") || lowerMsg.includes("arkiv")) {
    return {
      message: `NOARK 5 er den norske standarden for elektroniske arkivsystemer. «NOARK 5 skal sikre at elektroniske arkiver bevares på en måte som gjør dem autentiske, pålitelige, integrerte og brukbare over tid.» [Dokument: NOARK 5 versjon 5.0, Side: 12, Avsnitt: 1.2]

Standarden stiller krav til journalføring, klassifikasjon og langtidsbevaring av elektroniske dokumenter i offentlig forvaltning. [Dokument: NOARK 5 versjon 5.0, Side: 14, Avsnitt: 2.1]`,
      sources: [
        {
          id: "source-1",
          title: "NOARK 5 versjon 5.0 § 1.2",
          document: "NOARK 5 versjon 5.0",
          page: 12,
          section: "1.2",
          url: "https://www.arkivverket.no/forvaltning-og-utvikling/noark-standarden/noark-5",
          quote:
            "NOARK 5 skal sikre at elektroniske arkiver bevares på en måte som gjør dem autentiske, pålitelige, integrerte og brukbare over tid.",
        },
        {
          id: "source-2",
          title: "NOARK 5 versjon 5.0 § 2.1",
          document: "NOARK 5 versjon 5.0",
          page: 14,
          section: "2.1",
          url: "https://www.arkivverket.no/forvaltning-og-utvikling/noark-standarden/noark-5",
          quote: "",
        },
      ],
    };
  }

  if (
    lowerMsg.includes("journalføring") ||
    lowerMsg.includes("journal")
  ) {
    return {
      message: `Journalføring er regulert i arkivforskriften § 2-6. «Organet skal journalføre inngående og utgående dokumenter som etter offentleglova eller forvaltningsloven regnes som saksdokumenter for organet, dersom disse er gjenstand for saksbehandling og har verdi som dokumentasjon.» [Dokument: Arkivforskriften, Side: 8, Avsnitt: 2-6]

NOARK 5 spesifiserer tekniske krav for journalføring i kapittel 5. [Dokument: NOARK 5 versjon 5.0, Side: 45, Avsnitt: 5.1]`,
      sources: [
        {
          id: "source-1",
          title: "Arkivforskriften § 2-6",
          document: "Arkivforskriften",
          page: 8,
          section: "2-6",
          url: "https://lovdata.no/dokument/SF/forskrift/1998-12-11-1193/KAPITTEL_2#%C2%A72-6",
          quote:
            "Organet skal journalføre inngående og utgående dokumenter som etter offentleglova eller forvaltningsloven regnes som saksdokumenter for organet, dersom disse er gjenstand for saksbehandling og har verdi som dokumentasjon.",
        },
        {
          id: "source-2",
          title: "NOARK 5 versjon 5.0 § 5.1",
          document: "NOARK 5 versjon 5.0",
          page: 45,
          section: "5.1",
          url: "https://www.arkivverket.no/forvaltning-og-utvikling/noark-standarden/noark-5",
          quote: "",
        },
      ],
    };
  }

  if (
    lowerMsg.includes("kassasjon") ||
    lowerMsg.includes("bevaring")
  ) {
    return {
      message: `Bevaring og kassasjon er regulert i arkivloven § 9 og arkivforskriften kapittel 3. «Offentlege organ pliktar å ha arkiv, og desse skal vera ordna og innretta slik at dokumenta er tryggja som informasjonskjelder for samtid og ettertid.» [Dokument: Arkivloven, Side: 4, Avsnitt: 1]

Kassasjonsregler fastsettes av Riksarkivaren og fremgår av bevarings- og kassasjonsvedtak. [Dokument: Arkivforskriften, Side: 22, Avsnitt: 3-19]`,
      sources: [
        {
          id: "source-1",
          title: "Arkivloven § 1",
          document: "Arkivloven",
          page: 4,
          section: "1",
          url: "https://lovdata.no/dokument/NL/lov/1992-12-04-126#%C2%A71",
          quote:
            "Offentlege organ pliktar å ha arkiv, og desse skal vera ordna og innretta slik at dokumenta er tryggja som informasjonskjelder for samtid og ettertid.",
        },
        {
          id: "source-2",
          title: "Arkivforskriften § 3-19",
          document: "Arkivforskriften",
          page: 22,
          section: "3-19",
          url: "https://lovdata.no/dokument/SF/forskrift/1998-12-11-1193",
          quote: "",
        },
      ],
    };
  }

  return {
    message: `⚠️ **Demo-modus** (ingen OpenAI API-nøkkel konfigurert)\n\nJeg er en demo-versjon av NOARK 5-assistenten. For å aktivere full funksjonalitet, konfigurer en OpenAI API-nøkkel i miljøvariabelen \`OPENAI_API_KEY\`.\n\nProve å spørre om:\n- NOARK 5-standarden\n- Journalføring\n- Bevaring og kassasjon`,
    sources: [],
  };
}
