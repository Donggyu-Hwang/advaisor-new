import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const bedrockClient = new BedrockRuntimeClient({
  region: process.env["aws.bedrock.region"] || "us-west-2",
  credentials: {
    accessKeyId: process.env["aws.bedrock.access-key"] || "",
    secretAccessKey: process.env["aws.bedrock.secret-key"] || "",
  },
});

export interface ClaudeImageContent {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    data: string;
  };
}

export interface ClaudeTextContent {
  type: "text";
  text: string;
}

export type ClaudeContent = ClaudeTextContent | ClaudeImageContent;

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: ClaudeContent[] | string;
}

export interface ClaudeRequest {
  anthropic_version: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  temperature?: number;
  system?: string;
}

export class BedrockService {
  private modelId: string;

  constructor() {
    this.modelId =
      process.env["aws.bedrock.profile-arn"] ||
      "arn:aws:bedrock:us-west-2:637423642074:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0";
  }

  async invokeModel(
    messages: ClaudeMessage[],
    systemPrompt?: string
  ): Promise<string> {
    try {
      const request: ClaudeRequest = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 131072,
        messages,
        temperature: 0.1,
      };

      if (systemPrompt) {
        request.system = systemPrompt;
      }

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(request),
      });

      const response = await bedrockClient.send(command);

      if (!response.body) {
        throw new Error("No response body from Bedrock");
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      if (responseBody.content && responseBody.content.length > 0) {
        return responseBody.content[0].text;
      }

      throw new Error("No content in Bedrock response");
    } catch (error) {
      console.error("Bedrock API Error:", error);
      throw error;
    }
  }

  async analyzePageImage(imageBase64: string, prompt: string): Promise<string> {
    // Base64 이미지 크기 체크 (대략적인 바이트 크기)
    const imageSizeInBytes = (imageBase64.length * 3) / 4;
    const maxSizeInMB = 5; // 5MB 제한으로 줄임
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (imageSizeInBytes > maxSizeInBytes) {
      throw new Error(
        `Image too large: ${(imageSizeInBytes / 1024 / 1024).toFixed(
          2
        )}MB. Maximum allowed: ${maxSizeInMB}MB`
      );
    }

    const messages: ClaudeMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${prompt} \n 응답은 반드시 JSON 형식으로 해주세요.`,
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: imageBase64,
            },
          },
        ],
      },
    ];

    return this.invokeModel(messages);
  }

  async analyzeWithPrompt(data: any, prompt: string): Promise<string> {
    const messages: ClaudeMessage[] = [
      {
        role: "user",
        content: `${prompt}

분석할 데이터:
${JSON.stringify(data, null, 2)}

응답은 반드시 JSON 형식으로 해주세요.`,
      },
    ];

    return this.invokeModel(messages);
  }
}

export const bedrockService = new BedrockService();
