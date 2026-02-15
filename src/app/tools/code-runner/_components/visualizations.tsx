/* ═══════════════════════════════════════════════════════════════
   SVG Data Structure Visualization Components
   ═══════════════════════════════════════════════════════════════ */
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrayState, LinkedListState, StackState, QueueState,
    BSTState, BSTNode, HashMapState, GraphState, HeapState, C,
} from "../_lib/types";

/* ═══ Array Visualization ══════════════════════════════════════ */
export function ArrayViz({ state }: { state: ArrayState }) {
    const cellW = 52, cellH = 44, gap = 4;
    const w = state.values.length * (cellW + gap) + 20;
    return (
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
            <svg width={Math.max(w, 100)} height={100} style={{ display: "block" }}>
                <text x={10} y={16} fill={C.textMuted} fontSize={11} fontFamily="'JetBrains Mono', monospace">{state.name}</text>
                {state.values.map((val, i) => {
                    const x = 10 + i * (cellW + gap);
                    const hl = state.highlights.find(h => h.index === i);
                    const color = hl ? hl.color : C.border;
                    const isSwapping = state.swapping && (state.swapping[0] === i || state.swapping[1] === i);
                    return (
                        <motion.g
                            key={`${i}-${val}`}
                            initial={isSwapping ? { y: -12 } : { scale: 0.8, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <rect x={x} y={24} width={cellW} height={cellH} rx={6}
                                fill={hl ? `${color}22` : C.bgPanel} stroke={color} strokeWidth={hl ? 2 : 1} />
                            <text x={x + cellW / 2} y={24 + cellH / 2 + 5}
                                textAnchor="middle" fill={hl ? color : C.text}
                                fontSize={14} fontWeight={hl ? 700 : 400}
                                fontFamily="'JetBrains Mono', monospace">{val}</text>
                            <text x={x + cellW / 2} y={24 + cellH + 16}
                                textAnchor="middle" fill={C.textDim} fontSize={10}
                                fontFamily="'JetBrains Mono', monospace">{hl?.label || i}</text>
                            {hl && (
                                <motion.rect x={x} y={24} width={cellW} height={cellH} rx={6}
                                    fill="transparent" stroke={color} strokeWidth={2}
                                    initial={{ opacity: 0.8 }}
                                    animate={{ opacity: [0.8, 0.3, 0.8] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }} />
                            )}
                        </motion.g>
                    );
                })}
            </svg>
        </div>
    );
}

/* ═══ Linked List Visualization ════════════════════════════════ */
export function LinkedListViz({ state }: { state: LinkedListState }) {
    const nodeW = 80, nodeH = 36, gapX = 60;
    const ordered: typeof state.nodes = [];
    let cur = state.headId;
    const seen = new Set<number>();
    while (cur !== null && !seen.has(cur)) {
        seen.add(cur);
        const n = state.nodes.find(nd => nd.id === cur);
        if (!n) break;
        ordered.push(n);
        cur = n.next;
    }
    const w = ordered.length * (nodeW + gapX) + 40;
    return (
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
            <svg width={Math.max(w, 100)} height={90} style={{ display: "block" }}>
                <text x={10} y={16} fill={C.textMuted} fontSize={11} fontFamily="'JetBrains Mono', monospace">{state.name}</text>
                {ordered.map((node, i) => {
                    const x = 10 + i * (nodeW + gapX);
                    const isHL = node.id === state.highlightId;
                    const color = isHL ? C.cyan : C.border;
                    return (
                        <motion.g key={node.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}>
                            <rect x={x} y={28} width={nodeW} height={nodeH} rx={4}
                                fill={isHL ? `${C.cyan}15` : C.bgPanel} stroke={color} strokeWidth={isHL ? 2 : 1} />
                            <line x1={x + nodeW * 0.65} y1={28} x2={x + nodeW * 0.65} y2={28 + nodeH} stroke={color} strokeWidth={1} />
                            <text x={x + nodeW * 0.32} y={28 + nodeH / 2 + 5} textAnchor="middle"
                                fill={isHL ? C.cyan : C.text} fontSize={13} fontWeight={600}
                                fontFamily="'JetBrains Mono', monospace">{node.value}</text>
                            <text x={x + nodeW * 0.82} y={28 + nodeH / 2 + 4} textAnchor="middle"
                                fill={C.textDim} fontSize={10} fontFamily="'JetBrains Mono', monospace">→</text>
                            {i < ordered.length - 1 && (
                                <g>
                                    <line x1={x + nodeW} y1={28 + nodeH / 2} x2={x + nodeW + gapX} y2={28 + nodeH / 2}
                                        stroke={C.textDim} strokeWidth={1.5} markerEnd="url(#arrowhead)" />
                                </g>
                            )}
                            {i === ordered.length - 1 && (
                                <text x={x + nodeW + 10} y={28 + nodeH / 2 + 4}
                                    fill={C.textDim} fontSize={11} fontFamily="'JetBrains Mono', monospace">null</text>
                            )}
                        </motion.g>
                    );
                })}
                <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill={C.textDim} />
                    </marker>
                </defs>
            </svg>
        </div>
    );
}

/* ═══ Stack Visualization ══════════════════════════════════════ */
export function StackViz({ state }: { state: StackState }) {
    const blockW = 80, blockH = 32, gap = 4, maxShow = 10;
    const items = state.items.slice(-maxShow);
    const h = items.length * (blockH + gap) + 50;
    return (
        <div style={{ overflowY: "auto", maxHeight: 260 }}>
            <svg width={140} height={Math.max(h, 80)} style={{ display: "block" }}>
                <text x={10} y={16} fill={C.textMuted} fontSize={11} fontFamily="'JetBrains Mono', monospace">{state.name}</text>
                <AnimatePresence>
                    {items.map((item, i) => {
                        const y = (items.length - 1 - i) * (blockH + gap) + 28;
                        const isTop = i === items.length - 1;
                        const color = isTop ? C.green : C.border;
                        return (
                            <motion.g key={`${i}-${item}`}
                                initial={state.action === "push" && isTop ? { y: -40, opacity: 0 } : { opacity: 1 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -40, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 250, damping: 18 }}>
                                <rect x={20} y={y} width={blockW} height={blockH} rx={4}
                                    fill={isTop ? `${C.green}20` : C.bgPanel} stroke={color} strokeWidth={isTop ? 2 : 1} />
                                <text x={20 + blockW / 2} y={y + blockH / 2 + 5} textAnchor="middle"
                                    fill={isTop ? C.green : C.text} fontSize={13} fontWeight={isTop ? 700 : 400}
                                    fontFamily="'JetBrains Mono', monospace">{item}</text>
                                {isTop && <text x={20 + blockW + 8} y={y + blockH / 2 + 4} fill={C.green} fontSize={10} fontFamily="'JetBrains Mono', monospace">← top</text>}
                            </motion.g>
                        );
                    })}
                </AnimatePresence>
            </svg>
        </div>
    );
}

/* ═══ Queue Visualization ══════════════════════════════════════ */
export function QueueViz({ state }: { state: QueueState }) {
    const cellW = 52, cellH = 40, gap = 4;
    const w = state.items.length * (cellW + gap) + 80;
    return (
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
            <svg width={Math.max(w, 100)} height={90} style={{ display: "block" }}>
                <text x={10} y={16} fill={C.textMuted} fontSize={11} fontFamily="'JetBrains Mono', monospace">{state.name}</text>
                <text x={10} y={44 + cellH / 2 + 4} fill={C.cyan} fontSize={10} fontFamily="'JetBrains Mono', monospace">front→</text>
                {state.items.map((item, i) => {
                    const x = 60 + i * (cellW + gap);
                    const isFront = i === 0;
                    const isBack = i === state.items.length - 1;
                    const color = isFront ? C.cyan : isBack ? C.amber : C.border;
                    return (
                        <motion.g key={`${i}-${item}`}
                            initial={state.action === "enqueue" && isBack ? { x: 40, opacity: 0 } : { opacity: 1 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 250, damping: 18 }}>
                            <rect x={x} y={28} width={cellW} height={cellH} rx={4}
                                fill={isFront || isBack ? `${color}18` : C.bgPanel} stroke={color} strokeWidth={isFront || isBack ? 2 : 1} />
                            <text x={x + cellW / 2} y={28 + cellH / 2 + 5} textAnchor="middle"
                                fill={isFront ? C.cyan : isBack ? C.amber : C.text} fontSize={13}
                                fontFamily="'JetBrains Mono', monospace">{item}</text>
                        </motion.g>
                    );
                })}
                {state.items.length > 0 && (
                    <text x={60 + state.items.length * (cellW + gap) + 4} y={44 + cellH / 2 + 4}
                        fill={C.amber} fontSize={10} fontFamily="'JetBrains Mono', monospace">←back</text>
                )}
            </svg>
        </div>
    );
}

/* ═══ BST Visualization ════════════════════════════════════════ */
function layoutBST(nodes: BSTNode[], rootId: number | null): Map<number, { x: number; y: number }> {
    const pos = new Map<number, { x: number; y: number }>();
    if (rootId === null) return pos;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    let nextX = 0;

    function inorder(id: number | null, depth: number) {
        if (id === null) return;
        const node = nodeMap.get(id);
        if (!node) return;
        inorder(node.left, depth + 1);
        pos.set(id, { x: nextX * 60 + 30, y: depth * 56 + 30 });
        nextX++;
        inorder(node.right, depth + 1);
    }
    inorder(rootId, 0);
    return pos;
}

export function BSTViz({ state }: { state: BSTState }) {
    const positions = layoutBST(state.nodes, state.rootId);
    let maxX = 0, maxY = 0;
    positions.forEach(p => { maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
    const nodeMap = new Map(state.nodes.map(n => [n.id, n]));
    const r = 20;

    return (
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
            <svg width={maxX + 60} height={maxY + 60} style={{ display: "block", minHeight: 80 }}>
                <text x={10} y={16} fill={C.textMuted} fontSize={11} fontFamily="'JetBrains Mono', monospace">{state.name}</text>
                {/* Edges */}
                {state.nodes.map(node => {
                    const from = positions.get(node.id);
                    if (!from) return null;
                    return [node.left, node.right].map(childId => {
                        if (childId === null) return null;
                        const to = positions.get(childId);
                        if (!to) return null;
                        const isPath = state.pathIds.includes(node.id) && state.pathIds.includes(childId);
                        return (
                            <motion.line key={`${node.id}-${childId}`}
                                x1={from.x} y1={from.y + r}
                                x2={to.x} y2={to.y - r}
                                stroke={isPath ? C.cyan : C.textDim}
                                strokeWidth={isPath ? 2 : 1}
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.3 }} />
                        );
                    });
                })}
                {/* Nodes */}
                {state.nodes.map(node => {
                    const p = positions.get(node.id);
                    if (!p) return null;
                    const isHL = state.highlightIds.includes(node.id);
                    const isPath = state.pathIds.includes(node.id);
                    const color = isHL ? C.green : isPath ? C.cyan : C.border;
                    return (
                        <motion.g key={node.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                            <circle cx={p.x} cy={p.y} r={r}
                                fill={isHL ? `${C.green}25` : isPath ? `${C.cyan}15` : C.bgPanel}
                                stroke={color} strokeWidth={isHL ? 2.5 : 1.5} />
                            <text x={p.x} y={p.y + 5} textAnchor="middle"
                                fill={isHL ? C.green : isPath ? C.cyan : C.text}
                                fontSize={13} fontWeight={600}
                                fontFamily="'JetBrains Mono', monospace">{node.value}</text>
                        </motion.g>
                    );
                })}
            </svg>
        </div>
    );
}

/* ═══ HashMap Visualization ════════════════════════════════════ */
export function HashMapViz({ state }: { state: HashMapState }) {
    const bucketH = 34, bucketW = 50, chainNodeW = 90, gap = 6;
    const totalH = state.size * (bucketH + gap) + 40;
    const maxChain = Math.max(...state.buckets.map(b => b.length), 0);
    const totalW = bucketW + 20 + maxChain * (chainNodeW + 20) + 60;

    return (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 320, paddingBottom: 8 }}>
            <svg width={Math.max(totalW, 200)} height={totalH} style={{ display: "block" }}>
                <text x={10} y={16} fill={C.textMuted} fontSize={11} fontFamily="'JetBrains Mono', monospace">{state.name}</text>
                {state.buckets.map((bucket, i) => {
                    const y = 28 + i * (bucketH + gap);
                    const isHL = state.highlightBucket === i;
                    return (
                        <g key={i}>
                            <rect x={10} y={y} width={bucketW} height={bucketH} rx={4}
                                fill={isHL ? `${C.violet}20` : C.bgPanel} stroke={isHL ? C.violet : C.border} strokeWidth={isHL ? 2 : 1} />
                            <text x={10 + bucketW / 2} y={y + bucketH / 2 + 4} textAnchor="middle"
                                fill={isHL ? C.violet : C.textDim} fontSize={11}
                                fontFamily="'JetBrains Mono', monospace">[{i}]</text>
                            {bucket.map((entry, j) => {
                                const ex = bucketW + 20 + j * (chainNodeW + 20);
                                const isKeyHL = state.highlightKey === entry.key;
                                return (
                                    <motion.g key={`${i}-${j}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: j * 0.05 }}>
                                        <line x1={j === 0 ? 10 + bucketW : ex - 20} y1={y + bucketH / 2}
                                            x2={ex} y2={y + bucketH / 2}
                                            stroke={C.textDim} strokeWidth={1} markerEnd="url(#arrowhead2)" />
                                        <rect x={ex} y={y} width={chainNodeW} height={bucketH} rx={4}
                                            fill={isKeyHL ? `${C.amber}20` : C.bgPanel}
                                            stroke={isKeyHL ? C.amber : C.border} strokeWidth={isKeyHL ? 2 : 1} />
                                        <text x={ex + chainNodeW / 2} y={y + bucketH / 2 + 4} textAnchor="middle"
                                            fill={isKeyHL ? C.amber : C.text} fontSize={10}
                                            fontFamily="'JetBrains Mono', monospace">
                                            {entry.key}:{String(entry.value)}
                                        </text>
                                    </motion.g>
                                );
                            })}
                        </g>
                    );
                })}
                <defs>
                    <marker id="arrowhead2" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                        <polygon points="0 0, 6 2.5, 0 5" fill={C.textDim} />
                    </marker>
                </defs>
            </svg>
        </div>
    );
}

/* ═══ Graph Visualization (force-directed simplified) ══════════ */
export function GraphViz({ state }: { state: GraphState }) {
    const nodeCount = state.nodes.length;
    const w = 340, h = 260, cx = w / 2, cy = h / 2, radius = Math.min(w, h) / 2 - 40;

    // Circle layout for simplicity (force-directed is complex for inline)
    const positions = new Map<string, { x: number; y: number }>();
    state.nodes.forEach((n, i) => {
        const angle = (i / nodeCount) * 2 * Math.PI - Math.PI / 2;
        positions.set(n, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    });

    const drawnEdges = new Set<string>();

    return (
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
            <svg width={w} height={h} style={{ display: "block" }}>
                <text x={10} y={16} fill={C.textMuted} fontSize={11} fontFamily="'JetBrains Mono', monospace">{state.name}</text>
                {/* Edges */}
                {state.edges.map((edge, i) => {
                    const edgeKey = [edge.from, edge.to].sort().join("-");
                    if (drawnEdges.has(edgeKey)) return null;
                    drawnEdges.add(edgeKey);
                    const from = positions.get(edge.from);
                    const to = positions.get(edge.to);
                    if (!from || !to) return null;
                    const bothVisited = state.visited.includes(edge.from) && state.visited.includes(edge.to);
                    return (
                        <line key={`e-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                            stroke={bothVisited ? C.cyan : C.textDim} strokeWidth={bothVisited ? 2 : 1} opacity={0.6} />
                    );
                })}
                {/* Nodes */}
                {state.nodes.map(node => {
                    const p = positions.get(node)!;
                    const isVisited = state.visited.includes(node);
                    const isFrontier = state.frontier.includes(node);
                    const color = isFrontier ? C.amber : isVisited ? C.cyan : C.border;
                    return (
                        <motion.g key={node}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 250 }}>
                            <circle cx={p.x} cy={p.y} r={22}
                                fill={isVisited ? `${C.cyan}20` : isFrontier ? `${C.amber}20` : C.bgPanel}
                                stroke={color} strokeWidth={2} />
                            <text x={p.x} y={p.y + 5} textAnchor="middle"
                                fill={isFrontier ? C.amber : isVisited ? C.cyan : C.text}
                                fontSize={14} fontWeight={600}
                                fontFamily="'JetBrains Mono', monospace">{node}</text>
                            {isFrontier && (
                                <motion.circle cx={p.x} cy={p.y} r={22}
                                    fill="transparent" stroke={C.amber} strokeWidth={2}
                                    animate={{ r: [22, 28, 22], opacity: [1, 0.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }} />
                            )}
                        </motion.g>
                    );
                })}
            </svg>
        </div>
    );
}

/* ═══ Heap Visualization ═══════════════════════════════════════ */
export function HeapViz({ state }: { state: HeapState }) {
    const positions = new Map<number, { x: number; y: number }>();
    const depth = state.items.length > 0 ? Math.floor(Math.log2(state.items.length)) + 1 : 0;
    const w = Math.pow(2, depth) * 50 + 20;
    const h = depth * 56 + 50;

    state.items.forEach((_, i) => {
        const d = Math.floor(Math.log2(i + 1));
        const posInLevel = i - (Math.pow(2, d) - 1);
        const levelWidth = Math.pow(2, d);
        const x = ((posInLevel + 0.5) / levelWidth) * (w - 20) + 10;
        const y = d * 56 + 30;
        positions.set(i, { x, y });
    });

    return (
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
            <svg width={Math.max(w, 100)} height={Math.max(h, 80)} style={{ display: "block" }}>
                <text x={10} y={16} fill={C.textMuted} fontSize={11} fontFamily="'JetBrains Mono', monospace">{state.name}</text>
                {state.items.map((_, i) => {
                    if (i === 0) return null;
                    const parent = Math.floor((i - 1) / 2);
                    const from = positions.get(parent);
                    const to = positions.get(i);
                    if (!from || !to) return null;
                    return <line key={`he-${i}`} x1={from.x} y1={from.y + 18} x2={to.x} y2={to.y - 18} stroke={C.textDim} strokeWidth={1} />;
                })}
                {state.items.map((val, i) => {
                    const p = positions.get(i);
                    if (!p) return null;
                    const isHL = state.highlightIndices.includes(i);
                    return (
                        <g key={i}>
                            <circle cx={p.x} cy={p.y} r={18}
                                fill={isHL ? `${C.amber}25` : C.bgPanel}
                                stroke={isHL ? C.amber : C.border} strokeWidth={isHL ? 2 : 1} />
                            <text x={p.x} y={p.y + 5} textAnchor="middle"
                                fill={isHL ? C.amber : C.text} fontSize={12} fontWeight={600}
                                fontFamily="'JetBrains Mono', monospace">{val}</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

/* ═══ Complexity Curve Chart ═══════════════════════════════════ */
export function ComplexityCurveChart({ highlightIndex }: { highlightIndex: number }) {
    const w = 280, h = 160, pad = 30;
    const maxN = 20, maxY = 50;
    const curves = [
        { label: "O(1)", fn: () => 1, color: C.green },
        { label: "O(log n)", fn: (n: number) => Math.log2(Math.max(n, 1)) * 3, color: C.cyan },
        { label: "O(n)", fn: (n: number) => n * 2, color: C.accent },
        { label: "O(n log n)", fn: (n: number) => n * Math.log2(Math.max(n, 1)) * 0.8, color: C.amber },
        { label: "O(n²)", fn: (n: number) => n * n * 0.12, color: C.orange },
        { label: "O(2ⁿ)", fn: (n: number) => Math.pow(2, n * 0.4) * 0.8, color: C.red },
    ];

    const sx = (n: number) => pad + (n / maxN) * (w - pad * 2);
    const sy = (v: number) => h - pad - Math.min(v, maxY) / maxY * (h - pad * 2);

    return (
        <svg width={w} height={h} style={{ display: "block" }}>
            {/* axes */}
            <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={C.textDim} strokeWidth={1} />
            <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={C.textDim} strokeWidth={1} />
            <text x={w / 2} y={h - 4} textAnchor="middle" fill={C.textDim} fontSize={10} fontFamily="'JetBrains Mono', monospace">n</text>
            <text x={6} y={h / 2} textAnchor="middle" fill={C.textDim} fontSize={10} fontFamily="'JetBrains Mono', monospace" transform={`rotate(-90 6 ${h / 2})`}>time</text>
            {curves.map((curve, ci) => {
                const isActive = ci === highlightIndex;
                const pts: string[] = [];
                for (let n = 0; n <= maxN; n += 0.5) {
                    pts.push(`${sx(n)},${sy(curve.fn(n))}`);
                }
                return (
                    <g key={ci}>
                        <polyline points={pts.join(" ")} fill="none"
                            stroke={curve.color} strokeWidth={isActive ? 3 : 1}
                            opacity={isActive ? 1 : 0.25} />
                        {isActive && (
                            <text x={w - pad + 4} y={sy(curve.fn(maxN)) + 4}
                                fill={curve.color} fontSize={10} fontWeight={700}
                                fontFamily="'JetBrains Mono', monospace">{curve.label}</text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
