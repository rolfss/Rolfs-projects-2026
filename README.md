# NOARK 5 Arkivassistent

A RAG (Retrieval-Augmented Generation) chat application for Norwegian archivists to query archival standards — specifically NOARK 5 and official regulations (Arkivloven and Arkivforskriften).

Built with [Next.js](https://nextjs.org), React, and Tailwind CSS.

## Features

- **RAG chat system** – grounded answers with direct quotes from source documents
- **Clickable source citations** – every claim includes a document name, page number, section identifier, and link
- **Short, concise answers** – strictly grounded in the source material
- **Minimalist split-panel layout** – chat history on the left, source links + text input on the right
- **Demo mode** – works without an API key using pre-defined NOARK 5 responses
- **OpenAI integration** – connect your own API key for full RAG functionality

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and add your OpenAI API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
OPENAI_API_KEY=your-openai-api-key-here
```

> Without an API key the app runs in **demo mode** with pre-defined responses for common NOARK 5 queries.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Source documents

The system is designed to prioritise uploaded documents and falls back to these credentialed official sources:

| Document | URL |
|---|---|
| NOARK 5 versjon 5.0 | https://www.arkivverket.no/forvaltning-og-utvikling/noark-standarden/noark-5 |
| Arkivforskriften | https://lovdata.no/dokument/SF/forskrift/1998-12-11-1193 |
| Arkivloven | https://lovdata.no/dokument/NL/lov/1992-12-04-126 |

## Deployment

The easiest way to deploy is with [Vercel](https://vercel.com/new). Set the `OPENAI_API_KEY` environment variable in your Vercel project settings.
