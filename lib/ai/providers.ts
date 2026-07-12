import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  customProvider,
  extractReasoningMiddleware,
  gateway,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

const agnes = createOpenAICompatible({
  apiKey: process.env.AGNES_API_KEY,
  baseURL: "https://apihub.agnes-ai.com/v1",
  name: "agnes",
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        chatModel,
        titleModel: mockTitleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": mockTitleModel,
        },
      });
    })()
  : customProvider({
      fallbackProvider: gateway,
      languageModels: {
        "agnes-2.0-flash": wrapLanguageModel({
          middleware: extractReasoningMiddleware({ tagName: "thinking" }),
          model: agnes.chatModel("agnes-2.0-flash"),
        }),
      },
    });

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  return myProvider.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return myProvider.languageModel(titleModel.id);
}
