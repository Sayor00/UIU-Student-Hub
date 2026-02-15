/* ═══════════════════════════════════════════════════════════════
   Types, constants & language definitions
   ═══════════════════════════════════════════════════════════════ */

// ─── Color palette ───────────────────────────────────────────
export const C = {
    bg: "#0d1117",
    bgPanel: "#161b22",
    bgEditor: "#0d1117",
    bgGutter: "#161b22",
    border: "#30363d",
    borderHover: "#484f58",
    text: "#c9d1d9",
    textMuted: "#8b949e",
    textDim: "#484f58",
    accent: "#58a6ff",
    cyan: "#39d0d8",
    violet: "#bc8cff",
    amber: "#e3b341",
    green: "#3fb950",
    red: "#f85149",
    orange: "#d29922",
    pink: "#f778ba",
    activeLine: "rgba(56,139,253,0.1)",
    activeGlow: "rgba(56,139,253,0.4)",
    selection: "rgba(56,139,253,0.2)",
} as const;

// ─── Data-structure state types ──────────────────────────────
export interface ArrayState {
    name: string;
    values: (number | string)[];
    highlights: { index: number; color: string; label?: string }[];
    swapping?: [number, number];
}

export interface LinkedListNode {
    id: number;
    value: number | string;
    next: number | null;
}
export interface LinkedListState {
    name: string;
    nodes: LinkedListNode[];
    headId: number | null;
    highlightId: number | null;
}

export interface StackState {
    name: string;
    items: (number | string)[];
    highlightTop?: boolean;
    action?: "push" | "pop" | null;
}

export interface QueueState {
    name: string;
    items: (number | string)[];
    action?: "enqueue" | "dequeue" | null;
}

export interface BSTNode {
    id: number;
    value: number;
    left: number | null;
    right: number | null;
}
export interface BSTState {
    name: string;
    nodes: BSTNode[];
    rootId: number | null;
    highlightIds: number[];
    pathIds: number[];
}

export interface HashMapBucket {
    key: string;
    value: number | string;
}
export interface HashMapState {
    name: string;
    buckets: HashMapBucket[][];
    size: number;
    highlightBucket: number | null;
    highlightKey: string | null;
}

export interface GraphEdge {
    from: string;
    to: string;
}
export interface GraphState {
    name: string;
    nodes: string[];
    edges: GraphEdge[];
    visited: string[];
    frontier: string[];
    queue?: string[];
}

export interface HeapState {
    name: string;
    items: number[];
    highlightIndices: number[];
    swapping?: [number, number];
}

export interface DataStructureState {
    arrays: ArrayState[];
    linkedLists: LinkedListState[];
    stacks: StackState[];
    queues: QueueState[];
    bsts: BSTState[];
    hashMaps: HashMapState[];
    graphs: GraphState[];
    heaps: HeapState[];
}

export const emptyDS = (): DataStructureState => ({
    arrays: [],
    linkedLists: [],
    stacks: [],
    queues: [],
    bsts: [],
    hashMaps: [],
    graphs: [],
    heaps: [],
});

// ─── Simulation step ─────────────────────────────────────────
export interface Variable {
    name: string;
    value: string;
    type: string;
    changed?: boolean;
}

export interface Step {
    lineNumber: number;
    variables: Variable[];
    callStack: string[];
    ds: DataStructureState;
    logMessage: string;
    annotation: string;
    output?: string[];
}

// ─── File tab ────────────────────────────────────────────────
export interface FileTab {
    id: string;
    name: string;
    language: string;
    code: string;
    history?: string[];
    historyIndex?: number;
}

// ─── Language config ─────────────────────────────────────────
export interface LangDef {
    id: string;
    label: string;
    icon: string;
    keywords: string[];
    types: string[];
    builtins: string[];
    commentLine: string;
    commentBlockOpen: string;
    commentBlockClose: string;
    strDelims: string[];
}

export const LANGUAGES: LangDef[] = [
    {
        id: "python",
        label: "Python",
        icon: "🐍",
        keywords: ["def", "class", "if", "elif", "else", "for", "while", "return", "import", "from", "as", "try", "except", "finally", "with", "yield", "lambda", "pass", "break", "continue", "in", "not", "and", "or", "is", "None", "True", "False", "raise", "global", "nonlocal", "del", "assert", "print", "range", "len", "append", "pop", "self"],
        types: ["int", "float", "str", "list", "dict", "set", "tuple", "bool"],
        builtins: ["print", "range", "len", "int", "float", "str", "list", "dict", "set", "input", "type", "sorted", "enumerate", "zip", "map", "filter", "max", "min", "sum", "abs"],
        commentLine: "#",
        commentBlockOpen: '"""',
        commentBlockClose: '"""',
        strDelims: ["'", '"'],
    },
    {
        id: "javascript",
        label: "JavaScript",
        icon: "JS",
        keywords: ["function", "const", "let", "var", "if", "else", "for", "while", "do", "return", "class", "new", "this", "switch", "case", "break", "continue", "try", "catch", "throw", "finally", "typeof", "instanceof", "of", "in", "async", "await", "yield", "export", "import", "default", "from", "true", "false", "null", "undefined", "void", "delete"],
        types: ["Array", "Object", "String", "Number", "Boolean", "Map", "Set", "Promise"],
        builtins: ["console", "log", "push", "pop", "shift", "unshift", "splice", "slice", "map", "filter", "reduce", "forEach", "length", "Math", "JSON", "parseInt", "parseFloat"],
        commentLine: "//",
        commentBlockOpen: "/*",
        commentBlockClose: "*/",
        strDelims: ["'", '"', "`"],
    },
    {
        id: "typescript",
        label: "TypeScript",
        icon: "TS",
        keywords: ["function", "const", "let", "var", "if", "else", "for", "while", "do", "return", "class", "new", "this", "interface", "type", "enum", "switch", "case", "break", "continue", "try", "catch", "throw", "finally", "typeof", "instanceof", "as", "implements", "extends", "abstract", "readonly", "public", "private", "protected", "async", "await", "export", "import", "default", "from", "true", "false", "null", "undefined"],
        types: ["number", "string", "boolean", "void", "any", "never", "unknown", "Array", "Record", "Partial", "Required", "Pick", "Omit", "Promise"],
        builtins: ["console", "log", "push", "pop", "shift", "unshift", "map", "filter", "reduce", "forEach", "length", "Math", "JSON"],
        commentLine: "//",
        commentBlockOpen: "/*",
        commentBlockClose: "*/",
        strDelims: ["'", '"', "`"],
    },
    {
        id: "java",
        label: "Java",
        icon: "☕",
        keywords: ["public", "private", "protected", "static", "final", "abstract", "class", "interface", "extends", "implements", "new", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "throw", "throws", "finally", "void", "import", "package", "this", "super", "instanceof", "true", "false", "null"],
        types: ["int", "long", "float", "double", "boolean", "char", "byte", "short", "String", "Integer", "ArrayList", "LinkedList", "HashMap", "HashSet", "Queue", "Stack", "TreeMap"],
        builtins: ["System", "out", "println", "print", "length", "size", "add", "remove", "get", "set", "put", "contains", "isEmpty", "toString", "Math"],
        commentLine: "//",
        commentBlockOpen: "/*",
        commentBlockClose: "*/",
        strDelims: ['"'],
    },
    {
        id: "c",
        label: "C",
        icon: "C",
        keywords: ["if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return", "typedef", "struct", "enum", "union", "sizeof", "static", "extern", "const", "volatile", "register", "goto", "default", "NULL"],
        types: ["int", "float", "double", "char", "void", "long", "short", "unsigned", "signed", "size_t"],
        builtins: ["printf", "scanf", "malloc", "free", "calloc", "realloc", "sizeof", "strlen", "strcpy", "strcmp", "memcpy", "memset"],
        commentLine: "//",
        commentBlockOpen: "/*",
        commentBlockClose: "*/",
        strDelims: ['"'],
    },
    {
        id: "cpp",
        label: "C++",
        icon: "C+",
        keywords: ["if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return", "class", "struct", "public", "private", "protected", "virtual", "override", "const", "static", "new", "delete", "template", "typename", "namespace", "using", "try", "catch", "throw", "auto", "nullptr", "true", "false", "this", "include"],
        types: ["int", "float", "double", "char", "void", "bool", "string", "vector", "map", "set", "queue", "stack", "pair", "array", "list", "unordered_map", "size_t"],
        builtins: ["cout", "cin", "endl", "push_back", "pop_back", "begin", "end", "size", "empty", "front", "back", "sort", "swap", "min", "max", "std"],
        commentLine: "//",
        commentBlockOpen: "/*",
        commentBlockClose: "*/",
        strDelims: ['"'],
    },
    {
        id: "csharp",
        label: "C#",
        icon: "C#",
        keywords: ["if", "else", "for", "foreach", "while", "do", "switch", "case", "break", "continue", "return", "class", "struct", "interface", "public", "private", "protected", "internal", "static", "virtual", "override", "abstract", "sealed", "new", "this", "base", "using", "namespace", "try", "catch", "throw", "finally", "async", "await", "var", "const", "readonly", "true", "false", "null", "void", "in", "out", "ref", "is", "as"],
        types: ["int", "float", "double", "string", "bool", "char", "long", "decimal", "object", "List", "Dictionary", "HashSet", "Queue", "Stack", "Array"],
        builtins: ["Console", "WriteLine", "Write", "ReadLine", "Count", "Add", "Remove", "Contains", "ToArray", "ToString", "Math", "Length"],
        commentLine: "//",
        commentBlockOpen: "/*",
        commentBlockClose: "*/",
        strDelims: ['"'],
    },
    {
        id: "go",
        label: "Go",
        icon: "Go",
        keywords: ["func", "if", "else", "for", "range", "switch", "case", "break", "continue", "return", "package", "import", "var", "const", "type", "struct", "interface", "map", "chan", "go", "defer", "select", "fallthrough", "default", "true", "false", "nil"],
        types: ["int", "int8", "int16", "int32", "int64", "float32", "float64", "string", "bool", "byte", "rune", "error", "uint"],
        builtins: ["fmt", "Println", "Printf", "Sprintf", "len", "cap", "append", "make", "new", "copy", "delete", "close", "panic", "recover"],
        commentLine: "//",
        commentBlockOpen: "/*",
        commentBlockClose: "*/",
        strDelims: ['"', "`"],
    },
    {
        id: "rust",
        label: "Rust",
        icon: "🦀",
        keywords: ["fn", "let", "mut", "if", "else", "for", "while", "loop", "match", "return", "struct", "enum", "impl", "trait", "pub", "use", "mod", "crate", "self", "super", "const", "static", "ref", "move", "as", "in", "where", "async", "await", "unsafe", "true", "false", "Some", "None", "Ok", "Err"],
        types: ["i8", "i16", "i32", "i64", "u8", "u16", "u32", "u64", "f32", "f64", "bool", "char", "str", "String", "Vec", "HashMap", "HashSet", "Option", "Result", "Box", "usize", "isize"],
        builtins: ["println", "print", "format", "vec", "push", "pop", "len", "iter", "map", "filter", "collect", "unwrap", "expect", "clone"],
        commentLine: "//",
        commentBlockOpen: "/*",
        commentBlockClose: "*/",
        strDelims: ['"'],
    },
    {
        id: "kotlin",
        label: "Kotlin",
        icon: "K",
        keywords: ["fun", "val", "var", "if", "else", "for", "while", "do", "when", "return", "class", "object", "interface", "data", "sealed", "open", "abstract", "override", "private", "public", "protected", "internal", "companion", "init", "constructor", "import", "package", "try", "catch", "throw", "finally", "in", "is", "as", "true", "false", "null", "this", "super", "it"],
        types: ["Int", "Long", "Float", "Double", "Boolean", "Char", "String", "Unit", "Any", "Nothing", "List", "MutableList", "Map", "Set", "Array", "Pair"],
        builtins: ["println", "print", "listOf", "mutableListOf", "mapOf", "setOf", "arrayOf", "size", "add", "remove", "contains", "forEach", "map", "filter", "let", "apply", "also", "run", "with"],
        commentLine: "//",
        commentBlockOpen: "/*",
        commentBlockClose: "*/",
        strDelims: ['"'],
    },
];

// ─── Complexity curve data ───────────────────────────────────
export const COMPLEXITY_CURVES = [
    { label: "O(1)", fn: (_n: number) => 1, color: C.green },
    { label: "O(log n)", fn: (n: number) => Math.log2(n || 1), color: C.cyan },
    { label: "O(n)", fn: (n: number) => n, color: C.accent },
    { label: "O(n log n)", fn: (n: number) => n * Math.log2(n || 1), color: C.amber },
    { label: "O(n²)", fn: (n: number) => n * n, color: C.orange },
    { label: "O(2ⁿ)", fn: (n: number) => Math.pow(2, Math.min(n, 10)), color: C.red },
];
