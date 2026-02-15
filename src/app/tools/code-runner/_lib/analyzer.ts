/* ═══════════════════════════════════════════════════════════════
   Code Runner Analyzer
   1. Syntax highlighting (highlightCode)
   2. Complexity analysis (analyzeComplexity)
   3. Custom-code data-structure detection & output (analyzeCustomCode)
   ═══════════════════════════════════════════════════════════════ */
import { Step, Variable, DataStructureState, ArrayState, emptyDS } from "./types";
import { interpretPython } from "./interpreter";

/* ═══════════════════════════════════════════════════════════════
   1.  SYNTAX HIGHLIGHTING
   ═══════════════════════════════════════════════════════════════ */

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Returns an array of highlighted HTML strings, one per line */
export function highlightCode(
    code: string,
    keywords: string[],
    types: string[],
    builtins: string[],
    commentLine: string,
): string[] {
    return code.split("\n").map(raw => {
        let line = escapeHtml(raw);
        const trimmed = raw.trimStart();

        // Full-line comment
        if (trimmed.startsWith(commentLine)) {
            return `<span style="color:var(--color-muted-foreground);font-style:italic">${line}</span>`;
        }

        // Strings
        line = line.replace(/(["'`])(?:(?!\1|\\).|\\.)*?\1/g,
            m => `<span style="color:#a5d6ff">${m}</span>`);

        // Numbers
        line = line.replace(/\b(\d+(?:\.\d+)?)\b/g,
            `<span style="color:#e3b341">$1</span>`);

        // Keywords
        const kwRE = new RegExp(`\\b(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")})\\b`, "g");
        line = line.replace(kwRE, `<span style="color:#ff7b72;font-weight:600">$1</span>`);

        // Types
        if (types.length) {
            const tyRE = new RegExp(`\\b(${types.join("|")})\\b`, "g");
            line = line.replace(tyRE, `<span style="color:#bc8cff">$1</span>`);
        }

        // Builtins
        if (builtins.length) {
            const biRE = new RegExp(`\\b(${builtins.join("|")})\\b`, "g");
            line = line.replace(biRE, `<span style="color:#39d0d8">$1</span>`);
        }

        return line;
    });
}


/* ═══════════════════════════════════════════════════════════════
   2.  COMPLEXITY ANALYSIS
   ═══════════════════════════════════════════════════════════════ */

export interface ComplexityResult {
    time: string;
    space: string;
    bestCase: string;
    averageCase: string;
    worstCase: string;
    breakdown: string[];
    curveIndex: number;           // index into COMPLEXITY_CURVES
}

const COMPLEXITY_ORDER = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"];

export function analyzeComplexity(code: string): ComplexityResult {
    const lines = code.split("\n");
    let maxDepth = 0;
    let currentDepth = 0;
    let hasRecursion = false;
    let hasBinaryDivision = false;
    let usesHashMap = false;
    const breakdown: string[] = [];

    for (const line of lines) {
        const t = line.trim();

        // Detect loops
        if (/\b(for|while)\b/.test(t) && !/^\s*(\/\/|#|\/\*)/.test(t)) {
            currentDepth++;
            maxDepth = Math.max(maxDepth, currentDepth);
            breakdown.push(`Loop detected → depth ${currentDepth}`);
        }

        // Detect closing braces / dedents (simplified)
        if (t === "}" || t === "") {
            if (currentDepth > 0) currentDepth--;
        }

        // Recursion
        if (/\b(def|function|func|fn|fun)\s+(\w+)/.test(t)) {
            const funcName = t.match(/\b(?:def|function|func|fn|fun)\s+(\w+)/)?.[1];
            if (funcName) {
                const escapedName = funcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const callPattern = new RegExp(`\\b${escapedName}\\s*\\(`);
                const codeAfter = lines.slice(lines.indexOf(line) + 1).join("\n");
                if (callPattern.test(codeAfter)) {
                    hasRecursion = true;
                    breakdown.push(`Recursive call to ${funcName}()`);
                }
            }
        }

        // Binary division (suggests O(log n))
        if (/(?:\/\s*2|>>|\/\/\s*2|mid\s*=)/.test(t)) {
            hasBinaryDivision = true;
            breakdown.push("Binary division detected (÷2)");
        }

        // Hash map / set usage
        if (/\b(dict|Map|HashMap|HashSet|Set|set|map|{}\s*$)/.test(t)) {
            usesHashMap = true;
        }
    }

    // Determine complexity
    let time: string;
    let bestCase: string;
    let averageCase: string;
    let worstCase: string;
    let curveIndex: number;

    if (hasRecursion && !hasBinaryDivision) {
        time = "O(2ⁿ)";
        bestCase = "O(1)";
        averageCase = "O(2ⁿ)";
        worstCase = "O(2ⁿ)";
        curveIndex = 5;
        breakdown.push("Exponential due to recursion without memoization");
    } else if (maxDepth >= 2) {
        time = "O(n²)";
        bestCase = "O(n)";
        averageCase = "O(n²)";
        worstCase = "O(n²)";
        curveIndex = 4;
        breakdown.push(`Nested loops (depth ${maxDepth}) → quadratic`);
    } else if (maxDepth === 1 && hasBinaryDivision) {
        time = "O(n log n)";
        bestCase = "O(n log n)";
        averageCase = "O(n log n)";
        worstCase = "O(n log n)";
        curveIndex = 3;
        breakdown.push("Loop with binary division → O(n log n)");
    } else if (hasBinaryDivision || (hasRecursion && hasBinaryDivision)) {
        time = "O(log n)";
        bestCase = "O(1)";
        averageCase = "O(log n)";
        worstCase = "O(log n)";
        curveIndex = 1;
        breakdown.push("Binary search pattern → logarithmic");
    } else if (maxDepth === 1) {
        time = "O(n)";
        bestCase = "O(1)";
        averageCase = "O(n)";
        worstCase = "O(n)";
        curveIndex = 2;
        breakdown.push("Single loop → linear");
    } else {
        time = "O(1)";
        bestCase = "O(1)";
        averageCase = "O(1)";
        worstCase = "O(1)";
        curveIndex = 0;
        breakdown.push("No loops or recursion → constant");
    }

    // Space
    const hasArray = /\[.*\]|\bvec!?\[|\bnew\s+\w+\[|\bArrayList|vector|List/.test(code);
    const space = hasArray ? "O(n)" : (usesHashMap ? "O(n)" : "O(1)");
    breakdown.push(`Space: ${space} ${hasArray ? "(array allocation)" : usesHashMap ? "(hash structure)" : "(in-place)"}`);

    if (breakdown.length === 0) breakdown.push("Simple sequential code");

    return { time, space, bestCase, averageCase, worstCase, breakdown, curveIndex };
}


/* ═══════════════════════════════════════════════════════════════
   3.  CUSTOM CODE ANALYSIS
   Detects data structures + extracts output from user-written code.
   ═══════════════════════════════════════════════════════════════ */

export interface AnalysisResult {
    steps: Step[];
    output: string[];
    isWaitingForInput?: boolean;
}

const mkVar = (name: string, value: string | number, type = "int", changed = false): Variable => ({
    name, value: String(value), type, changed,
});

/* ─── Print-output extraction ─────────────────────────────────── */

const PRINT_PATTERNS: Record<string, { regex: RegExp; extract: (m: RegExpMatchArray, vars: Map<string, string>) => string | null }[]> = {
    python: [{ regex: /^\s*print\((.+)\)\s*$/, extract: (m, vars) => evalPrintArgs(m[1], vars, "python") }],
    javascript: [{ regex: /^\s*console\.log\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalPrintArgs(m[1], vars, "javascript") }],
    typescript: [{ regex: /^\s*console\.log\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalPrintArgs(m[1], vars, "typescript") }],
    java: [
        { regex: /^\s*System\.out\.println\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalPrintArgs(m[1], vars, "java") },
        { regex: /^\s*System\.out\.print\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalPrintArgs(m[1], vars, "java") },
    ],
    c: [{ regex: /^\s*printf\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalPrintf(m[1], vars) }],
    cpp: [{ regex: /^\s*cout\s*<<\s*(.+?)\s*(?:<<\s*endl)?\s*;?\s*$/, extract: (m, vars) => evalCout(m[1], vars) }],
    csharp: [
        { regex: /^\s*Console\.WriteLine\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalPrintArgs(m[1], vars, "csharp") },
        { regex: /^\s*Console\.Write\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalPrintArgs(m[1], vars, "csharp") },
    ],
    go: [
        { regex: /^\s*fmt\.Println\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalPrintArgs(m[1], vars, "go") },
        { regex: /^\s*fmt\.Printf\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalPrintf(m[1], vars) },
    ],
    rust: [{ regex: /^\s*println!\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalRustPrintln(m[1], vars) }],
    kotlin: [{ regex: /^\s*println\((.+)\)\s*;?\s*$/, extract: (m, vars) => evalPrintArgs(m[1], vars, "kotlin") }],
};

function unquote(s: string): string {
    s = s.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")) || (s.startsWith('`') && s.endsWith('`')))
        return s.slice(1, -1);
    return s;
}

function evalPrintArgs(args: string, vars: Map<string, string>, lang: string): string {
    // Python f-string
    if (lang === "python" && args.startsWith('f"') && args.endsWith('"')) {
        let r = args.slice(2, -1);
        r = r.replace(/\{([^}]+)\}/g, (_, e) => vars.get(e.trim()) ?? e.trim());
        return r;
    }
    // Kotlin template
    if (lang === "kotlin" && args.startsWith('"') && args.endsWith('"')) {
        let r = args.slice(1, -1);
        r = r.replace(/\$\{([^}]+)\}/g, (_, e) => vars.get(e.trim()) ?? e.trim());
        r = r.replace(/\$(\w+)/g, (_, n) => vars.get(n) ?? n);
        return r;
    }
    // Python multi-arg
    if (lang === "python") {
        return smartSplit(args, ",").map(p => resolve(p.trim(), vars)).join(" ");
    }
    // Java/C# concat with +
    if (lang === "java" || lang === "csharp") {
        return smartSplit(args, "+").map(p => resolve(p.trim(), vars)).join("");
    }
    return resolve(args, vars);
}

function evalPrintf(args: string, vars: Map<string, string>): string {
    const parts = smartSplit(args, ",");
    if (!parts.length) return "";
    let fmt = unquote(parts[0]);
    const fArgs = parts.slice(1).map(p => resolve(p.trim(), vars));
    let ai = 0;
    fmt = fmt.replace(/%(?:[-+0 #]*[0-9]*(?:\.[0-9]+)?[diouxXeEfFgGaAcspn%])/g, m => {
        if (m === "%%") return "%"; return ai < fArgs.length ? fArgs[ai++] : m;
    });
    return fmt.replace(/\\n/g, "");
}

function evalCout(expr: string, vars: Map<string, string>): string {
    return expr.split("<<").map(s => s.trim()).filter(s => s && s !== "endl").map(p => resolve(p, vars)).join("");
}

function evalRustPrintln(args: string, vars: Map<string, string>): string {
    const parts = smartSplit(args, ",");
    if (!parts.length) return "";
    let fmt = unquote(parts[0]);
    const fArgs = parts.slice(1).map(p => resolve(p.trim(), vars));
    let ai = 0;
    fmt = fmt.replace(/\{(?::[\?#]*)?\}/g, () => ai < fArgs.length ? fArgs[ai++] : "{}");
    return fmt;
}

function resolve(expr: string, vars: Map<string, string>): string {
    expr = expr.trim();
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'")) || (expr.startsWith('`') && expr.endsWith('`')))
        return expr.slice(1, -1);
    if (/^-?\d+(\.\d+)?$/.test(expr)) return expr;
    if (expr === "true" || expr === "True") return "true";
    if (expr === "false" || expr === "False") return "false";

    // Try to evaluate simple arithmetic: variable op variable/number
    const arithmeticMatch = expr.match(/^(\w+)\s*([+\-*/%])\s*(\w+|\d+(?:\.\d+)?)$/);
    if (arithmeticMatch) {
        const [, left, op, right] = arithmeticMatch;
        const leftVal = vars.get(left) ?? left;
        const rightVal = /^\d/.test(right) ? right : (vars.get(right) ?? right);
        const a = parseFloat(leftVal);
        const b = parseFloat(rightVal);
        if (!isNaN(a) && !isNaN(b)) {
            switch (op) {
                case '+': return String(a + b);
                case '-': return String(a - b);
                case '*': return String(a * b);
                case '/': return b !== 0 ? String(Math.floor(a / b)) : expr;
                case '%': return b !== 0 ? String(a % b) : expr;
            }
        }
    }

    // Array element access: arr[idx] or arr[var]
    const arrAccess = expr.match(/^(\w+)\[(\w+)\]$/);
    if (arrAccess) {
        const idxVal = vars.get(arrAccess[2]) ?? arrAccess[2];
        const key = `${arrAccess[1]}[${idxVal}]`;
        return vars.get(key) ?? expr;
    }

    return vars.get(expr) ?? expr;
}

function smartSplit(s: string, delim: string): string[] {
    const result: string[] = []; let depth = 0; let inStr: string | null = null; let cur = "";
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (inStr) { cur += ch; if (ch === inStr && s[i - 1] !== "\\") inStr = null; }
        else if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; cur += ch; }
        else if ("([{".includes(ch)) { depth++; cur += ch; }
        else if (")]}".includes(ch)) { depth--; cur += ch; }
        else if (depth === 0 && s.slice(i, i + delim.length) === delim) { result.push(cur); cur = ""; i += delim.length - 1; }
        else cur += ch;
    }
    if (cur.trim()) result.push(cur);
    return result;
}

/* ─── Assignment detection patterns ───────────────────────────── */

const ASSIGN_RES: RegExp[] = [
    /^\s*(?:const|let|var)\s+(\w+)\s*(?::\s*\w+(?:<[^>]+>)?\s*)?=\s*(.+?)\s*;?\s*$/,
    /^\s*(?:int|long|float|double|char|bool|boolean|string|String|var|auto|val)\s+(\w+)\s*=\s*(.+?)\s*;?\s*$/,
    /^\s*let\s+(?:mut\s+)?(\w+)\s*(?::\s*\w+)?\s*=\s*(.+?)\s*;?\s*$/,
    /^\s*(\w+)\s*:=\s*(.+?)\s*$/,
    // Generic assignment — MUST be last to avoid false positives on `for`, `if`, etc.
    /^\s*(\w+)\s*=\s*(.+?)\s*$/,
];

/* ─── Array literal detection ─────────────────────────────────── */

interface DetectedArray { name: string; values: (number | string)[]; }

function detectArrays(lines: string[]): DetectedArray[] {
    const arrs: DetectedArray[] = []; const seen = new Set<string>();
    const tryPush = (name: string, raw: string) => {
        if (seen.has(name)) return;
        const vals = parseVals(raw);
        if (vals.length) { arrs.push({ name, values: vals }); seen.add(name); }
    };
    for (const line of lines) {
        const t = line.trim(); let m: RegExpMatchArray | null;
        if ((m = t.match(/^(\w+)\s*=\s*\[([^\]]*)\]\s*$/))) { tryPush(m[1], m[2]); continue; }
        if ((m = t.match(/^(?:const|let|var)\s+(\w+)\s*(?::[^=]*)?\s*=\s*\[([^\]]*)\]\s*;?\s*$/))) { tryPush(m[1], m[2]); continue; }
        if ((m = t.match(/^(?:int|long|float|double|String|Integer)\[\]\s+(\w+)\s*=\s*(?:new\s+\w+\[\]\s*)?\{([^}]*)\}\s*;?\s*$/))) { tryPush(m[1], m[2]); continue; }
        if ((m = t.match(/^(?:int|long|float|double|char)\s+(\w+)\[\s*\d*\s*\]\s*=\s*\{([^}]*)\}\s*;?\s*$/))) { tryPush(m[1], m[2]); continue; }
        if ((m = t.match(/^(?:vector|array)<\w+>\s+(\w+)\s*(?:=\s*\{([^}]*)\})?\s*;?\s*$/)) && m[2]) { tryPush(m[1], m[2]); continue; }
        if ((m = t.match(/^(\w+)\s*:=\s*\[\]\w+\{([^}]*)\}\s*$/))) { tryPush(m[1], m[2]); continue; }
        if ((m = t.match(/^let\s+(?:mut\s+)?(\w+)\s*(?::\s*Vec<\w+>)?\s*=\s*vec!\[([^\]]*)\]\s*;?\s*$/))) { tryPush(m[1], m[2]); continue; }
        if ((m = t.match(/^(?:val|var)\s+(\w+)\s*(?::\s*\w+)?\s*=\s*(?:intArrayOf|listOf|mutableListOf|arrayOf)\(([^)]*)\)\s*$/))) { tryPush(m[1], m[2]); continue; }
        if ((m = t.match(/^(?:int|long|float|double|string)\[\]\s+(\w+)\s*=\s*(?:new\s+\w+\[\]\s*)?\{([^}]*)\}\s*;?\s*$/))) { tryPush(m[1], m[2]); continue; }
    }
    return arrs;
}

function parseVals(raw: string): (number | string)[] {
    if (!raw.trim()) return [];
    return raw.split(",").map(s => {
        s = s.trim();
        const n = Number(s);
        if (!isNaN(n) && s !== "") return n;
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
            return s.slice(1, -1);
        return s;
    }).filter(v => v !== "");
}

/* ─── Loop detection ──────────────────────────────────────────── */

interface LoopInfo { startLine: number; endLine: number; iterVar: string; arrayName: string | null; }

function detectLoops(lines: string[]): LoopInfo[] {
    const loops: LoopInfo[] = [];
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim(); let m: RegExpMatchArray | null;
        if ((m = t.match(/^for\s+(\w+)\s+in\s+(?:range\(.*\)|(\w+))/))) { loops.push({ startLine: i, endLine: blockEnd(lines, i, "python"), iterVar: m[1], arrayName: m[2] || null }); continue; }
        if ((m = t.match(/^for\s*\(\s*(?:int|let|var|auto|val)?\s*(\w+)\s*=\s*0/))) { loops.push({ startLine: i, endLine: blockEnd(lines, i, "c"), iterVar: m[1], arrayName: null }); continue; }
        if ((m = t.match(/^for\s+(\w+)(?:,\s*\w+)?\s*:=\s*range\s+(\w+)/))) { loops.push({ startLine: i, endLine: blockEnd(lines, i, "go"), iterVar: m[1], arrayName: m[2] }); continue; }
        if ((m = t.match(/^for\s+(\w+)\s+in\s+(?:&)?(\w+)/))) { loops.push({ startLine: i, endLine: blockEnd(lines, i, "rust"), iterVar: m[1], arrayName: m[2] }); continue; }
    }
    return loops;
}

function blockEnd(lines: string[], start: number, lang: string): number {
    if (lang === "python") {
        const ind = lines[start].search(/\S/);
        for (let i = start + 1; i < lines.length; i++) {
            if (lines[i].trim() !== "" && lines[i].search(/\S/) <= ind) return i - 1;
        }
        return lines.length - 1;
    }
    let d = 0;
    for (let i = start; i < lines.length; i++) {
        for (const ch of lines[i]) {
            if (ch === '{') d++;
            if (ch === '}') { d--; if (d === 0) return i; }
        }
    }
    return lines.length - 1;
}

/* ─── Comment / import / structural checks ────────────────────── */

function isComment(line: string, lang: string): boolean {
    return lang === "python" ? line.startsWith("#") : line.startsWith("//");
}

function isImport(line: string, lang: string): boolean {
    if (lang === "python") return line.startsWith("import ") || line.startsWith("from ");
    if (lang === "java" || lang === "kotlin") return line.startsWith("import ");
    if (lang === "c" || lang === "cpp") return line.startsWith("#include");
    if (lang === "csharp") return line.startsWith("using ");
    if (lang === "go") return line.startsWith("import ");
    if (lang === "rust") return line.startsWith("use ");
    if (lang === "javascript" || lang === "typescript") return line.startsWith("import ");
    return false;
}

function isBrace(line: string): boolean {
    return line === "{" || line === "}" || line === "};";
}

/* ─── Function body detection ─────────────────────────────────── */

interface FuncDef {
    name: string;
    params: string[];
    bodyStart: number;
    bodyEnd: number;
}

function detectFunctions(lines: string[], lang: string): FuncDef[] {
    const funcs: FuncDef[] = [];
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        let m: RegExpMatchArray | null;
        // Python: def func_name(params):
        if ((m = t.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:?\s*$/))) {
            const end = blockEnd(lines, i, "python");
            const params = m[2].split(",").map(p => p.trim().split(/[:\s=]/)[0]).filter(Boolean);
            funcs.push({ name: m[1], params, bodyStart: i + 1, bodyEnd: end });
            continue;
        }
        // JS/TS/Java/etc: function name(params) { or similar
        if ((m = t.match(/^(?:function|func|fn|fun|public\s+static\s+\w+|private\s+static\s+\w+|static\s+\w+|public\s+\w+|private\s+\w+|\w+)\s+(\w+)\s*\(([^)]*)\)/))) {
            const end = blockEnd(lines, i, "c");
            const params = m[2].split(",").map(p => p.trim().split(/\s+/).pop() || "").filter(Boolean);
            funcs.push({ name: m[1], params, bodyStart: i + 1, bodyEnd: end });
        }
    }
    return funcs;
}

/* ─── Detect if a function name implies a common algorithm ────── */

type AlgoType = "sort" | "reverse" | "search" | "unknown";

function detectAlgoFromName(name: string): AlgoType {
    const n = name.toLowerCase();
    if (n.includes("sort") || n.includes("bubble") || n.includes("selection") || n.includes("insertion") || n.includes("merge") || n.includes("quick"))
        return "sort";
    if (n.includes("reverse") || n.includes("flip"))
        return "reverse";
    if (n.includes("search") || n.includes("find") || n.includes("binary") || n.includes("linear"))
        return "search";
    return "unknown";
}

/** Apply a detected algorithm to array values */
function applyAlgo(algo: AlgoType, values: (number | string)[]): (number | string)[] {
    const copy = [...values];
    switch (algo) {
        case "sort":
            return copy.sort((a, b) => {
                if (typeof a === "number" && typeof b === "number") return a - b;
                return String(a).localeCompare(String(b));
            });
        case "reverse":
            return copy.reverse();
        default:
            return copy;
    }
}

/* ─── Call-stack + annotation helpers ─────────────────────────── */

const CALL_SKIP = new Set(["if", "else", "for", "while", "switch", "case", "return", "print", "println", "printf",
    "console", "System", "range", "len", "int", "float", "str", "new", "sizeof", "typeof", "class", "struct",
    "function", "def", "fn", "func", "fun", "const", "let", "var", "val", "auto", "void", "main",
    "fmt", "cout", "Console", "Arrays"]);

function detectCallStack(line: string): string[] {
    const calls: string[] = [];
    const re = /(\w+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        if (!CALL_SKIP.has(m[1])) calls.push(m[1]);
    }
    return calls;
}

function annotation(line: string): string {
    // Function def
    if (/^(?:def|function|func|fn|fun)\s+(\w+)/.test(line)) {
        const m = line.match(/(?:def|function|func|fn|fun)\s+(\w+)/);
        if (m) return `Defining function ${m[1]}`;
    }
    // Return
    if (/^\s*return\s/.test(line)) return "Returning value";
    // Conditional
    if (/^\s*if\s/.test(line)) return "Checking condition";
    if (/^\s*else/.test(line)) return "Else branch";
    if (/^\s*elif\s/.test(line)) return "Checking elif condition";
    // Loop
    if (/^\s*for\s/.test(line)) return "Starting loop";
    if (/^\s*while\s/.test(line)) return "While loop";
    // Print
    if (/print|console\.log|System\.out|printf|cout|fmt\.Print|println/.test(line)) return "Output";
    // Swap pattern: a, b = b, a or a[i], a[j] = a[j], a[i]
    if (/(\w+)\[(\w+)\],\s*(\w+)\[(\w+)\]\s*=\s*(\w+)\[(\w+)\],\s*(\w+)\[(\w+)\]/.test(line)) return "Swapping elements";
    // Assignment (check after function/loop/conditional to avoid false positives)
    if (/=/.test(line) && !/[=!<>]=/.test(line) && !/==/.test(line)) {
        const m = line.match(/(\w+)\s*(?::.*?)?\s*=\s*(.+)/);
        if (m) {
            // Function call assignment
            if (/\w+\(/.test(m[2])) {
                const funcM = m[2].match(/(\w+)\s*\(/);
                if (funcM) return `Calling ${funcM[1]}() → ${m[1]}`;
            }
            return `Assigning ${m[1]}`;
        }
    }
    // Class/struct
    if (/^\s*(?:class|struct)\s+(\w+)/.test(line)) {
        const m = line.match(/(?:class|struct)\s+(\w+)/);
        if (m) return `Defining ${m[1]}`;
    }
    return line.length > 60 ? `Executing: ${line.substring(0, 57)}...` : `Executing: ${line}`;
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — analyzeCustomCode
   Uses the mini interpreter for Python (real step-by-step execution),
   falls back to static analysis for other languages.
   Argument `pistonChunks` is optional: if provided, C++ cout/printf steps
   will use these real output chunks instead of simulated output.
   ═══════════════════════════════════════════════════════════════ */

export function instrumentCpp(code: string): string {
    // Inject << "|_PST_|"; after every cout statement
    // Regex matches: cout << ... ; 
    // We handle strings to avoid matching ; inside them
    return code.replace(/(?:std::)?\bcout\b\s*<<(?:\s*[^;"']|"[^"]*"|'[^']*')*;/g, (match) => {
        // Replace the last semicolon with our marker
        return match.replace(/;\s*$/, ' << "|_PST_|";');
    });
}

export function analyzeCustomCode(
    code: string,
    language: string,
    inputs: string[] = [],
    pistonChunks: string[] | null = null
): AnalysisResult {
    // For Python, try the mini interpreter first (real execution)
    if (language === "python") {
        const interpResult = interpretPython(code, inputs);
        if (interpResult.steps.length > 0 || interpResult.isWaitingForInput) {
            return interpResult;
        }
    }

    // Fallback: static analysis for other languages / if interpreter fails
    const lines = code.split("\n");
    const detectedArrays = detectArrays(lines);
    const loops = detectLoops(lines);
    const funcs = detectFunctions(lines, language);

    // ── Smart variable tracking ──────────────────────────────────
    // Two-pass: first resolve simple assignments, then resolve function calls
    // by detecting what algorithm the function implements and simulating it.
    const vars = new Map<string, string>();
    // Map from array variable name to its mutable current values
    const arrayStates = new Map<string, (number | string)[]>();
    for (const arr of detectedArrays) {
        arrayStates.set(arr.name, [...arr.values]);
    }

    const output: string[] = []; // Lines of output
    const appendOutput = (text: string) => {
        if (output.length === 0) output.push("");
        const lines = text.split("\n");
        output[output.length - 1] += lines[0];
        for (let i = 1; i < lines.length; i++) {
            output.push(lines[i]);
        }
    };

    // If real output chunks are provided (from Piston instrumentation), use them
    let chunkIndex = 0;
    const consumeRealChunk = (): string | null => {
        if (inputs.length > 0 && typeof inputs[0] === 'string' && inputs[0].startsWith('|_CHUNKS_|')) {
            // This is a hack to pass chunks via inputs arg if we don't want to change signature too much
            // But better to change signature.
            return null;
        }
        return null;
    };

    const printPatterns = PRINT_PATTERNS[language] || PRINT_PATTERNS["python"];

    // First pass: track all simple variable assignments and generate output
    let currentInputIdx = 0;
    const outputMap = new Map<number, string[]>();
    // Extra steps from loop unrolling: {lineNumber, vars snapshot, output snapshot}
    const extraSteps: Step[] = [];
    // Track which line ranges are handled by loop unrolling so genSteps skips them
    const unrolledRanges: { start: number; end: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const t = line.trim();

        // ── 0. Loop Unrolling ────────────────────────────────────
        // Detect C-style for loops: for (int i = 0; i < N; i++)
        const forMatch = t.match(/^for\s*\(\s*(?:int|let|var|auto|)\s*(\w+)\s*=\s*(\d+)\s*;\s*\1\s*(<|<=|>|>=)\s*(\w+)\s*;\s*\1\s*(\+\+|--|\+=\s*\d+|-=\s*\d+)\s*\)/);
        // Also try python-style: for i in range(N)
        const pyForMatch = !forMatch ? t.match(/^for\s+(\w+)\s+in\s+range\s*\(\s*(?:(\d+)\s*,\s*)?(\w+)\s*\)/) : null;

        if (forMatch || pyForMatch) {
            let loopVar: string, startVal: number, endVal: number, increment: number;

            if (forMatch) {
                loopVar = forMatch[1];
                startVal = parseInt(forMatch[2]);
                const op = forMatch[3];
                const boundStr = forMatch[4];
                const bound = parseInt(vars.get(boundStr) ?? boundStr);
                if (isNaN(bound)) { outputMap.set(i, [...output]); continue; }

                const incStr = forMatch[5];
                if (incStr === "++") increment = 1;
                else if (incStr === "--") increment = -1;
                else {
                    const incM = incStr.match(/([+-])=\s*(\d+)/);
                    increment = incM ? (incM[1] === '+' ? parseInt(incM[2]) : -parseInt(incM[2])) : 1;
                }

                if (op === "<") endVal = bound;
                else if (op === "<=") endVal = bound + 1;
                else if (op === ">") endVal = bound; // loop goes down
                else endVal = bound - 1; // >=
            } else {
                // Python range: for i in range(N) or range(start, N)
                loopVar = pyForMatch![1];
                const rangeStart = pyForMatch![2];
                const rangeEnd = pyForMatch![3];
                startVal = rangeStart ? parseInt(rangeStart) : 0;
                const endBound = parseInt(vars.get(rangeEnd) ?? rangeEnd);
                if (isNaN(endBound)) { outputMap.set(i, [...output]); continue; }
                endVal = endBound;
                increment = 1;
            }

            // Find loop body
            const bodyStart = i + 1;
            const bodyEnd = blockEnd(lines, i, forMatch ? "c" : "python");
            const bodyLines: { text: string; idx: number }[] = [];
            for (let b = bodyStart; b <= bodyEnd; b++) {
                const bt = lines[b]?.trim() || "";
                if (bt.length > 0 && !isBrace(bt)) {
                    bodyLines.push({ text: bt, idx: b });
                }
            }

            // Record the unrolled range
            unrolledRanges.push({ start: i, end: bodyEnd });

            // Capture output snapshot for the for-header line
            outputMap.set(i, [...output]);

            // Simulate iterations (with safety limit)
            const maxIter = 200;
            let iter = 0;
            let loopWaiting = false;

            for (let v = startVal; increment > 0 ? v < endVal : v > endVal; v += increment) {
                if (iter++ >= maxIter) break;
                vars.set(loopVar, String(v));

                // Process each body line in this iteration
                for (const bl of bodyLines) {
                    // Variable assignments
                    for (const pat of ASSIGN_RES) {
                        const m = bl.text.match(pat);
                        if (m) {
                            const varName = m[1];
                            const value = m[2].replace(/;$/, "").trim();
                            const resolved = resolve(value, vars);
                            if (/^-?\d+(\.\d+)?$/.test(resolved)) {
                                vars.set(varName, resolved);
                            } else {
                                const ref = vars.get(value);
                                if (ref !== undefined) {
                                    vars.set(varName, ref);
                                } else {
                                    vars.set(varName, resolved);
                                }
                            }
                            break;
                        }
                    }

                    // cin handling inside loop body
                    if ((language === "cpp" || language === "c") && bl.text.includes("cin")) {
                        const cinMatch = bl.text.match(/cin\s*>>\s*(.+)/);
                        if (cinMatch) {
                            const cinParts = cinMatch[1].split(">>").map(p => p.trim().replace(/;$/, ""));
                            for (const cp of cinParts) {
                                if (currentInputIdx < inputs.length) {
                                    const val = inputs[currentInputIdx++];
                                    // Handle array element: arr[i]
                                    const arrAcc = cp.match(/(\w+)\[(\w+)\]/);
                                    if (arrAcc) {
                                        const idxVal = vars.get(arrAcc[2]) ?? arrAcc[2];
                                        vars.set(`${arrAcc[1]}[${idxVal}]`, val);
                                    } else {
                                        vars.set(cp, val);
                                    }
                                    appendOutput(val);
                                    appendOutput("\n");
                                } else {
                                    loopWaiting = true;
                                    break;
                                }
                            }
                        }
                    }

                    // Python input() inside loop body
                    if (language === "python" && bl.text.includes("input(")) {
                        const inputMatch = bl.text.match(/(\w+)\s*=\s*(?:int|float|str)?\s*\(?\s*input\s*\(/);
                        if (inputMatch) {
                            if (currentInputIdx < inputs.length) {
                                const val = inputs[currentInputIdx++];
                                vars.set(inputMatch[1], val);
                                appendOutput(val);
                                appendOutput("\n");
                            } else {
                                loopWaiting = true;
                            }
                        }
                    }

                    if (loopWaiting) {
                        // Push a step for the cin line showing waiting state
                        const waitVars: Variable[] = [];
                        for (const [name, value] of vars.entries()) {
                            if (name === "_" || name.startsWith("__")) continue;
                            const isArr = /^\[.*\]$/.test(value) || /^\{.*\}$/.test(value);
                            waitVars.push(mkVar(name, value, isArr ? "list" : "int", false));
                        }
                        const trunc2 = bl.text.length > 80 ? bl.text.substring(0, 77) + "..." : bl.text;
                        extraSteps.push({
                            lineNumber: bl.idx,
                            variables: waitVars,
                            callStack: [],
                            ds: emptyDS(),
                            logMessage: `Line ${bl.idx + 1}: ${trunc2}`,
                            annotation: annotation(bl.text),
                            output: [...output],
                        });
                        break; // break out of body lines loop
                    }

                    // Output detection (cout / print) — only if not a cin line
                    if (!bl.text.includes("cin") && !bl.text.includes("input(")) {
                        // Check if we should use real Piston chunks
                        if (language === "cpp" && pistonChunks && chunkIndex < pistonChunks.length && /^\s*(std::)?cout\s*<</.test(bl.text)) {
                            appendOutput(pistonChunks[chunkIndex++]);
                        } else {
                            for (const p of printPatterns) {
                                const m = bl.text.match(p.regex);
                                if (m) {
                                    const r = p.extract(m, vars);
                                    if (r !== null) {
                                        appendOutput(r);
                                        if (language === "python" || bl.text.includes("println") || bl.text.includes("WriteLine") || bl.text.includes("Println")) {
                                            appendOutput("\n");
                                        } else if (language === "cpp" && bl.text.includes("endl")) {
                                            appendOutput("\n");
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Build variables snapshot for this iteration step
                    const varsSnapshot: Variable[] = [];
                    for (const [name, value] of vars.entries()) {
                        if (name === "_" || name.startsWith("__")) continue;
                        const isArr = /^\[.*\]$/.test(value) || /^\{.*\}$/.test(value);
                        varsSnapshot.push(mkVar(name, value, isArr ? "list" : "int", name === loopVar));
                    }

                    const trunc = bl.text.length > 80 ? bl.text.substring(0, 77) + "..." : bl.text;
                    extraSteps.push({
                        lineNumber: bl.idx,
                        variables: varsSnapshot,
                        callStack: [],
                        ds: emptyDS(),
                        logMessage: `Line ${bl.idx + 1}: ${trunc}`,
                        annotation: annotation(bl.text),
                        output: [...output],
                    });
                }

                if (loopWaiting) break; // break out of iterations loop
            }

            if (loopWaiting) {
                // Waiting for input inside a loop — return early
                outputMap.set(i, [...output]);
                const processedLines = lines.slice(0, bodyEnd + 1);
                const partialSteps = genSteps(processedLines, language, vars, detectedArrays, arrayStates, loops, funcs, outputMap, extraSteps, unrolledRanges);
                return { steps: partialSteps, output, isWaitingForInput: true };
            }

            // Skip past the loop body
            i = bodyEnd;
            outputMap.set(i, [...output]);
            continue;
        }

        // ── 1. Variable Assignment Tracking ────────────────────
        for (const pat of ASSIGN_RES) {
            const m = t.match(pat);
            if (m) {
                const varName = m[1];
                let value = m[2].replace(/;$/, "").trim();

                // Check if RHS is a function call: result = someFunc(arg)
                const funcCallM = value.match(/^(\w+)\s*\(([^)]*)\)$/);
                if (funcCallM) {
                    const calledFunc = funcCallM[1];
                    const callArgs = funcCallM[2].split(",").map(a => a.trim());
                    const algo = detectAlgoFromName(calledFunc);

                    // Check if any argument is a known array
                    let resolvedArray: (number | string)[] | null = null;
                    for (const arg of callArgs) {
                        const arrState = arrayStates.get(arg);
                        if (arrState) {
                            if (algo !== "unknown") {
                                resolvedArray = applyAlgo(algo, arrState);
                                // Also update the source array if it's an in-place algo
                                arrayStates.set(arg, [...resolvedArray]);
                            } else {
                                resolvedArray = arrState;
                            }
                            break;
                        }
                    }

                    if (resolvedArray) {
                        const formatted = `[${resolvedArray.join(", ")}]`;
                        vars.set(varName, formatted);
                        arrayStates.set(varName, [...resolvedArray]);
                    } else {
                        // Check if function is defined in the code
                        const funcDef = funcs.find(f => f.name === calledFunc);
                        if (funcDef) {
                            // If algorithm name suggests sort/reverse, try to apply it
                            const nameAlgo = detectAlgoFromName(calledFunc);
                            if (nameAlgo !== "unknown") {
                                for (const arg of callArgs) {
                                    const arrVals = arrayStates.get(arg);
                                    if (arrVals) {
                                        const result = applyAlgo(nameAlgo, arrVals);
                                        vars.set(varName, `[${result.join(", ")}]`);
                                        arrayStates.set(varName, result);
                                    }
                                }
                            } else {
                                vars.set(varName, `${calledFunc}(${callArgs.join(", ")})`);
                            }
                        } else {
                            // Built-in function calls: len(), sorted(), etc.
                            if (calledFunc === "len" || calledFunc === "length") {
                                const argArr = arrayStates.get(callArgs[0]);
                                vars.set(varName, argArr ? String(argArr.length) : value);
                            } else if (calledFunc === "sorted") {
                                const argArr = arrayStates.get(callArgs[0]);
                                if (argArr) {
                                    const sorted = applyAlgo("sort", argArr);
                                    vars.set(varName, `[${sorted.join(", ")}]`);
                                    arrayStates.set(varName, sorted);
                                } else {
                                    vars.set(varName, value);
                                }
                            } else {
                                vars.set(varName, value);
                            }
                        }
                    }
                } else {
                    // Simple assignment
                    if (/^\[.*\]$/.test(value)) {
                        vars.set(varName, value);
                    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
                        vars.set(varName, value);
                    } else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        vars.set(varName, value.slice(1, -1));
                    } else {
                        // Variable reference or expression
                        const ref = vars.get(value);
                        if (ref !== undefined) {
                            vars.set(varName, ref);
                        } else {
                            // Simple arithmetic
                            const ar = value.match(/^(\w+)\s*([+\-*/])\s*(\w+)$/);
                            if (ar) {
                                const a = Number(vars.get(ar[1]) || ar[1]);
                                const b = Number(vars.get(ar[3]) || ar[3]);
                                if (!isNaN(a) && !isNaN(b)) {
                                    switch (ar[2]) {
                                        case "+": vars.set(varName, String(a + b)); break;
                                        case "-": vars.set(varName, String(a - b)); break;
                                        case "*": vars.set(varName, String(a * b)); break;
                                        case "/": vars.set(varName, b ? String(Math.floor(a / b)) : value); break;
                                    }
                                } else {
                                    vars.set(varName, value);
                                }
                            } else {
                                vars.set(varName, value);
                            }
                        }
                    }
                }
                break;
            }
        }

        // ── 2. Output Detection (cout / print) ─────────────────
        // ── 2. Output Detection (cout / print) ─────────────────
        if (language === "cpp" && pistonChunks && chunkIndex < pistonChunks.length && /^\s*(std::)?cout\s*<</.test(line)) {
            appendOutput(pistonChunks[chunkIndex++]);
        } else {
            for (const p of printPatterns) {
                const m = line.match(p.regex);
                if (m) {
                    const r = p.extract(m, vars);
                    if (r !== null) {
                        appendOutput(r);
                        // Handle newlines
                        // If C++ and has endl, or if Python/Java logic implies newline
                        if (language === "python" || language === "java" || language === "kotlin" || language === "csharp" || language === "go") {
                            if (line.includes("println") || line.includes("WriteLine") || line.includes("Println")) {
                                appendOutput("\n");
                            }
                        } else if (language === "cpp") {
                            if (line.includes("endl")) {
                                appendOutput("\n");
                            }
                        } else if (language === "c") {
                            // printf handling
                        }
                    }
                }
            }
        }

        // ── 3. Input detection (C++ cin) ───────────────────────
        if ((language === "cpp" || language === "c") && t.includes("cin")) {
            const cinMatch = t.match(/cin\s*>>\s*(.+)/);
            if (cinMatch) {
                const parts = cinMatch[1].split(">>").map(p => p.trim().replace(/;$/, ""));
                let waiting = false;

                for (const p of parts) {
                    if (currentInputIdx < inputs.length) {
                        const val = inputs[currentInputIdx++];
                        vars.set(p, val);
                        arrayStates.set(p, [val]);
                        // Echo input
                        appendOutput(val);
                        appendOutput("\n");
                    } else {
                        waiting = true;
                        break;
                    }
                }

                if (waiting) {
                    // Capture output snapshot for this line before returning
                    outputMap.set(i, [...output]);
                    const processedLines = lines.slice(0, i + 1);
                    const partialSteps = genSteps(processedLines, language, vars, detectedArrays, arrayStates, loops, funcs, outputMap, extraSteps, unrolledRanges);
                    // Return accumulated output
                    return { steps: partialSteps, output, isWaitingForInput: true };
                }
            }
        }

        // ── 4. Output Snapshot ───────────────────────────────────────
        outputMap.set(i, [...output]);
    }

    // ── Generate steps ───────────────────────────────────────────
    const steps = genSteps(lines, language, vars, detectedArrays, arrayStates, loops, funcs, outputMap, extraSteps, unrolledRanges);
    return { steps, output, isWaitingForInput: false };
}

/* ─── Identifier Extraction for Autocomplete ──────────────────── */

export function extractIdentifiers(code: string, language: string): string[] {
    const lines = code.split("\n");
    const identifiers = new Set<string>();

    // 1. Functions
    const funcs = detectFunctions(lines, language);
    funcs.forEach(f => identifiers.add(f.name));

    // 2. Variables (simple regex scan)
    for (const line of lines) {
        const t = line.trim();
        // Skip comments
        if (isComment(t, language)) continue;

        for (const pat of ASSIGN_RES) {
            const m = t.match(pat);
            if (m) {
                identifiers.add(m[1]);
            }
        }

        // Python: for x in ...
        const forM = t.match(/^for\s+(\w+)\s+in/);
        if (forM) identifiers.add(forM[1]);

        // JS/TS/C/Java: for (int i = 0...)
        const cForM = t.match(/^for\s*\(\s*(?:int|let|var|auto)\s+(\w+)/);
        if (cForM) identifiers.add(cForM[1]);
    }

    return Array.from(identifiers);
}

function extractOutput(lines: string[], lang: string, vars: Map<string, string>): string[] {
    const out: string[] = [];
    const pats = PRINT_PATTERNS[lang] || PRINT_PATTERNS["python"];
    for (const line of lines) {
        for (const p of pats) {
            const m = line.match(p.regex);
            if (m) { const r = p.extract(m, vars); if (r !== null) out.push(r); }
        }
    }
    return out;
}

function genSteps(
    lines: string[], lang: string, vars: Map<string, string>,
    detectedArrays: DetectedArray[],
    arrayStates: Map<string, (number | string)[]>,
    loops: LoopInfo[], funcs: FuncDef[],
    outputMap: Map<number, string[]>,
    extraSteps: Step[] = [],
    unrolledRanges: { start: number; end: number }[] = []
): Step[] {
    const steps: Step[] = [];

    // Filter to meaningful lines (non-empty, non-comment, non-import, non-brace-only)
    const nonEmpty = lines.map((l, i) => ({ line: l.trim(), idx: i }))
        .filter(l => l.line.length > 0 && !isComment(l.line, lang) && !isImport(l.line, lang) && !isBrace(l.line));

    // Check if a line index falls within an unrolled loop body (not the header)
    const isInUnrolledBody = (idx: number): boolean => {
        for (const range of unrolledRanges) {
            // The header line (range.start) gets a normal step
            // Body lines (range.start + 1 to range.end) are replaced by extraSteps
            if (idx > range.start && idx <= range.end) return true;
        }
        return false;
    };

    // Find the unrolled range that starts at a given line
    const getUnrolledRangeAt = (idx: number): { start: number; end: number } | undefined => {
        return unrolledRanges.find(r => r.start === idx);
    };

    // Build accumulated variable state — show ALL known vars, marking changed ones
    const buildAllVars = (lineIdx: number): Variable[] => {
        const result: Variable[] = [];
        const changedOnThisLine = new Set<string>();

        // Check if this line assigns a variable
        const line = lines[lineIdx].trim();
        for (const pat of ASSIGN_RES) {
            const m = line.match(pat);
            if (m) changedOnThisLine.add(m[1]);
        }

        // Add ALL tracked variables  
        for (const [name, value] of vars.entries()) {
            // Skip internal/temp variables
            if (name === "_" || name.startsWith("__")) continue;
            const isArr = /^\[.*\]$/.test(value) || /^\{.*\}$/.test(value);
            const changed = changedOnThisLine.has(name);
            result.push(mkVar(name, value, isArr ? "list" : "int", changed));
        }

        return result;
    };

    // Build DS state from detected + mutated arrays
    const buildDS = (lineIdx: number): DataStructureState => {
        const ds = emptyDS();
        const activeLoop = loops.find(l => lineIdx >= l.startLine && lineIdx <= l.endLine);

        // Determine if we've passed a function call that mutates an array
        // (post-function-call, show the sorted/mutated state)
        const linesSoFar = lines.slice(0, lineIdx + 1);
        const funcCallsHappened = new Set<string>();
        for (const l of linesSoFar) {
            const t = l.trim();
            // Detect function calls: var = func(arr) or func(arr)
            const m = t.match(/(?:\w+\s*=\s*)?(\w+)\s*\(([^)]*)\)/);
            if (m) {
                const algo = detectAlgoFromName(m[1]);
                if (algo !== "unknown") {
                    const args = m[2].split(",").map(a => a.trim());
                    for (const arg of args) {
                        if (arrayStates.has(arg)) funcCallsHappened.add(arg);
                    }
                }
            }
        }

        // Show each detected array
        for (const arr of detectedArrays) {
            // Use mutated state if the function has been called
            const currentVals = funcCallsHappened.has(arr.name)
                ? (arrayStates.get(arr.name) || arr.values)
                : arr.values;

            const hl: { index: number; color: string; label?: string }[] = [];
            if (activeLoop) {
                // Determine if this loop iterates over this array
                const loopOverThis = activeLoop.arrayName === arr.name;
                if (loopOverThis || !activeLoop.arrayName) {
                    const progress = (lineIdx - activeLoop.startLine) / Math.max(1, activeLoop.endLine - activeLoop.startLine);
                    const idx = Math.min(Math.floor(progress * currentVals.length), currentVals.length - 1);
                    hl.push({ index: idx, color: "#e3b341", label: activeLoop.iterVar });
                }
            }

            ds.arrays.push({ name: arr.name, values: [...currentVals], highlights: hl });
        }

        // Also show arrays that were created as function results
        for (const [name, vals] of arrayStates.entries()) {
            if (!detectedArrays.find(a => a.name === name)) {
                // This is a derived array (e.g., sorted_data = sort(data))
                // Only show if it's been assigned by this point
                const assignLine = lines.findIndex(l => {
                    const t = l.trim();
                    return t.startsWith(name + " =") || t.startsWith(name + "=") ||
                        t.includes(`let ${name}`) || t.includes(`const ${name}`) || t.includes(`var ${name}`);
                });
                if (assignLine >= 0 && assignLine <= lineIdx) {
                    ds.arrays.push({ name, values: [...vals], highlights: [] });
                }
            }
        }

        return ds;
    };

    // Track current extraSteps index for insertion
    let extraIdx = 0;

    nonEmpty.forEach(({ line, idx }) => {
        // If this line is inside an unrolled loop body, skip it (handled by extraSteps)
        if (isInUnrolledBody(idx)) return;

        const trunc = line.length > 80 ? line.substring(0, 77) + "..." : line;
        steps.push({
            lineNumber: idx,
            variables: buildAllVars(idx),
            callStack: detectCallStack(line),
            ds: buildDS(idx),
            logMessage: `Line ${idx + 1}: ${trunc}`,
            annotation: annotation(line),
            output: outputMap.get(idx) || [],
        });

        // If this is a loop header, insert the unrolled iteration steps after it
        const range = getUnrolledRangeAt(idx);
        if (range) {
            while (extraIdx < extraSteps.length && extraSteps[extraIdx].lineNumber > range.start && extraSteps[extraIdx].lineNumber <= range.end) {
                steps.push(extraSteps[extraIdx++]);
            }
        }
    });

    // Append any remaining extra steps (safety)
    while (extraIdx < extraSteps.length) {
        steps.push(extraSteps[extraIdx++]);
    }

    return steps;
}
