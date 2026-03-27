export interface TranscriptMessage {
  role: string;
  text?: string;
  thinking?: string;
  tool_call?: { tool_use_id: string; name: string; input_summary: string };
  tool_result?: { tool_use_id: string; name: string; success: boolean; output_summary?: string };
  timestamp_ms?: number;
}

export interface LineRange {
  start: number;
  end: number;
}

export interface LineAttribution {
  author: "ai" | "human" | "mixed";
  ranges: LineRange[];
  agent?: string;
}

export interface FileChange {
  path: string;
  added: number;
  deleted: number;
  attribution: string;
  agent?: string;
  line_attributions?: LineAttribution[];
}
