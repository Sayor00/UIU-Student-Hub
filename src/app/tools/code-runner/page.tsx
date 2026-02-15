/* ═══════════════════════════════════════════════════════════════
   Code Runner — Intelligent Code Simulation Engine
   Matches UIU-Student-Hub design: Tailwind + shadcn/ui + motion
   ═══════════════════════════════════════════════════════════════ */
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play, Pause, SkipForward, SkipBack, RotateCcw,
    Plus, X, Eye, Layers, Clock, Zap,
    FileCode, Activity, BarChart3, Cpu, HelpCircle, Terminal,
    Monitor, CornerDownLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { LANGUAGES, type Step, type FileTab, emptyDS, type LangDef, type Variable } from "./_lib/types";
import { EXAMPLES } from "./_lib/examples";
import { highlightCode, analyzeComplexity, analyzeCustomCode, instrumentCpp, type ComplexityResult, extractIdentifiers } from "./_lib/analyzer";
import { executeCode } from "./_lib/executor";
import {
    ArrayViz, LinkedListViz, StackViz, QueueViz,
    BSTViz, HashMapViz, GraphViz, HeapViz, ComplexityCurveChart,
} from "./_components/visualizations";

/* ── Language → file extension map ─────────────────────────────── */
const EXT: Record<string, string> = {
    python: ".py", javascript: ".js", typescript: ".ts", java: ".java",
    c: ".c", cpp: ".cpp", csharp: ".cs", go: ".go", rust: ".rs", kotlin: ".kt",
};

/* ── Suggestion Box ──────────────────────────────────────────── */
function SuggestionBox({
    suggestions, index, onSelect, position
}: {
    suggestions: string[]; index: number; onSelect: (val: string) => void; position: { top: number; left: number };
}) {
    const listRef = React.useRef<HTMLUListElement>(null);

    React.useEffect(() => {
        if (listRef.current) {
            const el = listRef.current.children[index] as HTMLElement;
            if (el) el.scrollIntoView({ block: "nearest" });
        }
    }, [index]);

    if (suggestions.length === 0) return null;

    return (
        <ul ref={listRef}
            className="absolute z-[50] w-48 max-h-[160px] overflow-y-auto bg-popover/95 backdrop-blur-md border border-border shadow-xl rounded-md py-1"
            style={{ top: position.top + 24, left: position.left }} // 24px line height offset
        >
            {suggestions.map((s, i) => (
                <li key={s}
                    onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
                    className={`px-2 py-1 text-[11px] font-mono cursor-pointer flex items-center justify-between ${i === index ? "bg-primary text-primary-foreground" : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                >
                    {s}
                </li>
            ))}
        </ul>
    );
}

/* ── Code Editor ───────────────────────────────────────────────── */
function CodeEditor({
    code, language, activeLine, errorLines, onCodeChange,
}: {
    code: string; language: LangDef; activeLine: number | null;
    errorLines?: number[];
    onCodeChange: (c: string) => void;
}) {
    const lines = code.split("\n");
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const highlightRef = React.useRef<HTMLDivElement>(null);
    const gutterRef = React.useRef<HTMLDivElement>(null);
    const [suggestions, setSuggestions] = React.useState<string[]>([]);
    const [sIndex, setSIndex] = React.useState(0);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [caretPos, setCaretPos] = React.useState({ top: 0, left: 0 });
    const matchRef = React.useRef("");
    const [localIdentifiers, setLocalIdentifiers] = React.useState<string[]>([]);

    const highlighted = React.useMemo(() =>
        highlightCode(code, language.keywords, language.types, language.builtins, language.commentLine),
        [code, language]
    );

    const syncScroll = () => {
        if (textareaRef.current && highlightRef.current && gutterRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
            gutterRef.current.scrollTop = textareaRef.current.scrollTop;
            setShowSuggestions(false); // Hide on scroll
        }
    };

    // Extract local identifiers (debounced)
    React.useEffect(() => {
        const timer = setTimeout(() => {
            const ids = extractIdentifiers(code, language.id);
            setLocalIdentifiers(ids);
        }, 500);
        return () => clearTimeout(timer);
    }, [code, language.id]);

    // Caret measurement helper
    const updateCaretAndSuggestions = (val: string, selectionEnd: number) => {
        const linesBefore = val.substring(0, selectionEnd).split("\n");
        const currentLineIndex = linesBefore.length - 1;
        const currentLine = linesBefore[currentLineIndex];
        const lineOffset = linesBefore.slice(0, currentLineIndex).reduce((acc, l) => acc + l.length + 1, 0);
        const colIndex = selectionEnd - lineOffset;

        // Find word before cursor
        const match = currentLine.substring(0, colIndex).match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);

        if (match) {
            const word = match[1];
            matchRef.current = word;

            // Filter suggestions
            const allItems = Array.from(new Set([
                ...language.keywords,
                ...language.types,
                ...language.builtins,
                ...localIdentifiers // Add local variables/functions
            ]));

            const filtered = allItems.filter(k => k.startsWith(word) && k !== word);

            if (filtered.length > 0) {
                setSuggestions(filtered);
                setSIndex(0);
                setShowSuggestions(true);

                // Measure caret position
                // We need a mirror element to measure
                if (textareaRef.current) {
                    const dummy = document.createElement("div");
                    const styles = {
                        fontFamily: "monospace", fontSize: "13px", lineHeight: "22px",
                        padding: "8px 12px", whiteSpace: "pre", overflow: "hidden",
                        position: "absolute", visibility: "hidden"
                    };
                    Object.assign(dummy.style, styles);
                    dummy.textContent = val.substring(0, selectionEnd);
                    const span = document.createElement("span");
                    span.textContent = "|";
                    dummy.appendChild(span);
                    document.body.appendChild(dummy);

                    const rect = span.getBoundingClientRect();
                    const dummyRect = dummy.getBoundingClientRect();
                    // Adjust by scroll
                    const tx = textareaRef.current!;
                    const top = rect.top - dummyRect.top - tx.scrollTop;
                    const left = rect.left - dummyRect.left - tx.scrollLeft;

                    setCaretPos({ top: top + 8, left: left + 12 }); // +padding
                    document.body.removeChild(dummy);
                    return;
                }
            }
        }
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const { key } = e;
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const val = target.value;

        // Autocomplete Navigation
        if (showSuggestions) {
            if (key === "ArrowUp") {
                e.preventDefault();
                setSIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
                return;
            }
            if (key === "ArrowDown") {
                e.preventDefault();
                setSIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
                return;
            }
            if (key === "Tab" || key === "Enter") {
                e.preventDefault();
                const word = matchRef.current;
                const sug = suggestions[sIndex];
                const inserted = sug.substring(word.length);
                document.execCommand("insertText", false, inserted);
                setShowSuggestions(false);
                return;
            }
            if (key === "Escape") {
                e.preventDefault();
                setShowSuggestions(false);
                return;
            }
        }

        if (key === "Tab") {
            e.preventDefault();
            document.execCommand("insertText", false, "    ");
        } else if (key === "Enter") {
            e.preventDefault();
            const linesBefore = val.substring(0, start).split("\n");
            const lastLine = linesBefore[linesBefore.length - 1];
            const indent = lastLine.match(/^(\s*)/)?.[1] || "";
            const trimmed = lastLine.trim();
            const isBlockStart = (trimmed.endsWith(":") || trimmed.endsWith("{") || trimmed.endsWith("("));

            if (val[start - 1] === "{" && val[end] === "}") {
                // Smart Enter for {|}
                document.execCommand("insertText", false, "\n" + indent + "    ");
                document.execCommand("insertText", false, "\n" + indent);
                // Move cursor to middle line
                const newPos = start + 1 + indent.length + 4;
                target.selectionStart = target.selectionEnd = newPos;
            } else {
                const extra = isBlockStart ? "    " : "";
                document.execCommand("insertText", false, "\n" + indent + extra);
            }
        } else if (["(", "[", "{", "<", '"', "'"].includes(key)) {
            e.preventDefault();
            const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}", "<": ">", '"': '"', "'": "'" };
            document.execCommand("insertText", false, key + pairs[key]);
            target.selectionStart = target.selectionEnd = start + 1;
        } else if ([")", "]", "}", ">", '"', "'"].includes(key)) {
            if (val[start] === key) {
                e.preventDefault();
                target.selectionStart = target.selectionEnd = start + 1;
            }
        }

        // Defer caret update for non-nav keys?
        // Actually onChange handles it.
    };

    // Need to update suggestions on input
    const onInput = (e: React.BaseSyntheticEvent) => {
        const target = e.target as HTMLTextAreaElement;
        onCodeChange(target.value);
        updateCaretAndSuggestions(target.value, target.selectionStart);
    };

    React.useEffect(() => {
        if (activeLine !== null && highlightRef.current) {
            const lineEl = highlightRef.current.querySelector(`[data-line="${activeLine}"]`);
            lineEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [activeLine]);

    return (
        <div className="relative flex flex-1 overflow-hidden bg-[hsl(var(--card))]/40">
            {/* Gutter */}
            <div ref={gutterRef} className="w-11 shrink-0 overflow-hidden border-r border-border/40 bg-muted/30 pt-2 select-none">
                {lines.map((_, i) => {
                    const isError = errorLines?.includes(i);
                    return (
                        <div key={i} className={`h-[22px] leading-[22px] pr-2.5 text-right text-[11px] font-mono transition-colors duration-150 ${isError ? "text-red-400 font-bold bg-red-500/15" : activeLine === i ? "text-primary font-bold bg-primary/10" : "text-muted-foreground/40"
                            }`}>{i + 1}</div>
                    );
                })}
            </div>
            {/* Highlight overlay */}
            <div ref={highlightRef} className="absolute top-0 left-11 right-0 bottom-0 overflow-auto pointer-events-none pt-2 pl-3 z-[1]">
                {highlighted.map((line: string, i: number) => {
                    const isError = errorLines?.includes(i);
                    return (
                        <div key={i} data-line={i} className={`h-[22px] leading-[22px] text-[13px] font-mono whitespace-pre pl-2 -ml-3 transition-all duration-150 ${isError
                            ? "bg-red-500/15 border-l-[4px] border-l-red-500"
                            : activeLine === i
                                ? "bg-primary/20 border-l-[4px] border-l-primary shadow-[0_1px_6px_rgba(0,0,0,0.1)]"
                                : "border-l-[4px] border-l-transparent"
                            }`} dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }} />
                    );
                })}
            </div>
            {/* Textarea input */}
            {/* Textarea input */}
            <textarea
                ref={textareaRef}
                value={code}
                onChange={onInput}
                onKeyDown={handleKeyDown}
                onScroll={syncScroll}
                onClick={() => setShowSuggestions(false)}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                className="flex-1 bg-transparent text-transparent caret-primary border-none outline-none resize-none font-mono text-[13px] leading-[22px] p-[8px_12px] z-[2] relative whitespace-pre overflow-auto selection:bg-primary/30 selection:text-transparent"
                style={{ tabSize: 4 }}
            />

            {showSuggestions && (
                <SuggestionBox
                    suggestions={suggestions}
                    index={sIndex}
                    onSelect={(s) => {
                        const word = matchRef.current;
                        const inserted = s.substring(word.length);
                        if (textareaRef.current) {
                            textareaRef.current.focus();
                            document.execCommand("insertText", false, inserted);
                            setShowSuggestions(false);
                        }
                    }}
                    position={caretPos}
                />
            )}
        </div>
    );
}

/* ── Variable Watch ────────────────────────────────────────────── */
function VariableWatch({ variables }: { variables: Variable[] }) {
    if (variables.length === 0) return (
        <div className="text-[11px] text-muted-foreground text-center py-2">No variables</div>
    );
    return (
        <table className="w-full text-[11px]">
            <thead>
                <tr className="border-b border-border/50">
                    <th className="text-left py-1 px-2 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-1 px-2 text-muted-foreground font-medium">Value</th>
                    <th className="text-left py-1 px-2 text-muted-foreground font-medium">Type</th>
                </tr>
            </thead>
            <tbody>
                {variables.map((vr, i) => (
                    <tr key={i} className={`transition-colors ${vr.changed ? "bg-primary/5" : ""}`}>
                        <td className="py-0.5 px-2 font-mono text-primary">{vr.name}</td>
                        <td className={`py-0.5 px-2 font-mono max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap ${vr.changed ? "text-orange-500 font-semibold" : "text-foreground"
                            }`}>{vr.value}</td>
                        <td className="py-0.5 px-2 text-muted-foreground">{vr.type}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/* ── Call Stack ─────────────────────────────────────────────────── */
function CallStackPanel({ stack }: { stack: string[] }) {
    if (stack.length === 0) return (
        <div className="text-[11px] text-muted-foreground text-center py-2">Empty</div>
    );
    return (
        <div className="space-y-px">
            <AnimatePresence>
                {[...stack].reverse().map((frame, i) => (
                    <motion.div key={`${i}-${frame}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        className={`text-[11px] font-mono py-0.5 px-2 rounded-sm transition-colors ${i === 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-l-2 border-l-emerald-500"
                            : "text-foreground/70 border-l-2 border-l-border"
                            }`}>
                        {i === 0 ? "► " : "  "}{frame}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

/* ── Execution Log ─────────────────────────────────────────────── */
function ExecutionLog({ logs }: { logs: string[] }) {
    const bottomRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="font-mono text-[10px] space-y-1 h-full overflow-auto">
            {logs.length === 0 ? (
                <div className="text-muted-foreground/50 italic py-2 text-center">Ready to execute</div>
            ) : (
                logs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                        <span className="text-muted-foreground select-none opacity-50 w-6 text-right shrink-0">
                            {(i + 1).toString().padStart(3, "0")}
                        </span>
                        <span className={log.includes("Error") ? "text-destructive" : "text-foreground"}>
                            {log}
                        </span>
                    </div>
                ))
            )}
            <div ref={bottomRef} />
        </div>
    );
}

/* ── Complexity Analysis ───────────────────────────────────────── */
function ComplexityPanel({ result }: { result: ComplexityResult }) {
    return (
        <>
            {/* Time / Space pills */}
            <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 text-center">
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Time</p>
                    <p className="text-sm font-bold text-primary font-mono">{result.time}</p>
                </div>
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-2 text-center">
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Space</p>
                    <p className="text-sm font-bold text-violet-600 dark:text-violet-400 font-mono">{result.space}</p>
                </div>
            </div>

            {/* Best / Avg / Worst */}
            <div className="grid grid-cols-3 gap-1 mb-2">
                {[
                    { label: "Best", val: result.bestCase, cls: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Avg", val: result.averageCase, cls: "text-amber-600 dark:text-amber-400" },
                    { label: "Worst", val: result.worstCase, cls: "text-red-600 dark:text-red-400" },
                ].map(c => (
                    <div key={c.label} className="rounded border bg-muted/30 p-1.5 text-center">
                        <p className="text-[8px] text-muted-foreground font-medium uppercase">{c.label}</p>
                        <p className={`text-[11px] font-semibold font-mono ${c.cls}`}>{c.val}</p>
                    </div>
                ))}
            </div>

            {/* Derivation */}
            <div className="mb-2">
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Derivation</p>
                {result.breakdown.map((b, i) => (
                    <p key={i} className="text-[11px] font-mono py-px pl-2 ml-0.5 border-l-2 border-border text-foreground/70">
                        {b}
                    </p>
                ))}
            </div>

            <div className="flex justify-center">
                <ComplexityCurveChart highlightIndex={result.curveIndex} />
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function CodeRunnerPage() {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    // ── Files & editor
    const [tabs, setTabs] = React.useState<FileTab[]>([
        { id: "1", name: "main.py", language: "python", code: "" },
    ]);
    const [activeTabId, setActiveTabId] = React.useState("1");
    const [editingTabId, setEditingTabId] = React.useState<string | null>(null);
    const [editName, setEditName] = React.useState("");

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
    const langDef = LANGUAGES.find(l => l.id === activeTab.language) || LANGUAGES[0];

    // ── Simulation
    const [steps, setSteps] = React.useState<Step[]>([]);
    const [stepIndex, setStepIndex] = React.useState(-1);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [speed, setSpeed] = React.useState(1.5);
    const [logs, setLogs] = React.useState<string[]>([]);
    const [output, setOutput] = React.useState<string[]>([]);
    const [inputs, setInputs] = React.useState<string[]>([]);
    const [isWaitingForInput, setIsWaitingForInput] = React.useState(false);
    const [simulationIsWaiting, setSimulationIsWaiting] = React.useState(false);
    const [isCompiling, setIsCompiling] = React.useState(false);
    const [compileError, setCompileError] = React.useState<string | null>(null);
    const [realOutput, setRealOutput] = React.useState<string[] | null>(null);
    const [errorLines, setErrorLines] = React.useState<number[]>([]);
    const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);



    // ── Example
    const [selectedExample, setSelectedExample] = React.useState("");

    // ── Right tab
    const [rightTab, setRightTab] = React.useState<"viz" | "complexity">("viz");

    // ── Derived
    const currentStep: Step | null = stepIndex >= 0 && stepIndex < steps.length ? steps[stepIndex] : null;
    const complexity = React.useMemo(() => analyzeComplexity(activeTab.code), [activeTab.code]);

    // ── Filtered examples by language
    const filteredExamples = React.useMemo(() =>
        EXAMPLES.filter(e => e.language === activeTab.language),
        [activeTab.language]
    );

    // ── Tab helpers
    const updateTab = React.useCallback((id: string, patch: Partial<FileTab>) => {
        setTabs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    }, []);

    const addTab = React.useCallback(() => {
        const id = Date.now().toString();
        const ext = EXT[activeTab.language] || ".txt";
        setTabs(prev => [...prev, {
            id, name: `file${prev.length + 1}${ext}`, language: activeTab.language, code: ""
        }]);
        setActiveTabId(id);
    }, [activeTab.language]);

    const removeTab = React.useCallback((id: string) => {
        setTabs(prev => {
            const next = prev.filter(t => t.id !== id);
            if (next.length === 0) return prev;
            if (activeTabId === id) setActiveTabId(next[0].id);
            return next;
        });
    }, [activeTabId]);

    const renameTab = React.useCallback((id: string, name: string) => {
        updateTab(id, { name: name || tabs.find(t => t.id === id)?.name || "untitled" });
        setEditingTabId(null);
    }, [updateTab, tabs]);

    // ── Language change → update extension, reset code, clear simulation
    const handleLanguageChange = React.useCallback((lang: string) => {
        const ext = EXT[lang] || ".txt";
        const currentName = activeTab.name;
        const baseName = currentName.replace(/\.[^.]+$/, "");
        updateTab(activeTabId, { language: lang, code: "", name: `${baseName}${ext}` });
        setSelectedExample("");
        setSteps([]);
        setStepIndex(-1);
        setLogs([]);
        setOutput([]);
        setInputs([]);
        setIsWaitingForInput(false);
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, [activeTabId, activeTab.name, updateTab]);

    // ── Load example → sets code + language stays same, update filename
    const loadExample = React.useCallback((exId: string) => {
        const ex = EXAMPLES.find(e => e.id === exId);
        if (!ex) return;
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setSelectedExample(exId);
        const ext = EXT[ex.language] || ".py";
        // Use a clean name derived from the example label
        const cleanName = ex.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, "");
        updateTab(activeTabId, {
            code: ex.code, language: ex.language, name: `${cleanName}${ext}`
        });
        const newSteps = ex.generateSteps();
        setSteps(newSteps);
        setStepIndex(-1);
        setLogs([]);
        setOutput([]);
        setInputs([]);
        setIsWaitingForInput(false);
    }, [activeTabId, updateTab]);

    // ── Simulation controls
    const stopPlayback = React.useCallback(() => {
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
    }, []);

    // Parse error line numbers from Piston compile error output
    const parseErrorLines = React.useCallback((errorText: string): number[] => {
        const lineNums: number[] = [];
        // Match patterns like "file.cpp:23:30: error:" or ":23: error"
        const regex = /(?:^|\n)\S*?:(\d+):\d*:?\s*error/gi;
        let match;
        while ((match = regex.exec(errorText)) !== null) {
            const lineNum = parseInt(match[1]) - 1; // Convert to 0-indexed
            if (!lineNums.includes(lineNum)) lineNums.push(lineNum);
        }
        return lineNums;
    }, []);

    const runSimulation = React.useCallback(async (inputToAppend?: string) => {
        stopPlayback();
        setCompileError(null);
        setErrorLines([]);
        const ex = EXAMPLES.find(e => e.code.trim() === activeTab.code.trim());
        let newSteps: Step[];
        let isWaiting = false;

        if (ex) {
            // Built-in example — use pre-defined steps
            newSteps = ex.generateSteps();
            setSteps(newSteps);
            setStepIndex(0);
            setSimulationIsWaiting(false);
            setIsPlaying(true);
            return;
        }

        // ── Split space-separated input into multiple values (like real cin) ──
        const newValues = inputToAppend !== undefined
            ? inputToAppend.trim().split(/\s+/).filter(v => v.length > 0)
            : [];
        const currentInputs = inputToAppend !== undefined ? [...inputs, ...newValues] : [];
        setInputs(currentInputs);
        const stdinStr = currentInputs.join("\n");

        newSteps = [];
        const analysisResult = analyzeCustomCode(activeTab.code, activeTab.language, currentInputs);
        isWaiting = !!analysisResult.isWaitingForInput;
        newSteps = analysisResult.steps;

        // 2. Execute via Piston API — but ONLY when all inputs are provided
        //    If still waiting for input, use static analyzer output instead.
        if (!isWaiting) {
            setIsCompiling(true);
            try {
                // A. Run ORIGINAL code first (for clean output and error checking)
                const execResult = await executeCode(activeTab.code, activeTab.language, stdinStr);

                const errorOutput = (execResult.stderr || execResult.compilationError || "")
                    .split("\n").filter(l => l.trim());

                if (execResult.exitCode !== 0 && errorOutput.length > 0) {
                    const errStr = errorOutput.join("\n");
                    setCompileError(errStr);
                    // Parse and highlight error lines
                    const errLns = parseErrorLines(errStr);
                    setErrorLines(errLns);
                    // Stop — don't proceed to stepping when there's a compile error
                    setIsCompiling(false);
                    setSteps([]);
                    setStepIndex(-1);
                    setIsPlaying(false);
                    setSimulationIsWaiting(false);
                    return;
                }

                // Store Piston output separately — used at final step only
                const pistonLines = execResult.stdout
                    ? execResult.stdout.split("\n").filter((l, i, a) => i < a.length - 1 || l !== "")
                    : [];
                setRealOutput(pistonLines);

                // B. If C++, run INSTRUMENTED code to get incremental steps
                if (activeTab.language === "cpp") {
                    const instrumented = instrumentCpp(activeTab.code);
                    const instExec = await executeCode(instrumented, "cpp", stdinStr);

                    if (instExec.exitCode === 0 && instExec.stdout) {
                        // Split by our marker
                        // Marker is |_PST_|
                        // Output: "Hi|_PST_|Line2|_PST_|..."
                        const chunks = instExec.stdout.split("|_PST_|");
                        // Re-run analysis with chunks
                        const smartResult = analyzeCustomCode(activeTab.code, "cpp", currentInputs, chunks);
                        newSteps = smartResult.steps;
                    }
                }

            } catch {
                setRealOutput(null);
            } finally {
                setIsCompiling(false);
            }
        } else {
            // Still waiting for input — no Piston output yet
            setRealOutput(null);
        }

        const prevStepCount = steps.length;
        setSteps(newSteps);

        if (inputToAppend !== undefined && prevStepCount > 0) {
            // Continue from the cin step where input was just provided
            setStepIndex(Math.min(prevStepCount - 1, newSteps.length - 1));
        } else {
            setStepIndex(0);
        }
        setIsPlaying(true);

        setSimulationIsWaiting(isWaiting);
    }, [activeTab, stopPlayback, inputs, parseErrorLines]);

    // ── Instant Run: same as simulation but skip straight to the final step ──
    const skipToEndRef = React.useRef(false);

    const instantRun = React.useCallback(() => {
        skipToEndRef.current = true;
        runSimulation();
    }, [runSimulation]);

    const reset = React.useCallback(() => {
        stopPlayback();
        setSteps([]);
        setStepIndex(-1);
        setLogs([]);
        setOutput([]);
        setInputs([]);
        setIsWaitingForInput(false);
        setSimulationIsWaiting(false);
        setCompileError(null);
        setIsCompiling(false);
        setRealOutput(null);
        setErrorLines([]);
        skipToEndRef.current = false;
    }, [stopPlayback]);

    const stepForward = React.useCallback(() => {
        setStepIndex(prev => {
            const next = Math.min(prev + 1, steps.length - 1);
            if (next >= steps.length - 1) setIsPlaying(false);
            return next;
        });
    }, [steps]);

    const stepBack = React.useCallback(() => {
        setStepIndex(prev => Math.max(prev - 1, 0));
    }, []);

    // ── Autoplay
    React.useEffect(() => {
        if (isPlaying && steps.length > 0) {
            // Instant mode: skip to last step immediately
            if (skipToEndRef.current) {
                setStepIndex(steps.length - 1);
                setIsPlaying(false);
                return;
            }
            intervalRef.current = setInterval(() => {
                setStepIndex(prev => {
                    const next = prev + 1;
                    if (next >= steps.length) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return next;
                });
            }, 700 / speed);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isPlaying, speed, steps, simulationIsWaiting]);

    // ── Update State on Step Change (Time Travel)
    React.useEffect(() => {
        if (steps.length === 0 || stepIndex < 0) return;
        // Clamp stepIndex to valid range
        if (stepIndex >= steps.length) {
            setStepIndex(steps.length - 1);
            return;
        }

        const currentStep = steps[stepIndex];

        // Logs
        const newLogs = steps.slice(0, stepIndex + 1).map(s => s.logMessage);

        // Output — always use static analyzer output (has proper echo + newlines)
        if (currentStep.output) {
            setOutput(currentStep.output);
        }

        // Waiting state
        // Only wait if we are at the very last step AND the simulation requires input
        const atEnd = stepIndex === steps.length - 1;
        if (atEnd && simulationIsWaiting) {
            setIsWaitingForInput(true);
            newLogs.push("Waiting for input...");
        } else {
            setIsWaitingForInput(false);
        }

        setLogs(newLogs);

    }, [stepIndex, steps, simulationIsWaiting]);

    // ── Keyboard shortcuts
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.altKey && e.key === "Enter") { e.preventDefault(); instantRun(); }
            else if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); skipToEndRef.current = false; runSimulation(); }
            if (e.ctrlKey && e.key === "n") { e.preventDefault(); addTab(); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [runSimulation, instantRun, addTab]);

    // ── Render visualizations (supports multiple simultaneous data structures)
    const renderVisualizations = () => {
        if (!currentStep) return (
            <div className="text-[11px] text-muted-foreground text-center py-8 px-4">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Run code to see data structure visualizations
            </div>
        );
        const ds = currentStep.ds;
        const vizs: React.ReactNode[] = [];
        ds.arrays.forEach((a, i) => vizs.push(<div key={`arr-${i}`} className="mb-3"><div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Array: {a.name}</div><ArrayViz state={a} /></div>));
        ds.linkedLists.forEach((l, i) => vizs.push(<div key={`ll-${i}`} className="mb-3"><div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Linked List: {l.name}</div><LinkedListViz state={l} /></div>));
        ds.stacks.forEach((s, i) => vizs.push(<div key={`stk-${i}`} className="mb-3"><div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Stack: {s.name}</div><StackViz state={s} /></div>));
        ds.queues.forEach((q, i) => vizs.push(<div key={`q-${i}`} className="mb-3"><div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Queue: {q.name}</div><QueueViz state={q} /></div>));
        ds.bsts.forEach((b, i) => vizs.push(<div key={`bst-${i}`} className="mb-3"><div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">BST: {b.name}</div><BSTViz state={b} /></div>));
        ds.hashMaps.forEach((h, i) => vizs.push(<div key={`hm-${i}`} className="mb-3"><div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">HashMap: {h.name}</div><HashMapViz state={h} /></div>));
        ds.graphs.forEach((g, i) => vizs.push(<div key={`gr-${i}`} className="mb-3"><div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Graph: {g.name}</div><GraphViz state={g} /></div>));
        ds.heaps.forEach((h, i) => vizs.push(<div key={`hp-${i}`} className="mb-3"><div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Heap: {h.name}</div><HeapViz state={h} /></div>));

        if (vizs.length === 0) return (
            <div className="text-[11px] text-muted-foreground text-center py-6">No data structures at this step</div>
        );
        return <>{vizs}</>;
    };

    // ── Skeleton
    if (!mounted) {
        return (
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[1600px] animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-muted" />
                    <div className="space-y-1.5"><div className="h-6 w-32 rounded bg-muted" /><div className="h-3 w-48 rounded bg-muted" /></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[calc(100vh-180px)]">
                    <div className="lg:col-span-5 rounded-xl bg-muted" />
                    <div className="lg:col-span-3 rounded-xl bg-muted" />
                    <div className="lg:col-span-4 rounded-xl bg-muted" />
                </div>
            </div>
        );
    }

    /* ═══ RENDER ═════════════════════════════════════════════════ */
    return (
        <>
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" />

            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1600px]">
                {/* ── Header ─────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20 shrink-0">
                                <Cpu className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                                    Code Runner
                                </h1>
                                <p className="text-[11px] text-muted-foreground">
                                    Simulate algorithms & visualize data structures
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                            {/* Language */}
                            <Select value={activeTab.language} onValueChange={handleLanguageChange}>
                                <SelectTrigger className="h-8 w-[130px] text-[11px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map(l => (
                                        <SelectItem key={l.id} value={l.id} className="text-[11px]">{l.icon} {l.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Examples filtered by language */}
                            <Select value={selectedExample} onValueChange={loadExample}>
                                <SelectTrigger className="h-8 w-[170px] text-[11px]">
                                    <SelectValue placeholder="📂 Load Example..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredExamples.length > 0 ? (
                                        filteredExamples.map(e => (
                                            <SelectItem key={e.id} value={e.id} className="text-[11px]">{e.label}</SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-2 py-3 text-[11px] text-muted-foreground text-center">
                                            No examples for {langDef.label}
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>

                            {/* Run (step-by-step with animation) */}
                            <Button onClick={() => { skipToEndRef.current = false; runSimulation(); }} size="sm" className="h-8 gap-1.5 text-[11px] shadow-lg shadow-primary/25 px-4">
                                <Zap className="h-3 w-3" />
                                Run
                            </Button>
                            {/* Instant (skip to end, no animation) */}
                            <Button onClick={() => instantRun()} size="sm" variant="outline" className="h-8 gap-1.5 text-[11px] px-3">
                                <Play className="h-3 w-3" />
                                Instant
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* ── Main Layout: 3-panel grid filling the viewport ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3" style={{ height: "calc(100vh - 155px)", minHeight: 400 }}>

                    {/* ═══ LEFT: Editor + Output ═══════════════════════ */}
                    <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
                        {/* Editor Card */}
                        <Card className="flex flex-col flex-1 overflow-hidden min-h-0">
                            {/* Tab bar */}
                            <div className="flex items-center border-b border-border/50 bg-muted/15 min-h-[34px] overflow-x-auto scrollbar-none">
                                {tabs.map(tab => (
                                    <button key={tab.id} onClick={() => setActiveTabId(tab.id)}
                                        className={`group flex items-center gap-1.5 px-3 py-1.5 text-[11px] whitespace-nowrap border-r border-border/30 transition-all duration-150 ${tab.id === activeTabId
                                            ? "bg-background text-foreground border-b-2 border-b-primary font-medium"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                                            }`}>
                                        <FileCode className="h-3 w-3 shrink-0" />
                                        {editingTabId === tab.id ? (
                                            <input value={editName} onChange={e => setEditName(e.target.value)}
                                                onBlur={() => renameTab(tab.id, editName)}
                                                onKeyDown={e => e.key === "Enter" && renameTab(tab.id, editName)}
                                                autoFocus
                                                className="bg-transparent border-none outline-none text-[11px] w-20 ring-1 ring-primary rounded px-1 font-mono" />
                                        ) : (
                                            <span onDoubleClick={() => { setEditingTabId(tab.id); setEditName(tab.name); }}
                                                className="font-mono">{tab.name}</span>
                                        )}
                                        {tabs.length > 1 && (
                                            <X className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-pointer transition-opacity"
                                                onClick={e => { e.stopPropagation(); removeTab(tab.id); }} />
                                        )}
                                    </button>
                                ))}
                                <button onClick={addTab} className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0" title="New file (Ctrl+N)">
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>

                            {/* Code Editor */}
                            <CodeEditor
                                code={activeTab.code}
                                language={langDef}
                                activeLine={currentStep?.lineNumber ?? null}
                                errorLines={errorLines}
                                onCodeChange={(c) => updateTab(activeTabId, { code: c })}
                            />
                        </Card>
                    </div>

                    {/* ═══ CENTER: Controls + Watch + Stack + Log ═══ */}
                    <div className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-auto">
                        {/* Playback Controls */}
                        <Card className="shrink-0">
                            <CardContent className="px-3 py-2">
                                <div className="flex items-center gap-1 flex-wrap">
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={stepBack} disabled={stepIndex <= 0}>
                                        <SkipBack className="h-3 w-3" />
                                    </Button>
                                    {isPlaying ? (
                                        <Button size="icon" className="h-4 w-4" onClick={stopPlayback}>
                                            <Pause className="h-2.5 w-2.5" />
                                        </Button>
                                    ) : (
                                        <Button size="icon" className="h-7 w-7" onClick={() => runSimulation()} disabled={steps.length === 0 && !activeTab.code.trim()}>
                                            <Play className="h-3 w-3" />
                                        </Button>
                                    )}
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={stepForward} disabled={stepIndex >= steps.length - 1}>
                                        <SkipForward className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset}>
                                        <RotateCcw className="h-3 w-3" />
                                    </Button>

                                    {/* Progress */}
                                    <div className="flex items-center gap-1.5 flex-1 min-w-[60px] ml-1">
                                        <span className="text-[9px] text-muted-foreground font-mono whitespace-nowrap">
                                            {totalLabel(stepIndex, steps.length)}
                                        </span>
                                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all duration-100"
                                                style={{ width: steps.length > 0 ? `${((stepIndex + 1) / steps.length) * 100}%` : "0%" }} />
                                        </div>
                                    </div>

                                    {/* Speed */}
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                        <input type="range" min={0.2} max={10} step={0.2} value={speed}
                                            onChange={e => setSpeed(Number(e.target.value))}
                                            className="w-12 accent-[hsl(var(--primary))] h-1" />
                                        <span className="text-[9px] text-muted-foreground font-mono w-6 text-right">{speed.toFixed(1)}x</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Annotation */}
                        {currentStep?.annotation && (
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                className="p-2.5 bg-primary/5 border border-primary/15 rounded-lg text-[11px] leading-relaxed shrink-0">
                                <div className="flex items-center gap-1 mb-0.5 text-primary font-semibold text-[10px]">
                                    <HelpCircle className="h-3 w-3" /> Why?
                                </div>
                                {currentStep.annotation}
                            </motion.div>
                        )}

                        {/* Variables */}
                        <Card className="shrink-0">
                            <CardHeader className="px-3 py-2 pb-1">
                                <CardTitle className="text-[11px] flex items-center gap-1.5 font-semibold text-muted-foreground uppercase tracking-wider">
                                    <Eye className="h-3 w-3 text-primary" /> Variables
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-2">
                                <VariableWatch variables={currentStep?.variables || []} />
                            </CardContent>
                        </Card>

                        {/* Call Stack */}
                        <Card className="shrink-0">
                            <CardHeader className="px-3 py-2 pb-1">
                                <CardTitle className="text-[11px] flex items-center gap-1.5 font-semibold text-muted-foreground uppercase tracking-wider">
                                    <Layers className="h-3 w-3 text-primary" /> Call Stack
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-2">
                                <CallStackPanel stack={currentStep?.callStack || []} />
                            </CardContent>
                        </Card>

                        {/* Execution Log */}
                        <Card className="shrink-0">
                            <CardHeader className="px-3 py-2 pb-1 shrink-0">
                                <CardTitle className="text-[11px] flex items-center gap-1.5 font-semibold text-muted-foreground uppercase tracking-wider">
                                    <Terminal className="h-3 w-3 text-primary" /> Execution Log
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-2">
                                <ExecutionLog logs={logs} />
                            </CardContent>
                        </Card>

                        {/* Output */}
                        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <CardHeader className="px-3 py-2 pb-1 shrink-0">
                                <CardTitle className="text-[11px] flex items-center gap-1.5 font-semibold text-muted-foreground uppercase tracking-wider">
                                    <Monitor className="h-3 w-3 text-primary" /> Output
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-2 flex-1 min-h-0 overflow-auto">
                                <div className="font-mono text-[11px] leading-relaxed pb-4">
                                    {isCompiling && (
                                        <div className="flex items-center gap-2 text-primary py-2">
                                            <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            Compiling...
                                        </div>
                                    )}
                                    {compileError && (
                                        <div className="text-red-400 py-1 whitespace-pre-wrap border-l-2 border-red-500/50 pl-2 mb-2 text-[10px]">
                                            {compileError}
                                        </div>
                                    )}
                                    {(realOutput || output).length === 0 && !isWaitingForInput && !isCompiling && !compileError ? (
                                        <div className="text-muted-foreground/50 py-2 text-center">No output</div>
                                    ) : (
                                        <>
                                            {(realOutput || output).map((line, i) => (
                                                <div key={i} className="text-foreground py-px whitespace-pre-wrap min-h-[1.2em] flex flex-wrap">
                                                    <span>{line}</span>
                                                    {isWaitingForInput && i === (realOutput || output).length - 1 && (
                                                        <span className="flex-1 min-w-[10px] ml-0.5 inline-flex">
                                                            <input
                                                                autoFocus
                                                                autoComplete="off"
                                                                spellCheck={false}
                                                                autoCapitalize="off"
                                                                name={`__cr_input_${Date.now()}`}
                                                                defaultValue=""
                                                                className="bg-transparent border-none outline-none text-foreground flex-1 min-w-[2px] p-0 h-auto focus:ring-0 leading-relaxed"
                                                                style={{ boxShadow: 'none' }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") {
                                                                        runSimulation(e.currentTarget.value);
                                                                        e.currentTarget.value = "";
                                                                    }
                                                                }}
                                                            />
                                                            <span className="w-1.5 h-4 bg-primary/60 animate-pulse ml-px inline-block align-middle" />
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            {isWaitingForInput && (realOutput || output).length === 0 && (
                                                <div className="flex items-center text-foreground py-px animate-in fade-in duration-200">
                                                    <input
                                                        autoFocus
                                                        autoComplete="off"
                                                        spellCheck={false}
                                                        autoCapitalize="off"
                                                        name={`__cr_input_empty_${Date.now()}`}
                                                        defaultValue=""
                                                        className="bg-transparent border-none outline-none text-foreground flex-1 min-w-[50px] focus:ring-0 p-0"
                                                        placeholder=""
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                runSimulation(e.currentTarget.value);
                                                                e.currentTarget.value = "";
                                                            }
                                                        }}
                                                    />
                                                    <span className="w-1.5 h-4 bg-primary/60 animate-pulse ml-px" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ═══ RIGHT: Visualizations + Complexity ═══════ */}
                    <div className="lg:col-span-4 flex flex-col min-h-0">
                        <Card className="flex flex-col flex-1 overflow-hidden min-h-0">
                            {/* Tab switcher */}
                            <div className="flex border-b border-border/50 shrink-0">
                                <button onClick={() => setRightTab("viz")}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors border-b-2 ${rightTab === "viz"
                                        ? "border-b-primary text-primary bg-primary/5"
                                        : "border-b-transparent text-muted-foreground hover:text-foreground"
                                        }`}>
                                    <Activity className="h-3 w-3" />
                                    Data Structures
                                </button>
                                <button onClick={() => setRightTab("complexity")}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors border-b-2 ${rightTab === "complexity"
                                        ? "border-b-primary text-primary bg-primary/5"
                                        : "border-b-transparent text-muted-foreground hover:text-foreground"
                                        }`}>
                                    <BarChart3 className="h-3 w-3" />
                                    Complexity
                                </button>
                            </div>

                            {/* Tab content */}
                            <div className="flex-1 overflow-auto p-3">
                                {rightTab === "viz" ? renderVisualizations() : <ComplexityPanel result={complexity} />}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* ── Footer info ─────────────────────────────────────── */}
                <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground/60 px-0.5">
                    <div className="flex items-center gap-3">
                        <span>{langDef.icon} {langDef.label}</span>
                        <span>{activeTab.code.split("\n").length} lines</span>
                        <span>Complexity: <span className="font-mono text-primary/80">{complexity.time}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[8px] h-4 px-1.5">Ctrl+Enter</Badge>
                        <Badge variant="outline" className="text-[8px] h-4 px-1.5">Ctrl+Alt+Enter</Badge>
                        <Badge variant="outline" className="text-[8px] h-4 px-1.5">Ctrl+N</Badge>
                    </div>
                </div>
            </div>
        </>
    );
}

function totalLabel(idx: number, total: number): string {
    if (total === 0) return "0/0";
    return `${idx + 1}/${total}`;
}
