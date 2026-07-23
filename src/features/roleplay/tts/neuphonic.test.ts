import { describe, expect, it } from "vitest";
import { parseNeuphonicSseBody } from "@/features/roleplay/tts/neuphonic";

describe("parseNeuphonicSseBody", () => {
  it("aggregates base64 audio chunks from SSE data lines", () => {
    const chunkA = Buffer.from("hello").toString("base64");
    const chunkB = Buffer.from("world").toString("base64");
    const body = [
      `data: ${JSON.stringify({ data: { audio: chunkA, sampling_rate: 24000, text: "hel" } })}`,
      "",
      `data: ${JSON.stringify({ data: { audio: chunkB, sampling_rate: 24000, text: "lo", stop: true } })}`,
      "",
    ].join("\n");

    const parsed = parseNeuphonicSseBody(body);

    expect(Buffer.from(parsed.audio).toString("utf8")).toBe("helloworld");
    expect(parsed.samplingRate).toBe(24000);
    expect(parsed.text).toBe("hello");
  });

  it("returns empty audio when the stream has no data", () => {
    const parsed = parseNeuphonicSseBody("event: error\ndata: {}\n\n");
    expect(parsed.audio.byteLength).toBe(0);
    expect(parsed.samplingRate).toBe(0);
  });
});
