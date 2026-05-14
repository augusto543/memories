"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function TagsInput({
  value,
  onChange,
  suggestions = [],
  max = 20,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  max?: number;
}) {
  const [draft, setDraft] = React.useState("");

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = value.some(
      (v) => v.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return;
    if (value.length >= max) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  function remove(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value[value.length - 1]!);
    }
  }

  const filteredSuggestions = suggestions
    .filter(
      (s) =>
        s.toLowerCase().includes(draft.toLowerCase()) &&
        !value.some((v) => v.toLowerCase() === s.toLowerCase()),
    )
    .slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="gap-1 pr-1 font-normal"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => remove(tag)}
              className="rounded-full p-0.5 hover:bg-foreground/10"
              aria-label={`Remover ${tag}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && add(draft)}
          placeholder={
            value.length === 0 ? "ex: jantar, aniversário" : ""
          }
          className="h-7 min-w-[120px] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </div>

      {draft && filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs hover:bg-muted/70"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Enter ou vírgula para adicionar. {value.length}/{max}
      </p>
    </div>
  );
}
