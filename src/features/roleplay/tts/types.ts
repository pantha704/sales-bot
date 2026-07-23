import type { Persona } from "@/features/roleplay/schemas";

export type TtsProviderName = "edge" | "neuphonic" | "groq";

export type SynthesisInput = {
  text: string;
  voice: Persona["voice"];
};

export type SynthesisResult = {
  audio: Uint8Array<ArrayBuffer>;
  contentType: "audio/wav" | "audio/mpeg";
  provider: TtsProviderName;
  truncated?: boolean;
};
