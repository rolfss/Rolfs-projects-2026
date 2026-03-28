export interface Source {
  id: string;
  title: string;
  document: string;
  page?: number;
  section?: string;
  url?: string;
  quote: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
}

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}

export interface ChatResponse {
  message: string;
  sources: Source[];
}
