"use client";

import {
  KeyboardEvent,
  useState,
} from "react";

import {
  CornerDownLeft,
  Loader2,
} from "lucide-react";

interface TerminalInputProps {
  disabled?: boolean;

  placeholder?: string;

  onExecute?(
    command: string
  ): Promise<void> | void;
}

export default function TerminalInput({
  disabled = false,
  placeholder = "Type a command...",
  onExecute,
}: TerminalInputProps) {
  const [
    command,
    setCommand,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function execute() {
    const value =
      command.trim();

    if (
      !value ||
      loading ||
      disabled
    ) {
      return;
    }

    try {
      setLoading(true);

      await onExecute?.(
        value
      );

      setCommand("");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(
    e: KeyboardEvent<HTMLInputElement>
  ) {
    if (
      e.key === "Enter"
    ) {
      e.preventDefault();

      execute();
    }
  }

  return (
    <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-950 px-4 py-3">
      <span className="select-none font-mono text-sm font-semibold text-green-400">
        ❯
      </span>

      <input
        value={command}
        disabled={
          disabled ||
          loading
        }
        placeholder={
          placeholder
        }
        onChange={(e) =>
          setCommand(
            e.target.value
          )
        }
        onKeyDown={
          onKeyDown
        }
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        className="flex-1 bg-transparent font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
      />

      <button
        onClick={execute}
        disabled={
          disabled ||
          loading ||
          !command.trim()
        }
        className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
        ) : (
          <CornerDownLeft className="h-4 w-4 text-zinc-300" />
        )}
      </button>
    </div>
  );
}