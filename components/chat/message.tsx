"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import Image from "next/image";
import { useCallback } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, extractThinking, sanitizeText } from "@/lib/utils";
import { MarkdownRenderer } from "../ai-elements/markdown-renderer";
import { MessageContent, MessageResponse } from "../ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../ai-elements/reasoning";
import { Shimmer } from "../ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool";
import { useDataStream } from "./data-stream-provider";
import { SparklesIcon } from "./icons";
import { MessageActions } from "./message-actions";
import { SearchResults } from "./search-results";

function WaitingText() {
  const { waitingStatus } = useDataStream();
  const waitingText = waitingStatus?.message ?? "Waiting...";

  return (
    <div className="flex min-h-[calc(13px*1.65)] min-w-0 items-center gap-2 text-[13px] leading-[1.65]">
      <div className="flex items-center gap-1">
        <span
          className="inline-block size-1.5 rounded-full bg-foreground/40 thinking-dot"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="inline-block size-1.5 rounded-full bg-foreground/40 thinking-dot"
          style={{ animationDelay: "200ms" }}
        />
        <span
          className="inline-block size-1.5 rounded-full bg-foreground/40 thinking-dot"
          style={{ animationDelay: "400ms" }}
        />
      </div>
      <Shimmer
        as="span"
        className="font-medium whitespace-normal break-words text-muted-foreground"
        duration={1}
      >
        {waitingText}
      </Shimmer>
    </div>
  );
}

function ToolApprovalActions({
  addToolApprovalResponse,
  approvalId,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  approvalId: string;
}) {
  const handleDeny = useCallback(() => {
    addToolApprovalResponse({
      approved: false,
      id: approvalId,
      reason: "User denied weather lookup",
    });
  }, [addToolApprovalResponse, approvalId]);

  const handleAllow = useCallback(() => {
    addToolApprovalResponse({
      approved: true,
      id: approvalId,
    });
  }, [addToolApprovalResponse, approvalId]);

  return (
    <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
      <button
        className="rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
        onClick={handleDeny}
        type="button"
      >
        Deny
      </button>
      <button
        className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
        onClick={handleAllow}
        type="button"
      >
        Allow
      </button>
    </div>
  );
}

const PurePreviewMessage = ({
  addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  setMessages: _setMessages,
  regenerate: _regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  onEdit,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  onEdit?: (message: ChatMessage) => void;
}) => {
  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const hasAnyContent = message.parts?.some(
    (part) =>
      (part.type === "text" && part.text?.trim().length > 0) ||
      (part.type === "reasoning" &&
        "text" in part &&
        part.text?.trim().length > 0) ||
      part.type.startsWith("tool-")
  );
  const isThinking = isAssistant && isLoading && !hasAnyContent;

  const attachments = attachmentsFromMessage.length > 0 && (
    <div
      className="flex flex-row flex-wrap justify-end gap-2"
      data-testid={"message-attachments"}
    >
      {attachmentsFromMessage.map((attachment) => {
        const isImage =
          "mediaType" in attachment &&
          typeof attachment.mediaType === "string" &&
          attachment.mediaType.startsWith("image/");

        if (
          isImage &&
          "url" in attachment &&
          typeof attachment.url === "string"
        ) {
          return (
            <Image
              alt={attachment.filename ?? "image"}
              className="max-h-[300px] max-w-[400px] rounded-lg border border-border/30 object-contain shadow-[var(--shadow-card)]"
              height={300}
              key={attachment.url}
              src={attachment.url}
              unoptimized
              width={400}
            />
          );
        }

        return (
          <div
            className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-[12px] text-muted-foreground"
            key={attachment.url}
          >
            {attachment.filename ?? "file"}
          </div>
        );
      })}
    </div>
  );

  const mergedReasoning = message.parts?.reduce(
    (acc, part) => {
      if (part.type === "reasoning" && part.text?.trim().length > 0) {
        return {
          isStreaming: "state" in part ? part.state === "streaming" : false,
          rendered: false,
          text: acc.text ? `${acc.text}\n\n${part.text}` : part.text,
        };
      }
      return acc;
    },
    { isStreaming: false, rendered: false, text: "" }
  ) ?? { isStreaming: false, rendered: false, text: "" };

  const parts = message.parts?.map((part, index) => {
    const { type } = part;
    const key = `message-${message.id}-part-${index}`;

    if (type === "reasoning") {
      if (!mergedReasoning.rendered && mergedReasoning.text) {
        mergedReasoning.rendered = true;
        return (
          <Reasoning
            isStreaming={isLoading || mergedReasoning.isStreaming}
            key={key}
          >
            <ReasoningTrigger />
            <ReasoningContent>{mergedReasoning.text}</ReasoningContent>
          </Reasoning>
        );
      }
      return null;
    }

    if (type === "text") {
      if (isAssistant) {
        const { thinking, display } = extractThinking(part.text);
        return (
          <div
            className="min-w-0 flex-1"
            data-testid="message-content"
            key={key}
          >
            {thinking.length > 0 && (
              <Reasoning
                className="mb-2"
                isStreaming={isLoading}
                key={`${message.id}-thinking-${part.type}`}
              >
                <ReasoningTrigger />
                <ReasoningContent>{thinking}</ReasoningContent>
              </Reasoning>
            )}
            <MarkdownRenderer
              content={sanitizeText(display)}
              isStreaming={isLoading}
            />
          </div>
        );
      }
      return (
        <MessageContent
          className="w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-lg border border-border/30 bg-gradient-to-br from-secondary to-muted px-3.5 py-2 text-[13px] leading-[1.65] shadow-[var(--shadow-card)]"
          data-testid="message-content"
          key={key}
        >
          <MessageResponse>{sanitizeText(part.text)}</MessageResponse>
        </MessageContent>
      );
    }

    if (type === "tool-getWeather") {
      const { toolCallId, state } = part;
      const approvalId = (part as { approval?: { id: string } }).approval?.id;
      const isDenied =
        state === "output-denied" ||
        (state === "approval-responded" &&
          (part as { approval?: { approved?: boolean } }).approval?.approved ===
            false);
      const widthClass = "w-[min(100%,450px)]";

      if (state === "output-available") {
        return (
          <div className={widthClass} key={toolCallId}>
            <Tool className="w-full" defaultOpen={true}>
              <ToolHeader state="output-available" type="tool-getWeather" />
              <ToolContent>
                <ToolOutput
                  errorText={undefined}
                  output={
                    <div className="px-4 py-3 text-sm">
                      {typeof part.output === "string"
                        ? part.output
                        : JSON.stringify(part.output)}
                    </div>
                  }
                />
              </ToolContent>
            </Tool>
          </div>
        );
      }

      if (isDenied) {
        return (
          <div className={widthClass} key={toolCallId}>
            <Tool className="w-full" defaultOpen={true}>
              <ToolHeader state="output-denied" type="tool-getWeather" />
              <ToolContent>
                <div className="px-4 py-3 text-muted-foreground text-sm">
                  Weather lookup was denied.
                </div>
              </ToolContent>
            </Tool>
          </div>
        );
      }

      if (state === "approval-responded") {
        return (
          <div className={widthClass} key={toolCallId}>
            <Tool className="w-full" defaultOpen={true}>
              <ToolHeader state={state} type="tool-getWeather" />
              <ToolContent>
                <ToolInput input={part.input} />
              </ToolContent>
            </Tool>
          </div>
        );
      }

      return (
        <div className={widthClass} key={toolCallId}>
          <Tool className="w-full" defaultOpen={true}>
            <ToolHeader state={state} type="tool-getWeather" />
            <ToolContent>
              {(state === "input-available" ||
                state === "approval-requested") && (
                <ToolInput input={part.input} />
              )}
              {state === "approval-requested" && approvalId && (
                <ToolApprovalActions
                  addToolApprovalResponse={addToolApprovalResponse}
                  approvalId={approvalId}
                />
              )}
            </ToolContent>
          </Tool>
        </div>
      );
    }

    if (type === "tool-createDocument") {
      const { toolCallId } = part;
      const output = part.output as Record<string, unknown> | undefined;

      if (output && "error" in output) {
        return (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
            key={toolCallId}
          >
            Error creating document: {String(output.error)}
          </div>
        );
      }

      return (
        <div
          className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm"
          key={toolCallId}
        >
          <div className="font-medium text-foreground">Document Created</div>
        </div>
      );
    }

    if (type === "tool-updateDocument") {
      const { toolCallId } = part;
      const output = part.output as Record<string, unknown> | undefined;

      if (output && "error" in output) {
        return (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
            key={toolCallId}
          >
            Error updating document: {String(output.error)}
          </div>
        );
      }

      return (
        <div
          className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm"
          key={toolCallId}
        >
          <div className="font-medium text-foreground">Document Updated</div>
        </div>
      );
    }

    if (type === "tool-requestSuggestions") {
      const { toolCallId, state } = part;

      return (
        <Tool
          className="w-[min(100%,450px)]"
          defaultOpen={true}
          key={toolCallId}
        >
          <ToolHeader state={state} type="tool-requestSuggestions" />
          <ToolContent>
            {state === "input-available" && <ToolInput input={part.input} />}
            {state === "output-available" && (
              <ToolOutput
                errorText={undefined}
                output={
                  <div className="px-4 py-3 text-sm">
                    Suggestions processed successfully.
                  </div>
                }
              />
            )}
          </ToolContent>
        </Tool>
      );
    }

    if (type === "tool-fetchUrl") {
      const { toolCallId, state } = part;

      if (state === "input-available") {
        return (
          <Tool
            className="w-[min(100%,500px)]"
            defaultOpen={true}
            key={toolCallId}
          >
            <ToolHeader state={state} type="tool-fetchUrl" />
            <ToolContent>
              <ToolInput input={part.input} />
            </ToolContent>
          </Tool>
        );
      }

      if (state === "output-available") {
        const output = part.output as
          | {
              url: string;
              success: boolean;
              title: string;
              content: string;
              error?: string;
            }
          | undefined;

        if (output) {
          return (
            <Tool
              className="w-[min(100%,500px)]"
              defaultOpen={true}
              key={toolCallId}
            >
              <ToolHeader
                state={state}
                title={output.title ? `Fetched: ${output.title}` : undefined}
                type="tool-fetchUrl"
              />
              <ToolContent>
                <ToolOutput
                  errorText={output.error}
                  output={
                    output.content ? (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          <a
                            className="underline"
                            href={output.url}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {output.url}
                          </a>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed">
                          {output.content}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No content retrieved from{" "}
                        <a
                          className="underline"
                          href={output.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {output.url}
                        </a>
                      </div>
                    )
                  }
                />
              </ToolContent>
            </Tool>
          );
        }
      }

      return null;
    }

    if (type === "tool-searchWeb") {
      const { toolCallId, state } = part;

      if (state === "input-available") {
        return (
          <Tool
            className="w-[min(100%,500px)]"
            defaultOpen={true}
            key={toolCallId}
          >
            <ToolHeader state={state} type="tool-searchWeb" />
            <ToolContent>
              <ToolInput input={part.input} />
            </ToolContent>
          </Tool>
        );
      }

      if (state === "output-available") {
        const output = part.output as
          | {
              query: string;
              results: { title: string; url: string; snippet: string }[];
              resultCount: number;
            }
          | undefined;

        if (output) {
          return (
            <SearchResults
              key={`search-${toolCallId}`}
              query={output.query}
              results={output.results}
            />
          );
        }
      }

      return null;
    }

    return null;
  });

  const actions = !isReadonly && (
    <MessageActions
      chatId={chatId}
      isLoading={isLoading}
      key={`action-${message.id}`}
      message={message}
      onEdit={onEdit ? () => onEdit(message) : undefined}
      vote={vote}
    />
  );

  const content = isThinking ? (
    <WaitingText />
  ) : (
    <>
      {attachments}
      {parts}
      {actions}
    </>
  );

  return (
    <div
      className={cn(
        "group/message w-full",
        isAssistant
          ? "animate-[fade-in_0.2s_ease_both]"
          : "animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)]"
      )}
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn(
          isUser ? "flex flex-col items-end gap-2" : "flex items-start gap-3"
        )}
      >
        {isAssistant && (
          <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-muted/80 to-muted text-muted-foreground ring-1 ring-border/40 shadow-sm">
              <SparklesIcon size={13} />
            </div>
          </div>
        )}
        {isAssistant ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">{content}</div>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

export const PreviewMessage = PurePreviewMessage;

export const ThinkingMessage = () => (
  <div
    className="group/message w-full animate-[fade-in_0.2s_ease_both]"
    data-role="assistant"
    data-testid="message-assistant-loading"
  >
    <div className="flex items-start gap-3">
      <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
        <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
          <SparklesIcon size={13} />
        </div>
      </div>

      <WaitingText />
    </div>
  </div>
);
