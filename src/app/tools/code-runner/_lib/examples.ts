/* ═══════════════════════════════════════════════════════════════
   Pre-loaded example code snippets — all 10 languages
   ═══════════════════════════════════════════════════════════════ */
import { Step, Variable, emptyDS, ArrayState, LinkedListState, LinkedListNode, StackState, QueueState, BSTState, BSTNode, HashMapState, GraphState } from "./types";

export interface Example {
    id: string;
    label: string;
    language: string;
    code: string;
    expectedOutput: string[];
    generateSteps: () => Step[];
}

/* ─── Helper ─────────────────────────────────────────────────── */
const v = (name: string, value: string | number, type = "int", changed = false): Variable => ({
    name,
    value: String(value),
    type,
    changed,
});

/* ═══════════════════════════════════════════════════════════════
   SHARED STEP GENERATORS
   (language-agnostic — produce the same visualization for
    Bubble Sort and Binary Search regardless of language)
   ═══════════════════════════════════════════════════════════════ */

function generateBubbleSort(): Step[] {
    const steps: Step[] = [];
    const arr = [5, 3, 8, 1, 2];
    const n = arr.length;

    steps.push({
        lineNumber: 0, variables: [v("arr", JSON.stringify(arr), "list")],
        callStack: ["bubble_sort"], ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: [] }] },
        logMessage: "→ Call bubble_sort([5, 3, 8, 1, 2])", annotation: "Function called with unsorted array",
    });
    steps.push({
        lineNumber: 1, variables: [v("arr", JSON.stringify(arr), "list"), v("n", n)],
        callStack: ["bubble_sort"], ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: [] }] },
        logMessage: "n = 5", annotation: "Array length is 5",
    });

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            const hl = [{ index: j, color: "#39d0d8" }, { index: j + 1, color: "#e3b341" }];
            const sorted = [];
            for (let s = n - i; s < n; s++) sorted.push({ index: s, color: "#3fb950" });

            steps.push({
                lineNumber: 4,
                variables: [v("arr", JSON.stringify(arr), "list"), v("n", n), v("i", i), v("j", j), v("arr[j]", arr[j], "int", true), v("arr[j+1]", arr[j + 1], "int", true)],
                callStack: ["bubble_sort"],
                ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: [...hl, ...sorted] }] },
                logMessage: `Compare arr[${j}]=${arr[j]} > arr[${j + 1}]=${arr[j + 1]}? ${arr[j] > arr[j + 1] ? "Yes → swap" : "No"}`,
                annotation: `Comparing elements at index ${j} and ${j + 1}. ${arr[j] > arr[j + 1] ? "Left is larger, so we swap them." : "Already in order, no swap needed."}`,
            });

            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                steps.push({
                    lineNumber: 5,
                    variables: [v("arr", JSON.stringify(arr), "list", true), v("n", n), v("i", i), v("j", j)],
                    callStack: ["bubble_sort"],
                    ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: [{ index: j, color: "#3fb950" }, { index: j + 1, color: "#3fb950" }, ...sorted], swapping: [j, j + 1] }] },
                    logMessage: `Swap arr[${j}] ↔ arr[${j + 1}]  →  ${JSON.stringify(arr)}`,
                    annotation: `Swapped! Array is now ${JSON.stringify(arr)}`,
                });
            }
        }
    }
    const finalHL = arr.map((_, i) => ({ index: i, color: "#3fb950" }));
    steps.push({
        lineNumber: 6, variables: [v("arr", JSON.stringify(arr), "list")],
        callStack: ["bubble_sort"], ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: finalHL }] },
        logMessage: `✓ Sorted: ${JSON.stringify(arr)}`, annotation: "Bubble sort complete! Array is fully sorted.",
    });
    steps.push({
        lineNumber: 8, variables: [v("result", JSON.stringify(arr), "list", true)],
        callStack: [], ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: finalHL }] },
        logMessage: `result = ${JSON.stringify(arr)}`, annotation: "Result stored",
    });
    return steps;
}

function generateBinarySearch(): Step[] {
    const steps: Step[] = [];
    const arr = [1, 3, 5, 7, 9, 11, 15, 18, 22];
    const target = 7;
    let low = 0, high = arr.length - 1;

    steps.push({
        lineNumber: 0, variables: [v("arr", JSON.stringify(arr), "list"), v("target", target)],
        callStack: ["binary_search"], ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: [] }] },
        logMessage: `→ binary_search(arr, ${target})`, annotation: "Searching for 7 in sorted array",
    });

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const hl = [
            { index: low, color: "#39d0d8", label: "low" },
            { index: high, color: "#39d0d8", label: "high" },
            { index: mid, color: "#e3b341", label: "mid" },
        ];
        steps.push({
            lineNumber: 4,
            variables: [v("low", low), v("high", high), v("mid", mid, "int", true), v("arr[mid]", arr[mid])],
            callStack: ["binary_search"],
            ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: hl }] },
            logMessage: `mid=${mid}, arr[${mid}]=${arr[mid]} vs target=${target}`,
            annotation: `Checking middle element. arr[${mid}] = ${arr[mid]}`,
        });
        if (arr[mid] === target) {
            steps.push({
                lineNumber: 6,
                variables: [v("low", low), v("high", high), v("mid", mid), v("result", mid, "int", true)],
                callStack: ["binary_search"],
                ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: [{ index: mid, color: "#3fb950", label: "FOUND" }] }] },
                logMessage: `✓ Found target ${target} at index ${mid}`,
                annotation: `Target found! arr[${mid}] == ${target}`,
            });
            break;
        } else if (arr[mid] < target) {
            low = mid + 1;
            steps.push({
                lineNumber: 7,
                variables: [v("low", low, "int", true), v("high", high), v("mid", mid)],
                callStack: ["binary_search"],
                ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: [{ index: low, color: "#39d0d8", label: "low" }, { index: high, color: "#39d0d8", label: "high" }] }] },
                logMessage: `arr[${mid}] < ${target} → search right, low = ${low}`,
                annotation: "Target is in the right half",
            });
        } else {
            high = mid - 1;
            steps.push({
                lineNumber: 9,
                variables: [v("low", low), v("high", high, "int", true), v("mid", mid)],
                callStack: ["binary_search"],
                ds: { ...emptyDS(), arrays: [{ name: "arr", values: [...arr], highlights: [{ index: low, color: "#39d0d8", label: "low" }, { index: high, color: "#39d0d8", label: "high" }] }] },
                logMessage: `arr[${mid}] > ${target} → search left, high = ${high}`,
                annotation: "Target is in the left half",
            });
        }
    }
    return steps;
}

/* ── Python-only step generators ─────────────────────────────── */

function generateLinkedList(): Step[] {
    const steps: Step[] = [];
    const mkLL = (nodes: LinkedListNode[], head: number | null, hl: number | null): LinkedListState => ({ name: "head", nodes, headId: head, highlightId: hl });

    const n1: LinkedListNode = { id: 1, value: 10, next: null };
    steps.push({
        lineNumber: 6, variables: [v("head", "None", "Node")],
        callStack: ["insert"], ds: { ...emptyDS(), linkedLists: [mkLL([{ ...n1 }], 1, 1)] },
        logMessage: "Insert 10 → head", annotation: "First node becomes head",
    });

    const n2: LinkedListNode = { id: 2, value: 20, next: 1 };
    steps.push({
        lineNumber: 6, variables: [v("head", "Node(20)", "Node", true)],
        callStack: ["insert"], ds: { ...emptyDS(), linkedLists: [mkLL([{ ...n2 }, { ...n1 }], 2, 2)] },
        logMessage: "Insert 20 → head", annotation: "New node points to old head",
    });

    const n3: LinkedListNode = { id: 3, value: 30, next: 2 };
    steps.push({
        lineNumber: 6, variables: [v("head", "Node(30)", "Node", true)],
        callStack: ["insert"], ds: { ...emptyDS(), linkedLists: [mkLL([{ ...n3 }, { ...n2 }, { ...n1 }], 3, 3)] },
        logMessage: "Insert 30 → head", annotation: "30 → 20 → 10 → None",
    });

    steps.push({
        lineNumber: 11, variables: [v("head", "Node(30)", "Node")],
        callStack: [], ds: { ...emptyDS(), linkedLists: [mkLL([{ ...n3 }, { ...n2 }, { ...n1 }], 3, null)] },
        logMessage: "✓ Final list: 30 → 20 → 10 → None", annotation: "Linked list built",
    });
    return steps;
}

function generateBST(): Step[] {
    const steps: Step[] = [];
    const values = [15, 10, 20, 8, 12, 25];
    const allNodes: BSTNode[] = [];

    // Build BST as a flat node array with ID references
    const insertBST = (val: number): void => {
        const newId = allNodes.length + 1;
        const newNode: BSTNode = { id: newId, value: val, left: null, right: null };
        if (allNodes.length === 0) {
            allNodes.push(newNode);
            return;
        }
        // Find insertion point
        let current = allNodes[0]; // root
        while (true) {
            if (val < current.value) {
                if (current.left === null) { current.left = newId; break; }
                current = allNodes.find(n => n.id === current.left)!;
            } else {
                if (current.right === null) { current.right = newId; break; }
                current = allNodes.find(n => n.id === current.right)!;
            }
        }
        allNodes.push(newNode);
    };

    values.forEach((val, i) => {
        insertBST(val);
        steps.push({
            lineNumber: i === 0 ? 3 : 5,
            variables: [v("value", val, "int", true)],
            callStack: ["insert"],
            ds: { ...emptyDS(), bsts: [{ name: "BST", nodes: allNodes.map(n => ({ ...n })), rootId: 1, highlightIds: [allNodes.length], pathIds: [] }] },
            logMessage: `Insert ${val} into BST`,
            annotation: i === 0 ? "First value becomes root" : `${val} ${val < 15 ? "< root, go left" : "> root, go right"}`,
        });
    });

    steps.push({
        lineNumber: 8,
        variables: [v("target", 12), v("found", "True", "bool", true)],
        callStack: ["search"],
        ds: { ...emptyDS(), bsts: [{ name: "BST", nodes: allNodes.map(n => ({ ...n })), rootId: 1, highlightIds: [5], pathIds: [1, 2, 5] }] },
        logMessage: "✓ search(12) → Found", annotation: "Traversed: 15 → 10 → 12. Found!",
    });
    return steps;
}

function generateBFS(): Step[] {
    const steps: Step[] = [];
    const graphNodes = ["A", "B", "C", "D", "E", "F"];
    const graphEdges: { from: string; to: string }[] = [
        { from: "A", to: "B" }, { from: "A", to: "C" }, { from: "B", to: "D" },
        { from: "B", to: "E" }, { from: "C", to: "F" },
    ];

    const visited: string[] = [];
    const bfsOrder = ["A", "B", "C", "D", "E", "F"];

    bfsOrder.forEach((node, i) => {
        visited.push(node);
        const q = bfsOrder.slice(i + 1, i + 3);
        steps.push({
            lineNumber: i + 4,
            variables: [v("visited", JSON.stringify(visited), "list", true), v("queue", JSON.stringify(q), "list")],
            callStack: ["bfs"],
            ds: {
                ...emptyDS(),
                graphs: [{
                    name: "Graph",
                    nodes: graphNodes,
                    edges: graphEdges,
                    visited: [...visited],
                    frontier: q,
                    queue: q,
                }],
                queues: [{ name: "queue", items: q, action: q.length > 0 ? "enqueue" as const : null }],
            },
            logMessage: `Visit ${node}. Queue: [${q.join(", ")}]`,
            annotation: `Visiting ${node}, adding unvisited neighbors to queue`,
        });
    });

    steps.push({
        lineNumber: 12, variables: [v("visited", JSON.stringify(visited), "list")],
        callStack: [], ds: {
            ...emptyDS(),
            graphs: [{
                name: "Graph",
                nodes: graphNodes,
                edges: graphEdges,
                visited: [...visited],
                frontier: [],
            }],
        },
        logMessage: `✓ BFS order: ${JSON.stringify(visited)}`, annotation: "BFS traversal complete",
    });
    return steps;
}

function generateFibonacci(): Step[] {
    const steps: Step[] = [];
    const calls: string[] = [];

    const fib = (n: number, depth: number): number => {
        const indent = "  ".repeat(depth);
        calls.push(`${indent}fib(${n})`);
        if (n <= 1) {
            steps.push({
                lineNumber: 2,
                variables: [v("n", n)],
                callStack: [...calls],
                ds: emptyDS(),
                logMessage: `fib(${n}) → base case → ${n}`,
                annotation: `Base case: fib(${n}) = ${n}`,
            });
            calls.pop();
            return n;
        }
        steps.push({
            lineNumber: 3,
            variables: [v("n", n, "int", true)],
            callStack: [...calls],
            ds: emptyDS(),
            logMessage: `fib(${n}) → fib(${n - 1}) + fib(${n - 2})`,
            annotation: `Recursive case: need fib(${n - 1}) + fib(${n - 2})`,
        });
        const result = fib(n - 1, depth + 1) + fib(n - 2, depth + 1);
        steps.push({
            lineNumber: 3,
            variables: [v("n", n), v("result", result, "int", true)],
            callStack: [...calls],
            ds: emptyDS(),
            logMessage: `fib(${n}) = ${result}`,
            annotation: `Computed fib(${n}) = ${result}`,
        });
        calls.pop();
        return result;
    };
    fib(5, 0);
    return steps;
}

function generateStack(): Step[] {
    const steps: Step[] = [];
    const stack: (number | string)[] = [];
    const ops = [
        { op: "push", val: 10 }, { op: "push", val: 20 }, { op: "push", val: 30 },
        { op: "peek", val: 0 }, { op: "pop", val: 0 }, { op: "pop", val: 0 },
    ];

    ops.forEach((o, i) => {
        if (o.op === "push") {
            stack.push(o.val);
            steps.push({
                lineNumber: i + 2,
                variables: [v("stack", JSON.stringify(stack), "list", true), v("top", o.val, "int", true)],
                callStack: [o.op],
                ds: { ...emptyDS(), stacks: [{ name: "stack", items: [...stack], highlightTop: true, action: "push" }] },
                logMessage: `push(${o.val}) → stack = ${JSON.stringify(stack)}`,
                annotation: `Push ${o.val} onto stack. Top is now ${o.val}.`,
            });
        } else if (o.op === "peek") {
            const top = stack[stack.length - 1];
            steps.push({
                lineNumber: i + 2,
                variables: [v("stack", JSON.stringify(stack), "list"), v("top", String(top), "int", true)],
                callStack: [o.op],
                ds: { ...emptyDS(), stacks: [{ name: "stack", items: [...stack], highlightTop: true }] },
                logMessage: `peek() → ${top}`,
                annotation: `Top of stack is ${top} (not removed)`,
            });
        } else {
            const popped = stack.pop();
            steps.push({
                lineNumber: i + 2,
                variables: [v("stack", JSON.stringify(stack), "list", true), v("popped", String(popped), "int", true)],
                callStack: [o.op],
                ds: { ...emptyDS(), stacks: [{ name: "stack", items: [...stack], highlightTop: stack.length > 0, action: "pop" }] },
                logMessage: `pop() → ${popped}. stack = ${JSON.stringify(stack)}`,
                annotation: `Popped ${popped}. ${stack.length > 0 ? `Top is now ${stack[stack.length - 1]}` : "Stack is empty"}`,
            });
        }
    });
    return steps;
}

function generateHashMap(): Step[] {
    const steps: Step[] = [];
    const SIZE = 7;
    const buckets: { key: string; value: number }[][] = Array.from({ length: SIZE }, () => []);

    const hash = (key: string) => {
        let h = 0;
        for (const c of key) h = (h * 31 + c.charCodeAt(0)) % SIZE;
        return h;
    };

    const entries: [string, number][] = [["apple", 5], ["banana", 8], ["cherry", 3], ["date", 12], ["elderberry", 7]];

    entries.forEach(([key, val], i) => {
        const idx = hash(key);
        buckets[idx].push({ key, value: val });
        const hmState: HashMapState = {
            name: "HashMap",
            buckets: buckets.map(b => b.map(e => ({ key: e.key, value: e.value }))),
            highlightBucket: idx,
            highlightKey: key,
            size: SIZE,
        };
        steps.push({
            lineNumber: i + 4,
            variables: [v("key", key, "str", true), v("hash", idx, "int", true), v("value", val)],
            callStack: ["put"],
            ds: { ...emptyDS(), hashMaps: [hmState] },
            logMessage: `put("${key}", ${val}) → bucket[${idx}]${buckets[idx].length > 1 ? " (collision!)" : ""}`,
            annotation: `hash("${key}") = ${idx}. ${buckets[idx].length > 1 ? "Collision! Chaining entries." : "Empty bucket, insert directly."}`,
        });
    });

    const searchKey = "cherry";
    const searchIdx = hash(searchKey);
    steps.push({
        lineNumber: 10,
        variables: [v("key", searchKey, "str"), v("hash", searchIdx), v("result", 3, "int", true)],
        callStack: ["get"],
        ds: {
            ...emptyDS(), hashMaps: [{
                name: "HashMap", buckets: buckets.map(b => b.map(e => ({ key: e.key, value: e.value }))),
                highlightBucket: searchIdx, highlightKey: searchKey, size: SIZE,
            }],
        },
        logMessage: `get("cherry") → 3`, annotation: `hash("cherry") = ${searchIdx}, found in bucket`,
    });
    return steps;
}


/* ═══════════════════════════════════════════════════════════════
   LANGUAGE-SPECIFIC CODE STRINGS
   ═══════════════════════════════════════════════════════════════ */

/* ── Python ──────────────────────────────────────────────────── */
const pyBubbleSort = `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

result = bubble_sort([5, 3, 8, 1, 2])
print(result)`;

const pyBinarySearch = `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

result = binary_search([1, 3, 5, 7, 9, 11, 15, 18, 22], 7)
print(result)`;

const pyLinkedList = `class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

def insert(head, data):
    new_node = Node(data)
    new_node.next = head
    return new_node

head = None
head = insert(head, 10)
head = insert(head, 20)
head = insert(head, 30)
print("30 -> 20 -> 10 -> None")`;

const pyBST = `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(root, val):
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

def search(root, target):
    if not root:
        return False
    if root.val == target:
        return True
    elif target < root.val:
        return search(root.left, target)
    else:
        return search(root.right, target)

root = None
for val in [15, 10, 20, 8, 12, 25]:
    root = insert(root, val)
print("Tree built with values: [15, 10, 20, 8, 12, 25]")
print("search(root, 12) →", search(root, 12))`;

const pyBFS = `from collections import deque

def bfs(graph, start):
    visited = []
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node not in visited:
            visited.append(node)
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    queue.append(neighbor)
    return visited

graph = {
    'A': ['B', 'C'],
    'B': ['D', 'E'],
    'C': ['F'],
    'D': [], 'E': [], 'F': []
}
result = bfs(graph, 'A')
print(result)`;

const pyFibonacci = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

result = fibonacci(5)
print(result)`;

const pyStack = `stack = []
stack.append(10)
stack.append(20)
stack.append(30)
print("peek() →", stack[-1])
print("pop() →", stack.pop())
print("pop() →", stack.pop())
print("Stack:", stack)`;

const pyHashMap = `class HashMap:
    def __init__(self, size=7):
        self.size = size
        self.buckets = [[] for _ in range(size)]

    def _hash(self, key):
        h = 0
        for c in key:
            h = (h * 31 + ord(c)) % self.size
        return h

    def put(self, key, value):
        idx = self._hash(key)
        self.buckets[idx].append((key, value))
        print(f"put('{key}', {value})")

    def get(self, key):
        idx = self._hash(key)
        for k, v in self.buckets[idx]:
            if k == key:
                return v
        return None

hm = HashMap()
hm.put('apple', 5)
hm.put('banana', 8)
hm.put('cherry', 3)
hm.put('date', 12)
hm.put('elderberry', 7)
print(f"get('cherry') → {hm.get('cherry')}")`;

/* ── JavaScript ──────────────────────────────────────────────── */
const jsBubbleSort = `function bubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}

const result = bubbleSort([5, 3, 8, 1, 2]);
console.log(result);`;

const jsBinarySearch = `function binarySearch(arr, target) {
    let low = 0;
    let high = arr.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (arr[mid] === target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

const result = binarySearch([1, 3, 5, 7, 9, 11, 15, 18, 22], 7);
console.log(result);`;

/* ── TypeScript ──────────────────────────────────────────────── */
const tsBubbleSort = `function bubbleSort(arr: number[]): number[] {
    const n: number = arr.length;
    for (let i: number = 0; i < n; i++) {
        for (let j: number = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}

const result: number[] = bubbleSort([5, 3, 8, 1, 2]);
console.log(result);`;

const tsBinarySearch = `function binarySearch(arr: number[], target: number): number {
    let low: number = 0;
    let high: number = arr.length - 1;
    while (low <= high) {
        const mid: number = Math.floor((low + high) / 2);
        if (arr[mid] === target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

const result: number = binarySearch([1, 3, 5, 7, 9, 11, 15, 18, 22], 7);
console.log(result);`;

/* ── Java ────────────────────────────────────────────────────── */
const javaBubbleSort = `import java.util.Arrays;

public class BubbleSort {
    public static int[] bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        return arr;
    }

    public static void main(String[] args) {
        int[] result = bubbleSort(new int[]{5, 3, 8, 1, 2});
        System.out.println(Arrays.toString(result));
    }
}`;

const javaBinarySearch = `public class BinarySearch {
    public static int binarySearch(int[] arr, int target) {
        int low = 0;
        int high = arr.length - 1;
        while (low <= high) {
            int mid = (low + high) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int result = binarySearch(
            new int[]{1, 3, 5, 7, 9, 11, 15, 18, 22}, 7
        );
        System.out.println(result);
    }
}`;

/* ── C ───────────────────────────────────────────────────────── */
const cBubbleSort = `#include <stdio.h>

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int arr[] = {5, 3, 8, 1, 2};
    int n = 5;
    bubbleSort(arr, n);
    printf("[%d, %d, %d, %d, %d]\\n", arr[0], arr[1], arr[2], arr[3], arr[4]);
    return 0;
}`;

const cBinarySearch = `#include <stdio.h>

int binarySearch(int arr[], int n, int target) {
    int low = 0, high = n - 1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    int arr[] = {1, 3, 5, 7, 9, 11, 15, 18, 22};
    int result = binarySearch(arr, 9, 7);
    printf("%d\\n", result);
    return 0;
}`;

/* ── C++ ─────────────────────────────────────────────────────── */
const cppBubbleSort = `#include <iostream>
#include <vector>
using namespace std;

vector<int> bubbleSort(vector<int> arr) {
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }
    return arr;
}

int main() {
    vector<int> result = bubbleSort({5, 3, 8, 1, 2});
    for (int x : result) cout << x << " ";
    cout << endl;
    return 0;
}`;

const cppBinarySearch = `#include <iostream>
#include <vector>
using namespace std;

int binarySearch(vector<int>& arr, int target) {
    int low = 0, high = arr.size() - 1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> arr = {1, 3, 5, 7, 9, 11, 15, 18, 22};
    int result = binarySearch(arr, 7);
    cout << result << endl;
    return 0;
}`;

/* ── C# ──────────────────────────────────────────────────────── */
const csBubbleSort = `using System;

class Program {
    static int[] BubbleSort(int[] arr) {
        int n = arr.Length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        return arr;
    }

    static void Main() {
        int[] result = BubbleSort(new int[]{5, 3, 8, 1, 2});
        Console.WriteLine("[" + string.Join(", ", result) + "]");
    }
}`;

const csBinarySearch = `using System;

class Program {
    static int BinarySearch(int[] arr, int target) {
        int low = 0, high = arr.Length - 1;
        while (low <= high) {
            int mid = (low + high) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    static void Main() {
        int result = BinarySearch(
            new int[]{1, 3, 5, 7, 9, 11, 15, 18, 22}, 7
        );
        Console.WriteLine(result);
    }
}`;

/* ── Go ──────────────────────────────────────────────────────── */
const goBubbleSort = `package main

import "fmt"

func bubbleSort(arr []int) []int {
    n := len(arr)
    for i := 0; i < n; i++ {
        for j := 0; j < n-i-1; j++ {
            if arr[j] > arr[j+1] {
                arr[j], arr[j+1] = arr[j+1], arr[j]
            }
        }
    }
    return arr
}

func main() {
    result := bubbleSort([]int{5, 3, 8, 1, 2})
    fmt.Println(result)
}`;

const goBinarySearch = `package main

import "fmt"

func binarySearch(arr []int, target int) int {
    low, high := 0, len(arr)-1
    for low <= high {
        mid := (low + high) / 2
        if arr[mid] == target {
            return mid
        } else if arr[mid] < target {
            low = mid + 1
        } else {
            high = mid - 1
        }
    }
    return -1
}

func main() {
    result := binarySearch([]int{1, 3, 5, 7, 9, 11, 15, 18, 22}, 7)
    fmt.Println(result)
}`;

/* ── Rust ────────────────────────────────────────────────────── */
const rustBubbleSort = `fn bubble_sort(arr: &mut Vec<i32>) {
    let n = arr.len();
    for i in 0..n {
        for j in 0..n - i - 1 {
            if arr[j] > arr[j + 1] {
                arr.swap(j, j + 1);
            }
        }
    }
}

fn main() {
    let mut arr = vec![5, 3, 8, 1, 2];
    bubble_sort(&mut arr);
    println!("{:?}", arr);
}`;

const rustBinarySearch = `fn binary_search(arr: &[i32], target: i32) -> i32 {
    let (mut low, mut high) = (0i32, arr.len() as i32 - 1);
    while low <= high {
        let mid = (low + high) / 2;
        if arr[mid as usize] == target {
            return mid;
        } else if arr[mid as usize] < target {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    -1
}

fn main() {
    let arr = vec![1, 3, 5, 7, 9, 11, 15, 18, 22];
    let result = binary_search(&arr, 7);
    println!("{}", result);
}`;

/* ── Kotlin ──────────────────────────────────────────────────── */
const ktBubbleSort = `fun bubbleSort(arr: IntArray): IntArray {
    val n = arr.size
    for (i in 0 until n) {
        for (j in 0 until n - i - 1) {
            if (arr[j] > arr[j + 1]) {
                val temp = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = temp
            }
        }
    }
    return arr
}

fun main() {
    val result = bubbleSort(intArrayOf(5, 3, 8, 1, 2))
    println(result.toList())
}`;

const ktBinarySearch = `fun binarySearch(arr: IntArray, target: Int): Int {
    var low = 0
    var high = arr.size - 1
    while (low <= high) {
        val mid = (low + high) / 2
        when {
            arr[mid] == target -> return mid
            arr[mid] < target -> low = mid + 1
            else -> high = mid - 1
        }
    }
    return -1
}

fun main() {
    val result = binarySearch(intArrayOf(1, 3, 5, 7, 9, 11, 15, 18, 22), 7)
    println(result)
}`;

/* ═══════════════════════════════════════════════════════════════
   EXPORT ALL EXAMPLES
   ═══════════════════════════════════════════════════════════════ */
export const EXAMPLES: Example[] = [
    // ─── Python (8 examples) ─────────────────────
    { id: "py-bubble-sort", label: "Bubble Sort", language: "python", code: pyBubbleSort, expectedOutput: ["[1, 2, 3, 5, 8]"], generateSteps: generateBubbleSort },
    { id: "py-binary-search", label: "Binary Search", language: "python", code: pyBinarySearch, expectedOutput: ["3"], generateSteps: generateBinarySearch },
    { id: "py-linked-list", label: "Linked List Insertion", language: "python", code: pyLinkedList, expectedOutput: ["30 -> 20 -> 10 -> None"], generateSteps: generateLinkedList },
    { id: "py-bst", label: "Binary Search Tree", language: "python", code: pyBST, expectedOutput: ["Tree built with values: [15, 10, 20, 8, 12, 25]", "search(root, 12) → True"], generateSteps: generateBST },
    { id: "py-bfs", label: "BFS on Graph", language: "python", code: pyBFS, expectedOutput: ["['A', 'B', 'C', 'D', 'E', 'F']"], generateSteps: generateBFS },
    { id: "py-fibonacci", label: "Fibonacci Recursive", language: "python", code: pyFibonacci, expectedOutput: ["5"], generateSteps: generateFibonacci },
    { id: "py-stack", label: "Stack using Array", language: "python", code: pyStack, expectedOutput: ["peek() → 30", "pop() → 30", "pop() → 20", "Stack: [10]"], generateSteps: generateStack },
    { id: "py-hashmap", label: "HashMap Collision", language: "python", code: pyHashMap, expectedOutput: ["put('apple', 5)", "put('banana', 8)", "put('cherry', 3)", "put('date', 12)", "put('elderberry', 7)", "get('cherry') → 3"], generateSteps: generateHashMap },

    // ─── JavaScript (2 examples) ─────────────────
    { id: "js-bubble-sort", label: "Bubble Sort", language: "javascript", code: jsBubbleSort, expectedOutput: ["[ 1, 2, 3, 5, 8 ]"], generateSteps: generateBubbleSort },
    { id: "js-binary-search", label: "Binary Search", language: "javascript", code: jsBinarySearch, expectedOutput: ["3"], generateSteps: generateBinarySearch },

    // ─── TypeScript (2 examples) ─────────────────
    { id: "ts-bubble-sort", label: "Bubble Sort", language: "typescript", code: tsBubbleSort, expectedOutput: ["[ 1, 2, 3, 5, 8 ]"], generateSteps: generateBubbleSort },
    { id: "ts-binary-search", label: "Binary Search", language: "typescript", code: tsBinarySearch, expectedOutput: ["3"], generateSteps: generateBinarySearch },

    // ─── Java (2 examples) ───────────────────────
    { id: "java-bubble-sort", label: "Bubble Sort", language: "java", code: javaBubbleSort, expectedOutput: ["[1, 2, 3, 5, 8]"], generateSteps: generateBubbleSort },
    { id: "java-binary-search", label: "Binary Search", language: "java", code: javaBinarySearch, expectedOutput: ["3"], generateSteps: generateBinarySearch },

    // ─── C (2 examples) ─────────────────────────
    { id: "c-bubble-sort", label: "Bubble Sort", language: "c", code: cBubbleSort, expectedOutput: ["[1, 2, 3, 5, 8]"], generateSteps: generateBubbleSort },
    { id: "c-binary-search", label: "Binary Search", language: "c", code: cBinarySearch, expectedOutput: ["3"], generateSteps: generateBinarySearch },

    // ─── C++ (2 examples) ────────────────────────
    { id: "cpp-bubble-sort", label: "Bubble Sort", language: "cpp", code: cppBubbleSort, expectedOutput: ["1 2 3 5 8"], generateSteps: generateBubbleSort },
    { id: "cpp-binary-search", label: "Binary Search", language: "cpp", code: cppBinarySearch, expectedOutput: ["3"], generateSteps: generateBinarySearch },

    // ─── C# (2 examples) ────────────────────────
    { id: "cs-bubble-sort", label: "Bubble Sort", language: "csharp", code: csBubbleSort, expectedOutput: ["[1, 2, 3, 5, 8]"], generateSteps: generateBubbleSort },
    { id: "cs-binary-search", label: "Binary Search", language: "csharp", code: csBinarySearch, expectedOutput: ["3"], generateSteps: generateBinarySearch },

    // ─── Go (2 examples) ────────────────────────
    { id: "go-bubble-sort", label: "Bubble Sort", language: "go", code: goBubbleSort, expectedOutput: ["[1 2 3 5 8]"], generateSteps: generateBubbleSort },
    { id: "go-binary-search", label: "Binary Search", language: "go", code: goBinarySearch, expectedOutput: ["3"], generateSteps: generateBinarySearch },

    // ─── Rust (2 examples) ───────────────────────
    { id: "rs-bubble-sort", label: "Bubble Sort", language: "rust", code: rustBubbleSort, expectedOutput: ["[1, 2, 3, 5, 8]"], generateSteps: generateBubbleSort },
    { id: "rs-binary-search", label: "Binary Search", language: "rust", code: rustBinarySearch, expectedOutput: ["3"], generateSteps: generateBinarySearch },

    // ─── Kotlin (2 examples) ─────────────────────
    { id: "kt-bubble-sort", label: "Bubble Sort", language: "kotlin", code: ktBubbleSort, expectedOutput: ["[1, 2, 3, 5, 8]"], generateSteps: generateBubbleSort },
    { id: "kt-binary-search", label: "Binary Search", language: "kotlin", code: ktBinarySearch, expectedOutput: ["3"], generateSteps: generateBinarySearch },
];
