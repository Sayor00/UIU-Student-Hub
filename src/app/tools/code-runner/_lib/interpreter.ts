/* ═══════════════════════════════════════════════════════════════
   Mini Python Interpreter
   Actually executes Python code step by step, tracking array
   mutations, variable changes, and generating visualization
   steps with real-time highlights.
   ═══════════════════════════════════════════════════════════════ */
import { Step, Variable, emptyDS, DataStructureState } from "./types";

export interface InterpResult {
    steps: Step[];
    output: string[];
    isWaitingForInput: boolean;
}

type Value = number | string | boolean | Value[] | null;

const MAX_STEPS = 500;

/* ═══════════════════════════════════════════════════════════════ */

interface FuncInfo {
    params: string[];
    start: number;
    end: number;
}

interface ArrayHighlight {
    arrayName: string;
    index: number;
    color: string;
    label?: string;
}

/* ═══════════════════════════════════════════════════════════════ */

export function interpretPython(code: string, inputs: string[] = []): InterpResult {
    try {
        const interp = new MiniPy(code, inputs);
        return interp.run();
    } catch (e) {
        // console.error(e);
        return { steps: [], output: [], isWaitingForInput: false };
    }
}

/* ═══════════════════════════════════════════════════════════════ */

class MiniPy {
    private lines: string[];
    private vars = new Map<string, Value>();
    private funcs = new Map<string, FuncInfo>();
    private steps: Step[] = [];
    private output: string[] = [];
    private callStack: string[] = ["main"];
    private stepCount = 0;
    private pendingHighlights: ArrayHighlight[] = [];
    // Track which variables changed on the current step
    private changedVars = new Set<string>();
    private inputs: string[];
    private inputIndex = 0;
    private isWaitingHook = false;

    constructor(code: string, inputs: string[]) {
        this.lines = code.split("\n");
        this.inputs = inputs;
    }

    run(): InterpResult {
        // First pass: find all function definitions
        for (let i = 0; i < this.lines.length; i++) {
            const t = this.lines[i].trim();
            const m = t.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:\s*$/);
            if (m) {
                const params = m[2].split(",").map(p => p.trim().split(/[:\s=]/)[0]).filter(Boolean);
                const end = this.blockEnd(i);
                this.funcs.set(m[1], { params, start: i + 1, end });
                i = end;
            }
        }

        // Second pass: execute top-level code
        try {
            this.execBlock(0, this.lines.length - 1, 0);
        } catch (e) {
            if (e instanceof Error && e.message === "WAIT_INPUT") {
                this.isWaitingHook = true;
            } else {
                throw e;
            }
        }
        return { steps: this.steps, output: this.output, isWaitingForInput: this.isWaitingHook };
    }

    /* ─── Block execution ─────────────────────────────────────── */

    private execBlock(start: number, end: number, minIndent: number): Value | undefined {
        let pc = start;
        while (pc <= end && this.stepCount < MAX_STEPS) {
            const raw = this.lines[pc];
            if (raw === undefined) break;
            const indent = this.getIndent(raw);
            const line = raw.trim();

            // Skip empty lines and comments
            if (line === "" || line.startsWith("#")) { pc++; continue; }
            // If we've dedented past our block, stop
            if (indent < minIndent && pc > start) break;

            // Skip function definitions (already parsed)
            if (line.startsWith("def ")) {
                pc = this.blockEnd(pc) + 1;
                continue;
            }

            // ── For loop ────────────────────────────────────────
            const forM = line.match(/^for\s+(\w+)\s+in\s+range\((.+)\)\s*:\s*$/);
            if (forM) {
                const iterVar = forM[1];
                const rangeVals = this.evalRange(forM[2]);
                const bodyEnd = this.blockEnd(pc);

                for (const val of rangeVals) {
                    if (this.stepCount >= MAX_STEPS) break;
                    this.vars.set(iterVar, val);
                    this.changedVars.add(iterVar);
                    const ret = this.execBlock(pc + 1, bodyEnd, indent + 1);
                    if (ret !== undefined) return ret;
                }
                pc = bodyEnd + 1;
                continue;
            }

            // ── For-in (iterate over list) ──────────────────────
            const forInM = line.match(/^for\s+(\w+)\s+in\s+(\w+)\s*:\s*$/);
            if (forInM) {
                const iterVar = forInM[1];
                const listVal = this.vars.get(forInM[2]);
                const bodyEnd = this.blockEnd(pc);

                if (Array.isArray(listVal)) {
                    for (const val of listVal) {
                        if (this.stepCount >= MAX_STEPS) break;
                        this.vars.set(iterVar, val);
                        this.changedVars.add(iterVar);
                        const ret = this.execBlock(pc + 1, bodyEnd, indent + 1);
                        if (ret !== undefined) return ret;
                    }
                }
                pc = bodyEnd + 1;
                continue;
            }

            // ── While loop ──────────────────────────────────────
            const whileM = line.match(/^while\s+(.+)\s*:\s*$/);
            if (whileM) {
                const bodyEnd = this.blockEnd(pc);
                let guard = 0;
                while (this.truthy(this.evalExpr(whileM[1])) && this.stepCount < MAX_STEPS && guard < 10000) {
                    guard++;
                    const ret = this.execBlock(pc + 1, bodyEnd, indent + 1);
                    if (ret !== undefined) return ret;
                }
                pc = bodyEnd + 1;
                continue;
            }

            // ── If / elif / else ────────────────────────────────
            if (line.startsWith("if ") && line.endsWith(":")) {
                const branches = this.collectBranches(pc, end, indent);
                let executed = false;

                for (const br of branches) {
                    if (this.stepCount >= MAX_STEPS) break;
                    if (br.type === "if" || br.type === "elif") {
                        const condResult = this.truthy(this.evalExpr(br.condition!));
                        // Record step for the condition check
                        this.recordStep(br.lineNum, condResult ? "Condition is true" : "Condition is false");
                        if (condResult) {
                            this.execBlock(br.bodyStart, br.bodyEnd, indent + 1);
                            executed = true;
                            break;
                        }
                    } else if (br.type === "else" && !executed) {
                        this.recordStep(br.lineNum, "Else branch");
                        this.execBlock(br.bodyStart, br.bodyEnd, indent + 1);
                        executed = true;
                        break;
                    }
                }

                pc = branches[branches.length - 1].bodyEnd + 1;
                continue;
            }

            // ── Return ──────────────────────────────────────────
            if (line.startsWith("return ")) {
                const val = this.evalExpr(line.slice(7).trim());
                this.recordStep(pc, `Returning ${this.fmt(val)}`);
                return val;
            }
            if (line === "return") {
                this.recordStep(pc, "Returning");
                return null;
            }

            // ── Print ───────────────────────────────────────────
            const printM = line.match(/^print\((.+)\)$/);
            if (printM) {
                const args = this.smartSplit(printM[1], ",");
                const parts = args.map(a => this.fmt(this.evalExpr(a.trim())));
                this.output.push(parts.join(" "));
                this.recordStep(pc, "Output");
                pc++;
                continue;
            }

            // ── Tuple swap: arr[i], arr[j] = arr[j], arr[i] ────
            const swapM = line.match(/^(\w+)\[(.+?)\]\s*,\s*(\w+)\[(.+?)\]\s*=\s*(\w+)\[(.+?)\]\s*,\s*(\w+)\[(.+?)\]$/);
            if (swapM) {
                const arrName1 = swapM[1], arrName2 = swapM[3];
                const idx1 = this.asNum(this.evalExpr(swapM[2]));
                const idx2 = this.asNum(this.evalExpr(swapM[4]));

                const arr1 = this.vars.get(arrName1);
                const arr2 = this.vars.get(arrName2);

                if (Array.isArray(arr1) && Array.isArray(arr2) && idx1 !== null && idx2 !== null) {
                    const rIdx1 = this.asNum(this.evalExpr(swapM[6]));
                    const rIdx2 = this.asNum(this.evalExpr(swapM[8]));

                    if (rIdx1 !== null && rIdx2 !== null) {
                        const val1 = arr1[rIdx1];
                        const val2 = arr2[rIdx2];

                        // Perform the swap
                        arr1[idx1] = val1;
                        arr2[idx2] = val2;

                        // Highlight swapped positions
                        this.pendingHighlights = [
                            { arrayName: arrName1, index: idx1, color: "#3fb950", label: "swap" },
                            { arrayName: arrName1, index: idx2, color: "#3fb950", label: "swap" },
                        ];
                        this.changedVars.add(arrName1);
                    }
                }
                this.recordStep(pc, "Swapping elements");
                pc++;
                continue;
            }

            // ── Augmented assignment: x += expr, x -= expr, etc.
            const augM = line.match(/^(\w+)\s*(\+=|-=|\*=|\/=|%=)\s*(.+)$/);
            if (augM) {
                const varName = augM[1];
                const op = augM[2];
                const rhs = this.evalExpr(augM[3]);
                const cur = this.vars.get(varName);
                if (typeof cur === "number" && typeof rhs === "number") {
                    switch (op) {
                        case "+=": this.vars.set(varName, cur + rhs); break;
                        case "-=": this.vars.set(varName, cur - rhs); break;
                        case "*=": this.vars.set(varName, cur * rhs); break;
                        case "/=": this.vars.set(varName, Math.floor(cur / rhs)); break;
                        case "%=": this.vars.set(varName, cur % rhs); break;
                    }
                    this.changedVars.add(varName);
                }
                this.recordStep(pc, `${varName} ${op} ${this.fmt(rhs)}`);
                pc++;
                continue;
            }

            // ── Array element assignment: arr[i] = expr ─────────
            const arrAssignM = line.match(/^(\w+)\[(.+?)\]\s*=\s*(.+)$/);
            if (arrAssignM) {
                const arrName = arrAssignM[1];
                const idx = this.asNum(this.evalExpr(arrAssignM[2]));
                const val = this.evalExpr(arrAssignM[3]);
                const arr = this.vars.get(arrName);

                if (Array.isArray(arr) && idx !== null) {
                    arr[idx] = val;
                    this.pendingHighlights = [
                        { arrayName: arrName, index: idx, color: "#e3b341", label: "set" },
                    ];
                    this.changedVars.add(arrName);
                }
                this.recordStep(pc, `${arrName}[${idx}] = ${this.fmt(val)}`);
                pc++;
                continue;
            }

            // ── Variable assignment: x = expr ───────────────────
            const assignM = line.match(/^(\w+)\s*=\s*(.+)$/);
            if (assignM && !line.startsWith("def ") && !line.includes("==")) {
                const varName = assignM[1];
                const rhs = assignM[2].trim();

                // Check if it's a function call: var = func(args)
                const funcCallM = rhs.match(/^(\w+)\((.*)?\)$/);
                if (funcCallM && this.funcs.has(funcCallM[1])) {
                    // Call the function
                    const funcName = funcCallM[1];
                    const args = funcCallM[2] ? this.smartSplit(funcCallM[2], ",").map(a => this.evalExpr(a.trim())) : [];
                    this.callStack.push(funcName);
                    this.recordStep(pc, `Calling ${funcName}()`);
                    const result = this.callFunc(funcName, args);
                    this.callStack.pop();
                    this.vars.set(varName, result);
                    this.changedVars.add(varName);
                    this.recordStep(pc, `${varName} = ${this.fmt(result)}`);
                } else {
                    const val = this.evalExpr(rhs);
                    // Deep copy arrays to prevent aliasing
                    this.vars.set(varName, Array.isArray(val) ? [...val] : val);
                    this.changedVars.add(varName);
                    this.recordStep(pc, `Assigning ${varName} = ${this.fmt(val)}`);
                }
                pc++;
                continue;
            }

            // ── Standalone function call: func(args) ────────────
            const standaloneCallM = line.match(/^(\w+)\((.*)?\)$/);
            if (standaloneCallM && this.funcs.has(standaloneCallM[1])) {
                const funcName = standaloneCallM[1];
                const args = standaloneCallM[2] ? this.smartSplit(standaloneCallM[2], ",").map(a => this.evalExpr(a.trim())) : [];
                this.callStack.push(funcName);
                this.recordStep(pc, `Calling ${funcName}()`);
                this.callFunc(funcName, args);
                this.callStack.pop();
                pc++;
                continue;
            }

            // Fallback: unknown line, skip
            pc++;
        }

        return undefined;
    }

    /* ─── Function calling ────────────────────────────────────── */

    private callFunc(name: string, args: Value[]): Value {
        const func = this.funcs.get(name);
        if (!func) return null;

        // Save current vars and set params
        const savedVars = new Map(this.vars);

        // Bind parameters — pass arrays by reference (same object)
        for (let i = 0; i < func.params.length; i++) {
            const paramName = func.params[i];
            const argVal = i < args.length ? args[i] : null;
            this.vars.set(paramName, argVal);
        }

        const result = this.execBlock(func.start, func.end, this.getIndent(this.lines[func.start]));

        // Restore vars but keep any array mutations (pass by reference effect)
        // Copy back any arrays that were modified
        const paramArrays = new Map<string, Value>();
        for (let i = 0; i < func.params.length; i++) {
            const paramName = func.params[i];
            const val = this.vars.get(paramName);
            if (Array.isArray(val)) {
                // Find the corresponding arg name in the caller's scope
                paramArrays.set(paramName, val);
            }
        }

        // Restore caller's scope
        this.vars = savedVars;

        // Update arrays that were modified by reference
        for (const [paramName, val] of paramArrays) {
            // Find which variable in the caller maps to this param
            for (const [callerVar, callerVal] of savedVars) {
                if (Array.isArray(callerVal) && Array.isArray(val)) {
                    // If the caller variable was passed as this param, update it
                    const paramIdx = func.params.indexOf(paramName);
                    if (paramIdx >= 0 && paramIdx < args.length) {
                        // Check if the argument was this caller variable
                        if (callerVal === args[paramIdx]) {
                            // Update the array in place
                            callerVal.length = 0;
                            (val as Value[]).forEach(v => (callerVal as Value[]).push(v));
                        }
                    }
                }
            }
        }

        return result !== undefined ? result : null;
    }

    /* ─── Expression evaluation ───────────────────────────────── */

    private evalExpr(expr: string): Value {
        expr = expr.trim();
        if (expr === "") return null;

        // ── Boolean operators (lowest precedence) ────────────────
        let idx = this.findOp(expr, " or ");
        if (idx >= 0) {
            const l = this.evalExpr(expr.slice(0, idx));
            const r = this.evalExpr(expr.slice(idx + 4));
            return this.truthy(l) ? l : r;
        }
        idx = this.findOp(expr, " and ");
        if (idx >= 0) {
            const l = this.evalExpr(expr.slice(0, idx));
            const r = this.evalExpr(expr.slice(idx + 5));
            return this.truthy(l) ? r : l;
        }
        if (expr.startsWith("not ")) {
            return !this.truthy(this.evalExpr(expr.slice(4)));
        }

        // ── Comparison operators ─────────────────────────────────
        for (const op of ["!=", "<=", ">=", "==", "<", ">"]) {
            idx = this.findOp(expr, op);
            if (idx >= 0) {
                const l = this.evalExpr(expr.slice(0, idx));
                const r = this.evalExpr(expr.slice(idx + op.length));
                // Track array access highlights for comparisons
                this.trackComparisonHighlights(expr.slice(0, idx).trim(), expr.slice(idx + op.length).trim());
                return this.compare(l, r, op);
            }
        }

        // ── Addition / subtraction ───────────────────────────────
        idx = this.findOpRL(expr, "+");
        if (idx > 0) {
            const l = this.evalExpr(expr.slice(0, idx));
            const r = this.evalExpr(expr.slice(idx + 1));
            if (typeof l === "number" && typeof r === "number") return l + r;
            if (typeof l === "string" || typeof r === "string") return String(l) + String(r);
            // List concatenation
            if (Array.isArray(l) && Array.isArray(r)) return [...l, ...r];
            return null;
        }
        idx = this.findOpRL(expr, "-");
        if (idx > 0 && expr[idx - 1] !== "(" && expr[idx - 1] !== ",") {
            const l = this.evalExpr(expr.slice(0, idx));
            const r = this.evalExpr(expr.slice(idx + 1));
            if (typeof l === "number" && typeof r === "number") return l - r;
            return null;
        }

        // ── Multiplication / division ────────────────────────────
        for (const op of ["//", "*", "/", "%"]) {
            idx = this.findOpRL(expr, op);
            if (idx > 0) {
                const l = this.evalExpr(expr.slice(0, idx));
                const r = this.evalExpr(expr.slice(idx + op.length));
                if (typeof l === "number" && typeof r === "number") {
                    switch (op) {
                        case "*": return l * r;
                        case "/": return r !== 0 ? l / r : 0;
                        case "//": return r !== 0 ? Math.floor(l / r) : 0;
                        case "%": return r !== 0 ? l % r : 0;
                    }
                }
                return null;
            }
        }

        // ── Parenthesized expression ─────────────────────────────
        if (expr.startsWith("(") && this.matchParen(expr, 0) === expr.length - 1) {
            return this.evalExpr(expr.slice(1, -1));
        }

        // ── Array literal ────────────────────────────────────────
        if (expr.startsWith("[") && expr.endsWith("]")) {
            const inner = expr.slice(1, -1).trim();
            if (inner === "") return [];
            const items = this.smartSplit(inner, ",");
            return items.map(it => this.evalExpr(it.trim()));
        }

        // ── Function calls ───────────────────────────────────────
        const funcM = expr.match(/^(\w+)\((.*)?\)$/);
        if (funcM) {
            const name = funcM[1];
            const rawArgs = funcM[2] || "";
            const args = rawArgs.trim() ? this.smartSplit(rawArgs, ",").map(a => this.evalExpr(a.trim())) : [];

            // Built-in functions
            if (name === "len") {
                const v = args[0];
                return Array.isArray(v) ? v.length : (typeof v === "string" ? v.length : 0);
            }
            if (name === "range") return null; // handled in for-loop
            if (name === "min") {
                if (args.length === 1 && Array.isArray(args[0])) return Math.min(...(args[0] as number[]));
                return Math.min(...args.filter(a => typeof a === "number") as number[]);
            }
            if (name === "max") {
                if (args.length === 1 && Array.isArray(args[0])) return Math.max(...(args[0] as number[]));
                return Math.max(...args.filter(a => typeof a === "number") as number[]);
            }
            if (name === "abs") return typeof args[0] === "number" ? Math.abs(args[0]) : 0;
            if (name === "sorted") {
                if (Array.isArray(args[0])) {
                    return [...args[0]].sort((a, b) => {
                        if (typeof a === "number" && typeof b === "number") return a - b;
                        return String(a).localeCompare(String(b));
                    });
                }
                return args[0];
            }
            if (name === "list") return Array.isArray(args[0]) ? [...args[0]] : [];
            if (name === "int") return typeof args[0] === "number" ? Math.floor(args[0]) : (typeof args[0] === "string" ? parseInt(args[0]) || 0 : 0);
            if (name === "str") return String(args[0]);
            if (name === "enumerate" || name === "zip") return args[0]; // simplified

            // Input function
            if (name === "input") {
                const promptMsg = args[0] ? this.fmt(args[0]) : "";
                if (promptMsg) {
                    this.output.push(promptMsg);
                    this.recordStep(this.stepCount > 0 ? this.steps[this.steps.length - 1].lineNumber : 0, "Prompting for input");
                }

                if (this.inputIndex < this.inputs.length) {
                    const inputVal = this.inputs[this.inputIndex++];
                    this.output.push(inputVal + "\n"); // Echo input
                    return inputVal;
                } else {
                    // Halt execution
                    throw new Error("WAIT_INPUT");
                }
            }

            // User-defined function
            if (this.funcs.has(name)) {
                this.callStack.push(name);
                const result = this.callFunc(name, args);
                this.callStack.pop();
                return result;
            }

            return null;
        }

        // ── Array access: name[expr] ─────────────────────────────
        const arrAccM = expr.match(/^(\w+)\[(.+)\]$/);
        if (arrAccM) {
            const arr = this.vars.get(arrAccM[1]);
            const idxVal = this.asNum(this.evalExpr(arrAccM[2]));
            if (Array.isArray(arr) && idxVal !== null) {
                return arr[idxVal] as Value;
            }
            return null;
        }

        // ── Boolean literals ─────────────────────────────────────
        if (expr === "True" || expr === "true") return true;
        if (expr === "False" || expr === "false") return false;
        if (expr === "None" || expr === "null") return null;

        // ── Numeric literal ──────────────────────────────────────
        if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);

        // ── String literal ───────────────────────────────────────
        if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
            return expr.slice(1, -1);
        }
        // f-string
        if (expr.startsWith('f"') && expr.endsWith('"')) {
            let s = expr.slice(2, -1);
            s = s.replace(/\{([^}]+)\}/g, (_, e) => this.fmt(this.evalExpr(e.trim())));
            return s;
        }

        // ── Variable reference ───────────────────────────────────
        if (this.vars.has(expr)) {
            return this.vars.get(expr)!;
        }

        // Unresolved
        return null;
    }

    /* ─── Track highlights for array comparisons ──────────────── */

    private trackComparisonHighlights(leftExpr: string, rightExpr: string) {
        const leftAccess = leftExpr.match(/^(\w+)\[(.+)\]$/);
        const rightAccess = rightExpr.match(/^(\w+)\[(.+)\]$/);

        if (leftAccess) {
            const idx = this.asNum(this.evalExpr(leftAccess[2]));
            if (idx !== null) {
                this.pendingHighlights.push({
                    arrayName: leftAccess[1],
                    index: idx,
                    color: "#e3b341",
                    label: leftAccess[2],
                });
            }
        }
        if (rightAccess) {
            const idx = this.asNum(this.evalExpr(rightAccess[2]));
            if (idx !== null) {
                this.pendingHighlights.push({
                    arrayName: rightAccess[1],
                    index: idx,
                    color: "#58a6ff",
                    label: rightAccess[2],
                });
            }
        }
    }

    /* ─── Step recording ──────────────────────────────────────── */

    private recordStep(lineNum: number, annotationText: string) {
        if (this.stepCount >= MAX_STEPS) return;
        this.stepCount++;

        const ds = this.buildDS();
        const variables = this.buildVarList();
        const lineText = this.lines[lineNum]?.trim() || "";
        const trunc = lineText.length > 80 ? lineText.substring(0, 77) + "..." : lineText;

        this.steps.push({
            lineNumber: lineNum,
            variables,
            callStack: [...this.callStack],
            ds,
            logMessage: `Line ${lineNum + 1}: ${trunc}`,
            annotation: annotationText,
        });

        // Clear highlights and changed vars after recording
        this.pendingHighlights = [];
        this.changedVars.clear();
    }

    /* ─── Build data structure state ──────────────────────────── */

    private buildDS(): DataStructureState {
        const ds = emptyDS();
        const seenArrays = new Map<any, number>(); // Map object reference -> index in ds.arrays

        for (const [name, val] of this.vars) {
            if (Array.isArray(val) && val.length > 0 && val.every(v => typeof v === "number" || typeof v === "string")) {
                const highlights = this.pendingHighlights
                    .filter(h => h.arrayName === name)
                    .map(h => ({ index: h.index, color: h.color, label: h.label }));

                if (seenArrays.has(val)) {
                    // We've already seen this array object (aliasing), just append the name
                    const idx = seenArrays.get(val)!;
                    ds.arrays[idx].name += `, ${name}`;
                    // Merge highlights (deduplicated by index)
                    const existing = ds.arrays[idx].highlights;
                    if (existing) {
                        for (const h of highlights) {
                            if (!existing.some(eh => eh.index === h.index && eh.color === h.color)) {
                                existing.push(h);
                            }
                        }
                    } else {
                        ds.arrays[idx].highlights = highlights;
                    }
                } else {
                    // New array object
                    ds.arrays.push({
                        name,
                        values: [...val] as (number | string)[],
                        highlights,
                    });
                    seenArrays.set(val, ds.arrays.length - 1);
                }
            }
        }

        return ds;
    }

    /* ─── Build variable list ─────────────────────────────────── */

    private buildVarList(): Variable[] {
        const result: Variable[] = [];
        for (const [name, val] of this.vars) {
            if (name.startsWith("_")) continue;
            const type = Array.isArray(val) ? "list" : typeof val === "number" ? "int" : typeof val === "string" ? "str" : "bool";
            // Snapshot the value (deep copy arrays so mutations don't affect recorded steps)
            const snapshotValue = this.fmt(val);
            result.push({
                name,
                value: snapshotValue,
                type,
                changed: this.changedVars.has(name),
            });
        }
        return result;
    }

    /* ─── Helpers ─────────────────────────────────────────────── */

    private evalRange(argsStr: string): number[] {
        const args = this.smartSplit(argsStr, ",").map(a => this.asNum(this.evalExpr(a.trim())) ?? 0);
        let start = 0, end = 0, step = 1;
        if (args.length === 1) { end = args[0]; }
        else if (args.length === 2) { start = args[0]; end = args[1]; }
        else if (args.length >= 3) { start = args[0]; end = args[1]; step = args[2] || 1; }

        const result: number[] = [];
        if (step > 0) { for (let i = start; i < end; i += step) result.push(i); }
        else if (step < 0) { for (let i = start; i > end; i += step) result.push(i); }
        return result;
    }

    private blockEnd(start: number): number {
        const ind = this.getIndent(this.lines[start]);
        for (let i = start + 1; i < this.lines.length; i++) {
            if (this.lines[i].trim() !== "" && this.getIndent(this.lines[i]) <= ind) return i - 1;
        }
        return this.lines.length - 1;
    }

    private getIndent(line: string): number {
        const m = line.match(/^(\s*)/);
        return m ? m[1].length : 0;
    }

    private collectBranches(start: number, end: number, indent: number): { type: string; condition?: string; lineNum: number; bodyStart: number; bodyEnd: number }[] {
        const branches: { type: string; condition?: string; lineNum: number; bodyStart: number; bodyEnd: number }[] = [];
        let pc = start;

        while (pc <= end) {
            const line = this.lines[pc].trim();
            const lineIndent = this.getIndent(this.lines[pc]);

            if (lineIndent !== indent) { pc++; continue; }

            if (line.startsWith("if ") && line.endsWith(":") && branches.length === 0) {
                const bodyEnd = this.blockEnd(pc);
                branches.push({ type: "if", condition: line.slice(3, -1).trim(), lineNum: pc, bodyStart: pc + 1, bodyEnd });
                pc = bodyEnd + 1;
            } else if (line.startsWith("elif ") && line.endsWith(":")) {
                const bodyEnd = this.blockEnd(pc);
                branches.push({ type: "elif", condition: line.slice(5, -1).trim(), lineNum: pc, bodyStart: pc + 1, bodyEnd });
                pc = bodyEnd + 1;
            } else if (line === "else:" || line.startsWith("else:")) {
                const bodyEnd = this.blockEnd(pc);
                branches.push({ type: "else", lineNum: pc, bodyStart: pc + 1, bodyEnd });
                pc = bodyEnd + 1;
                break;
            } else {
                break;
            }
        }

        if (branches.length === 0) {
            const bodyEnd = this.blockEnd(start);
            branches.push({ type: "if", condition: "true", lineNum: start, bodyStart: start + 1, bodyEnd });
        }

        return branches;
    }

    private truthy(val: Value): boolean {
        if (val === null || val === false || val === 0 || val === "") return false;
        if (Array.isArray(val)) return val.length > 0;
        return true;
    }

    private compare(a: Value, b: Value, op: string): boolean {
        const na = typeof a === "number" ? a : Number(a);
        const nb = typeof b === "number" ? b : Number(b);
        const useNum = !isNaN(na) && !isNaN(nb);

        switch (op) {
            case "==": return useNum ? na === nb : a === b;
            case "!=": return useNum ? na !== nb : a !== b;
            case "<": return useNum ? na < nb : String(a) < String(b);
            case ">": return useNum ? na > nb : String(a) > String(b);
            case "<=": return useNum ? na <= nb : String(a) <= String(b);
            case ">=": return useNum ? na >= nb : String(a) >= String(b);
            default: return false;
        }
    }

    private asNum(val: Value): number | null {
        if (typeof val === "number") return val;
        if (typeof val === "string") { const n = Number(val); return isNaN(n) ? null : n; }
        return null;
    }

    private fmt(val: Value): string {
        if (val === null) return "None";
        if (typeof val === "boolean") return val ? "True" : "False";
        if (Array.isArray(val)) return `[${val.map(v => this.fmt(v)).join(", ")}]`;
        return String(val);
    }

    /** Find operator at top level (not inside brackets/strings), left to right */
    private findOp(expr: string, op: string): number {
        let depth = 0;
        let inStr: string | null = null;
        for (let i = 0; i <= expr.length - op.length; i++) {
            const ch = expr[i];
            if (inStr) { if (ch === inStr && expr[i - 1] !== "\\") inStr = null; continue; }
            if (ch === '"' || ch === "'") { inStr = ch; continue; }
            if ("([".includes(ch)) { depth++; continue; }
            if (")]".includes(ch)) { depth--; continue; }
            if (depth === 0 && expr.slice(i, i + op.length) === op) return i;
        }
        return -1;
    }

    /** Find operator right to left for left-associative operations */
    private findOpRL(expr: string, op: string): number {
        let depth = 0;
        let inStr: string | null = null;
        let lastFound = -1;
        for (let i = 0; i <= expr.length - op.length; i++) {
            const ch = expr[i];
            if (inStr) { if (ch === inStr && expr[i - 1] !== "\\") inStr = null; continue; }
            if (ch === '"' || ch === "'") { inStr = ch; continue; }
            if ("([".includes(ch)) { depth++; continue; }
            if (")]".includes(ch)) { depth--; continue; }
            if (depth === 0 && expr.slice(i, i + op.length) === op) {
                // For - and +, make sure it's not a unary operator (preceded by another operator or nothing)
                if ((op === "-" || op === "+") && i > 0) {
                    const prev = expr[i - 1];
                    if ("=<>!+-*/%(".includes(prev) || expr.slice(Math.max(0, i - 2), i).trim() === ",") continue;
                }
                lastFound = i;
            }
        }
        return lastFound;
    }

    /** Find matching closing paren */
    private matchParen(expr: string, start: number): number {
        let depth = 0;
        for (let i = start; i < expr.length; i++) {
            if (expr[i] === "(") depth++;
            if (expr[i] === ")") { depth--; if (depth === 0) return i; }
        }
        return -1;
    }

    /** Split by delimiter, respecting brackets and strings */
    private smartSplit(s: string, delim: string): string[] {
        const result: string[] = [];
        let depth = 0;
        let inStr: string | null = null;
        let cur = "";
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (inStr) {
                cur += ch;
                if (ch === inStr && s[i - 1] !== "\\") inStr = null;
            } else if (ch === '"' || ch === "'" || ch === '`') {
                inStr = ch; cur += ch;
            } else if ("([{".includes(ch)) {
                depth++; cur += ch;
            } else if (")]}".includes(ch)) {
                depth--; cur += ch;
            } else if (depth === 0 && s.slice(i, i + delim.length) === delim) {
                result.push(cur);
                cur = "";
                i += delim.length - 1;
            } else {
                cur += ch;
            }
        }
        if (cur.trim()) result.push(cur);
        return result;
    }
}
