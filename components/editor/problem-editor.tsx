"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  EditorLanguage,
  SavedCodeState,
  toPersistedLanguage,
} from "@/lib/problem/saved-code";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type ProblemEditorProps = {
  problemInstanceId: string;
  initialCode: SavedCodeState;
};

export function ProblemEditor({ problemInstanceId, initialCode }: ProblemEditorProps) {
  const [code, setCode] = useState<SavedCodeState>(initialCode);
  const [language, setLanguage] = useState<EditorLanguage>(
    initialCode.activeLanguage === "PYTHON" ? "python" : "javascript",
  );
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const currentCode = useMemo(
    () => (language === "python" ? code.python : code.javascript),
    [code.javascript, code.python, language],
  );

  const save = () => {
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/problem-instances/${problemInstanceId}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            javascript: code.javascript,
            python: code.python,
            activeLanguage: toPersistedLanguage(language),
          }),
        });

        if (!response.ok) throw new Error("Failed to save code");
        setMessage("Saved");
      } catch {
        setMessage("Save failed");
      }
    });
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLanguage("javascript")}
            className={`rounded px-3 py-1 text-xs ${
              language === "javascript"
                ? "bg-white text-black"
                : "bg-neutral-800 text-neutral-200"
            }`}
          >
            JavaScript
          </button>
          <button
            type="button"
            onClick={() => setLanguage("python")}
            className={`rounded px-3 py-1 text-xs ${
              language === "python" ? "bg-white text-black" : "bg-neutral-800 text-neutral-200"
            }`}
          >
            Python
          </button>
        </div>
        <div className="flex items-center gap-3">
          {message ? <p className="text-xs text-neutral-400">{message}</p> : null}
          <button
            type="button"
            disabled={isPending}
            onClick={save}
            className="rounded bg-cyan-300 px-3 py-1 text-xs font-medium text-black disabled:opacity-70"
          >
            {isPending ? "Saving..." : "Save Code"}
          </button>
        </div>
      </div>
      <MonacoEditor
        theme="vs-dark"
        language={language}
        value={currentCode}
        height="420px"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
          scrollBeyondLastLine: false,
        }}
        onChange={(value) => {
          const next = value ?? "";
          setCode((previous) =>
            language === "python"
              ? { ...previous, python: next }
              : { ...previous, javascript: next },
          );
          setMessage("");
        }}
      />
    </div>
  );
}
