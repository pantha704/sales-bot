import type { Persona } from "@/features/roleplay/schemas";

export type TtsProviderName = "neuphonic" | "groq";

export type SynthesisInput = {
  text: string;
  voice: Persona["voice"];
};

export type SynthesisResult = {
  audio: Uint8Array<ArrayBuffer>;
  contentType: "audio/wav";
  provider: TtsProviderName;
  truncated?: boolean;
};
