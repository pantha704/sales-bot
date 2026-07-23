import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/roleplay/transcribe/route";

describe("POST /api/roleplay/transcribe", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires an audio file", async () => {
    const response = await POST(
      new Request("http://localhost/api/roleplay/transcribe", {
        method: "POST",
        body: new FormData(),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("reports unavailable transcription without a Groq key", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const formData = new FormData();
    formData.set(
      "audio",
      new File([new Uint8Array([1, 2, 3])], "recording.webm", {
        type: "audio/webm",
      }),
    );
    const response = await POST(
      new Request("http://localhost/api/roleplay/transcribe", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("TRANSCRIPTION_UNAVAILABLE");
  });
});
