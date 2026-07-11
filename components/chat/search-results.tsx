"use client";

import { ChevronDownIcon, ExternalLinkIcon, SearchIcon } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface SearchResult {
  snippet: string;
  title: string;
  url: string;
}

function PureSearchResults({
  query,
  results,
}: {
  query: string;
  results: SearchResult[];
}) {
  const [expanded, setExpanded] = useState(true);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/40 bg-card/50">
      {/* Header */}
      <button
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
        onClick={toggleExpanded}
        type="button"
      >
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-md bg-blue-500/10">
            <SearchIcon className="size-3 text-blue-500" />
          </div>
          <span className="text-[12px] font-medium text-foreground/80">
            Search results for &quot;{query}&quot;
          </span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {results.length}
          </span>
        </div>
        <ChevronDownIcon
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            !expanded && "-rotate-90"
          )}
        />
      </button>

      {/* Results */}
      {expanded ? (
        <div className="border-t border-border/20">
          {results.map((result) => (
            <a
              className={cn(
                "flex flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-muted/20"
              )}
              href={result.url}
              key={result.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium text-foreground/90 line-clamp-1">
                  {result.title}
                </span>
                <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground/40" />
              </div>
              <span className="text-[11px] text-muted-foreground/50 line-clamp-1">
                {new URL(result.url).hostname}
              </span>
              <span className="text-[12px] leading-relaxed text-muted-foreground/70 line-clamp-2">
                {result.snippet}
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const SearchResults = memo(PureSearchResults);
