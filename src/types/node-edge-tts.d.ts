declare module "node-edge-tts" {
  export type EdgeTtsOptions = {
    voice?: string;
    lang?: string;
    outputFormat?: string;
    saveSubtitles?: boolean;
    proxy?: string;
    rate?: string;
    pitch?: string;
    volume?: string;
    timeout?: number;
  };

  export class EdgeTTS {
    constructor(options?: EdgeTtsOptions);
    ttsPromise(text: string, audioPath: string): Promise<void>;
  }
}
