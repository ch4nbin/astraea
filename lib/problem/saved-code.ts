export type EditorLanguage = "javascript" | "python";
export type PersistedLanguage = "JAVASCRIPT" | "PYTHON";

export type SavedCodeState = {
  javascript: string;
  python: string;
  activeLanguage: PersistedLanguage;
};

const DEFAULT_SAVED_CODE: SavedCodeState = {
  javascript: "// Write your JavaScript solution here\n",
  python: "# Write your Python solution here\n",
  activeLanguage: "JAVASCRIPT",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeSavedCode(value: unknown): SavedCodeState {
  if (!isRecord(value)) return DEFAULT_SAVED_CODE;

  const javascript =
    typeof value.javascript === "string"
      ? value.javascript
      : DEFAULT_SAVED_CODE.javascript;
  const python =
    typeof value.python === "string" ? value.python : DEFAULT_SAVED_CODE.python;
  const activeLanguage =
    value.activeLanguage === "PYTHON" || value.activeLanguage === "JAVASCRIPT"
      ? value.activeLanguage
      : DEFAULT_SAVED_CODE.activeLanguage;

  return {
    javascript,
    python,
    activeLanguage,
  };
}

export function toPersistedLanguage(language: EditorLanguage): PersistedLanguage {
  return language === "python" ? "PYTHON" : "JAVASCRIPT";
}

export function fromPersistedLanguage(language: PersistedLanguage): EditorLanguage {
  return language === "PYTHON" ? "python" : "javascript";
}
