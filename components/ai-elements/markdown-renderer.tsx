"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon, CodeIcon, ChevronDownIcon } from "lucide-react";
import { createHighlighter, type BundledLanguage, type ThemedToken } from "shiki";

// ============================================================================
// Inline Tokens
// ============================================================================

type InlineToken =
  | { type: "text"; content: string }
  | { type: "bold"; content: string }
  | { type: "italic"; content: string }
  | { type: "code"; content: string }
  | { type: "math"; content: string; display?: boolean }
  | { type: "link"; content: string; href: string };

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Match: inline code, bold, display math ($$...$$), inline LaTeX math ($...$), italic, links
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\$\$[^$]+\$\$|\$[^$]+\$|_(?!_)[^_]+_(?!_)|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("`")) {
      tokens.push({ type: "code", content: raw.slice(1, -1) });
    } else if (raw.startsWith("**")) {
      tokens.push({ type: "bold", content: raw.slice(2, -2) });
    } else if (raw.startsWith("$$")) {
      tokens.push({ type: "math", content: raw.slice(2, -2), display: true });
    } else if (raw.startsWith("$")) {
      tokens.push({ type: "math", content: raw.slice(1, -1) });
    } else if (raw.startsWith("[")) {
      tokens.push({ type: "link", content: match[2], href: match[3] });
    } else {
      tokens.push({ type: "italic", content: raw.slice(1, -1) });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", content: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: "text", content: text }];
}

// LaTeX to Unicode renderer — handles common math notation
function renderMath(tex: string): string {
  let result = tex;

  // Fractions: \frac{a}{b} → a/b
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");

  // Square roots: \sqrt{x} → √(x), \sqrt[n]{x} → ⁿ√(x)
  result = result.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, "$1√($2)");
  result = result.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");

  // Integrals with limits: \int_{a}^{b} → ∫ₐᵇ
  result = result.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, "∫$1$2");
  result = result.replace(/\\int_\{([^}]+)\}\^(\S)/g, "∫$1$2");
  result = result.replace(/\\int\^\{([^}]+)\}/g, "∫^$1");
  result = result.replace(/\\int_\{([^}]+)\}/g, "∫_$1");
  result = result.replace(/\\int/g, "∫");

  // Sums with limits: \sum_{a}^{b} → Σₐᵇ
  result = result.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, "Σ$1$2");
  result = result.replace(/\\sum_\{([^}]+)\}\^(\S)/g, "Σ$1$2");
  result = result.replace(/\\sum\^\{([^}]+)\}/g, "Σ^$1");
  result = result.replace(/\\sum_\{([^}]+)\}/g, "Σ_$1");
  result = result.replace(/\\sum/g, "Σ");

  // Products: \prod_{a}^{b} → Πₐᵇ
  result = result.replace(/\\prod_\{([^}]+)\}\^\{([^}]+)\}/g, "Π$1$2");
  result = result.replace(/\\prod/g, "Π");

  // Limits: \lim_{x→a} → lim(x→a)
  result = result.replace(/\\lim_\{([^}]+)\}/g, "lim($1)");
  result = result.replace(/\\lim/g, "lim");

  // Subscripts: x_{n} → xₙ (single char)
  result = result.replace(/([a-zA-Z0-9])_\{([^}]{1,3})\}/g, "$1₍$2₎");
  result = result.replace(/([a-zA-Z0-9])_(\w)/g, "$1_$2");

  // Superscripts: x^{n} → xⁿ (single char)
  result = result.replace(/([a-zA-Z0-9])\^\{([^}]{1,3})\}/g, "$1⁽$2⁾");
  result = result.replace(/([a-zA-Z0-9])\^(\w)/g, "$1^$2");

  // Operators
  result = result.replace(/\\sin/g, "sin");
  result = result.replace(/\\cos/g, "cos");
  result = result.replace(/\\tan/g, "tan");
  result = result.replace(/\\sec/g, "sec");
  result = result.replace(/\\csc/g, "csc");
  result = result.replace(/\\cot/g, "cot");
  result = result.replace(/\\arcsin/g, "arcsin");
  result = result.replace(/\\arccos/g, "arccos");
  result = result.replace(/\\arctan/g, "arctan");
  result = result.replace(/\\ln/g, "ln");
  result = result.replace(/\\log/g, "log");
  result = result.replace(/\\exp/g, "exp");
  result = result.replace(/\\det/g, "det");
  result = result.replace(/\\gcd/g, "gcd");
  result = result.replace(/\\max/g, "max");
  result = result.replace(/\\min/g, "min");
  result = result.replace(/\\sup/g, "sup");
  result = result.replace(/\\inf/g, "inf");
  result = result.replace(/\\mod/g, "mod");
  result = result.replace(/\\partial/g, "∂");
  result = result.replace(/\\nabla/g, "∇");
  result = result.replace(/\\forall/g, "∀");
  result = result.replace(/\\exists/g, "∃");
  result = result.replace(/\\in/g, "∈");
  result = result.replace(/\\notin/g, "∉");
  result = result.replace(/\\subset/g, "⊂");
  result = result.replace(/\\supset/g, "⊃");
  result = result.replace(/\\subseteq/g, "⊆");
  result = result.replace(/\\supseteq/g, "⊇");
  result = result.replace(/\\cup/g, "∪");
  result = result.replace(/\\cap/g, "∩");
  result = result.replace(/\\emptyset/g, "∅");
  result = result.replace(/\\pm/g, "±");
  result = result.replace(/\\mp/g, "∓");
  result = result.replace(/\\times/g, "×");
  result = result.replace(/\\cdot/g, "·");
  result = result.replace(/\\div/g, "÷");
  result = result.replace(/\\leq/g, "≤");
  result = result.replace(/\\geq/g, "≥");
  result = result.replace(/\\neq/g, "≠");
  result = result.replace(/\\approx/g, "≈");
  result = result.replace(/\\equiv/g, "≡");
  result = result.replace(/\\sim/g, "∼");
  result = result.replace(/\\propto/g, "∝");
  result = result.replace(/\\infty/g, "∞");
  result = result.replace(/\\rightarrow/g, "→");
  result = result.replace(/\\leftarrow/g, "←");
  result = result.replace(/\\Rightarrow/g, "⇒");
  result = result.replace(/\\Leftarrow/g, "⇐");
  result = result.replace(/\\leftrightarrow/g, "↔");
  result = result.replace(/\\Leftrightarrow/g, "⇔");
  result = result.replace(/\\uparrow/g, "↑");
  result = result.replace(/\\downarrow/g, "↓");

  // Greek letters (lowercase)
  result = result.replace(/\\alpha/g, "α");
  result = result.replace(/\\beta/g, "β");
  result = result.replace(/\\gamma/g, "γ");
  result = result.replace(/\\delta/g, "δ");
  result = result.replace(/\\epsilon/g, "ε");
  result = result.replace(/\\varepsilon/g, "ε");
  result = result.replace(/\\zeta/g, "ζ");
  result = result.replace(/\\eta/g, "η");
  result = result.replace(/\\theta/g, "θ");
  result = result.replace(/\\vartheta/g, "ϑ");
  result = result.replace(/\\iota/g, "ι");
  result = result.replace(/\\kappa/g, "κ");
  result = result.replace(/\\lambda/g, "λ");
  result = result.replace(/\\mu/g, "μ");
  result = result.replace(/\\nu/g, "ν");
  result = result.replace(/\\xi/g, "ξ");
  result = result.replace(/\\pi/g, "π");
  result = result.replace(/\\varpi/g, "ϖ");
  result = result.replace(/\\rho/g, "ρ");
  result = result.replace(/\\varrho/g, "ϱ");
  result = result.replace(/\\sigma/g, "σ");
  result = result.replace(/\\varsigma/g, "ς");
  result = result.replace(/\\tau/g, "τ");
  result = result.replace(/\\upsilon/g, "υ");
  result = result.replace(/\\phi/g, "φ");
  result = result.replace(/\\varphi/g, "φ");
  result = result.replace(/\\chi/g, "χ");
  result = result.replace(/\\psi/g, "ψ");
  result = result.replace(/\\omega/g, "ω");

  // Greek letters (uppercase)
  result = result.replace(/\\Gamma/g, "Γ");
  result = result.replace(/\\Delta/g, "Δ");
  result = result.replace(/\\Theta/g, "Θ");
  result = result.replace(/\\Lambda/g, "Λ");
  result = result.replace(/\\Xi/g, "Ξ");
  result = result.replace(/\\Pi/g, "Π");
  result = result.replace(/\\Sigma/g, "Σ");
  result = result.replace(/\\Upsilon/g, "Υ");
  result = result.replace(/\\Phi/g, "Φ");
  result = result.replace(/\\Psi/g, "Ψ");
  result = result.replace(/\\Omega/g, "Ω");

  // Mathbb / mathcal (strip command, keep letter)
  result = result.replace(/\\mathbb\{([A-Z])\}/g, "$1");
  result = result.replace(/\\mathcal\{([A-Z])\}/g, "$1");
  result = result.replace(/\\mathbf\{([^}]+)\}/g, "$1");
  result = result.replace(/\\text\{([^}]+)\}/g, "$1");
  result = result.replace(/\\mathrm\{([^}]+)\}/g, "$1");

  // Spacing commands
  result = result.replace(/\\,/g, " ");
  result = result.replace(/\\;/g, " ");
  result = result.replace(/\\!/g, "");
  result = result.replace(/\\quad/g, "  ");
  result = result.replace(/\\qquad/g, "    ");

  // Braces
  result = result.replace(/\{([^}]+)\}/g, "$1");

  // Remaining backslash commands → strip backslash
  result = result.replace(/\\([a-zA-Z]+)/g, "$1");

  return result.trim();
}

function InlineText({ text }: { text: string }) {
  const tokens = useMemo(() => tokenizeInline(text), [text]);
  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case "bold":
            return (
              <strong className="font-semibold text-foreground" key={i}>
                {token.content}
              </strong>
            );
          case "italic":
            return (
              <em className="italic text-foreground/80" key={i}>
                {token.content}
              </em>
            );
          case "code":
            return (
              <code
                className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground/90 ring-1 ring-border/30"
                key={i}
              >
                {token.content}
              </code>
            );
          case "math":
            return (
              <code
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-[0.85em] ring-1 ring-border/20",
                  token.display
                    ? "mx-auto my-2 block w-fit bg-muted/30 text-sm"
                    : "bg-muted/40 italic text-foreground/80"
                )}
                key={i}
              >
                {renderMath(token.content)}
              </code>
            );
          case "link":
            return (
              <a
                className="text-blue-500 underline decoration-blue-500/30 underline-offset-2 transition-colors hover:text-blue-400 hover:decoration-blue-400/50"
                href={token.href}
                key={i}
                rel="noopener noreferrer"
                target="_blank"
              >
                {token.content}
              </a>
            );
          default:
            return <span key={i}>{token.content}</span>;
        }
      })}
    </>
  );
}

// ============================================================================
// Code Block with Syntax Highlighting
// ============================================================================

interface TokenizedCode {
  tokens: ThemedToken[][];
  fg: string;
  bg: string;
}

const highlighterCache = new Map<string, Promise<any>>();
const tokensCache = new Map<string, TokenizedCode>();

const getCacheKey = (code: string, lang: string) => `${lang}:${code.length}:${code.slice(0, 80)}`;

const createRawTokens = (code: string): TokenizedCode => ({
  bg: "transparent",
  fg: "inherit",
  tokens: code.split("\n").map((line) =>
    line === "" ? [] : [{ color: "inherit", content: line } as ThemedToken]
  ),
});

function useHighlight(code: string, language: string) {
  const rawTokens = useMemo(() => createRawTokens(code), [code]);
  const [tokenized, setTokenized] = useState<TokenizedCode>(rawTokens);

  useEffect(() => {
    const cacheKey = getCacheKey(code, language);
    const cached = tokensCache.get(cacheKey);
    if (cached) {
      setTokenized(cached);
      return;
    }

    let cancelled = false;

    const getHighlighter = async () => {
      if (!highlighterCache.has(language)) {
        highlighterCache.set(
          language,
          createHighlighter({ langs: [language], themes: ["github-light", "github-dark"] })
        );
      }
      const highlighter = await highlighterCache.get(language);
      if (cancelled) return;

      const langs = highlighter.getLoadedLanguages();
      const langToUse = langs.includes(language) ? language : "text";
      const result = highlighter.codeToTokens(code, {
        lang: langToUse,
        themes: { dark: "github-dark", light: "github-light" },
      });

      const tokenized: TokenizedCode = {
        bg: result.bg ?? "transparent",
        fg: result.fg ?? "inherit",
        tokens: result.tokens,
      };
      tokensCache.set(cacheKey, tokenized);
      if (!cancelled) setTokenized(tokenized);
    };

    getHighlighter().catch(() => {});
    return () => { cancelled = true; };
  }, [code, language]);

  return tokenized;
}

function CodeLine({ tokens }: { tokens: ThemedToken[] }) {
  if (tokens.length === 0) return "\n";
  return (
    <>
      {tokens.map((token, i) => (
        <span
          key={i}
          style={{
            color: token.color,
            fontStyle: token.fontStyle === 1 ? "italic" : undefined,
            fontWeight: token.fontStyle === 2 ? "bold" : undefined,
            ...token.htmlStyle,
          }}
        >
          {token.content}
        </span>
      ))}
    </>
  );
}

function CodeBlockDedicated({
  code,
  language,
  showLineNumbers = true,
}: {
  code: string;
  language: string;
  showLineNumbers?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const tokenized = useHighlight(code, language || "text");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [code]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const lineCount = tokenized.tokens.length;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/40 bg-[#0d1117] dark:bg-[#0d1117] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#161b22] px-4 py-2">
        <div className="flex items-center gap-2">
          <CodeIcon className="size-3.5 text-gray-400" />
          <span className="font-mono text-[11px] text-gray-400">{language || "code"}</span>
          <span className="text-[10px] text-gray-600">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            <ChevronDownIcon
              className={cn("size-3 transition-transform", !expanded && "-rotate-90")}
            />
          </button>
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
            onClick={handleCopy}
            type="button"
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-green-400" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Code Content */}
      {expanded && (
        <div className="overflow-x-auto">
          <pre className="m-0 p-4 font-mono text-[13px] leading-[1.6] text-[#c9d1d9]">
            <code>
              {tokenized.tokens.map((line, lineIdx) => (
                <div className="flex" key={lineIdx}>
                  {showLineNumbers && (
                    <span className="mr-4 inline-block w-8 select-none text-right text-gray-600">
                      {lineIdx + 1}
                    </span>
                  )}
                  <span className="flex-1">
                    <CodeLine tokens={line} />
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Block Parser
// ============================================================================

interface Block {
  type: "paragraph" | "heading" | "ul" | "ol" | "code-block" | "blockquote" | "hr" | "math-block";
  level?: number;
  items?: string[];
  content?: string;
  language?: string;
}

// Detect lines that look like headings even without # prefix
const HEADING_PATTERNS = [
  /^(Key (?:Points?|Takeaways?|Ideas?|Features?|Benefits?|Concepts?|Steps?|Highlights?)):\s*$/i,
  /^(Summary|Conclusion|Overview|Introduction|Background|Prerequisites|Requirements|Examples?|Usage|Installation|Setup|Configuration|Parameters|Arguments|Return Values?|Notes?|Warning|Tip|Important|FAQ|References?)\s*:?\s*$/i,
];

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (fenced)
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      let closed = false;
      i++;
      while (i < lines.length) {
        if (lines[i].trimStart().startsWith("```")) {
          closed = true;
          i++; // skip closing ```
          break;
        }
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: "code-block",
        content: codeLines.join("\n"),
        language: lang || undefined,
      });
      continue;
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Math block ($$...$$ display math)
    if (line.trimStart().startsWith("$$")) {
      const mathLines: string[] = [];
      i++;
      while (i < lines.length) {
        if (lines[i].trimStart().startsWith("$$")) {
          i++;
          break;
        }
        mathLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: "math-block",
        content: mathLines.join("\n"),
      });
      continue;
    }

    // Heading with # prefix
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // Detect heading-like lines (e.g. "Key Points:", "Summary:")
    const trimmedLine = line.trim();
    const isHeadingLike = HEADING_PATTERNS.some((p) => p.test(trimmedLine));
    if (isHeadingLike) {
      blocks.push({
        type: "heading",
        level: 3,
        content: trimmedLine.replace(/:$/, ""),
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join("\n") });
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^[\s]*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trimStart().startsWith("```") &&
      !lines[i].trimStart().startsWith("$$") &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !lines[i].startsWith("> ") &&
      !/^[\s]*[-*+]\s+/.test(lines[i]) &&
      !/^[\s]*\d+[.)]\s+/.test(lines[i]) &&
      !/^(\*{3,}|-{3,}|_{3,})\s*$/.test(lines[i].trim()) &&
      !HEADING_PATTERNS.some((p) => p.test(lines[i].trim()))
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", content: paragraphLines.join("\n") });
    }
  }

  return blocks;
}

// ============================================================================
// Block Renderer
// ============================================================================

function MarkdownBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;
      const sizeClass =
        block.level === 1
          ? "text-xl font-bold mt-6 mb-3"
          : block.level === 2
            ? "text-lg font-semibold mt-5 mb-2"
            : "text-[15px] font-semibold mt-5 mb-2";
      return (
        <Tag className={cn("text-foreground first:mt-0", sizeClass)}>
          <InlineText text={block.content ?? ""} />
        </Tag>
      );
    }
    case "ul":
      return (
        <ul className="my-2 ml-4 list-disc space-y-1.5 text-foreground/90 marker:text-muted-foreground/50">
          {block.items?.map((item, i) => (
            <li className="pl-1" key={i}>
              <InlineText text={item} />
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="my-2 ml-4 list-decimal space-y-1.5 text-foreground/90 marker:text-muted-foreground/50 marker:font-mono">
          {block.items?.map((item, i) => (
            <li className="pl-1" key={i}>
              <InlineText text={item} />
            </li>
          ))}
        </ol>
      );
    case "code-block":
      return (
        <CodeBlockDedicated
          code={block.content ?? ""}
          language={block.language || "text"}
        />
      );
    case "blockquote":
      return (
        <blockquote className="my-3 border-l-2 border-blue-500/40 bg-blue-500/5 py-1 pl-4 text-foreground/80 italic">
          <InlineText text={block.content ?? ""} />
        </blockquote>
      );
    case "hr":
      return <hr className="my-6 border-border/20" />;
    case "math-block":
      return (
        <div className="my-4 rounded-lg bg-muted/30 px-6 py-4 text-center font-mono text-sm text-foreground/80 ring-1 ring-border/20">
          {renderMath(block.content ?? "")}
        </div>
      );
    default:
      return (
        <p className="my-1.5 text-foreground leading-relaxed">
          <InlineText text={block.content ?? ""} />
        </p>
      );
  }
}

// ============================================================================
// Main Renderer
// ============================================================================

function PureMarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className={cn("text-[13px] leading-[1.65]", className)}>
      {blocks.map((block, i) => (
        <MarkdownBlock block={block} key={i} />
      ))}
    </div>
  );
}

export const MarkdownRenderer = memo(PureMarkdownRenderer);
