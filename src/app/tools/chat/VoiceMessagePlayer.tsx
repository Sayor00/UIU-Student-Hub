"use client";

import React from "react";
import { Play, Pause } from "lucide-react";

interface VoiceMessagePlayerProps {
    src: string;
    isMe?: boolean;
}

/**
 * Custom voice message player with waveform visualization.
 * Single-row layout: [play] [waveform bars] [time]
 */
export default function VoiceMessagePlayer({ src, isMe }: VoiceMessagePlayerProps) {
    const [playing, setPlaying] = React.useState(false);
    const [currentTime, setCurrent] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [waveform, setWaveform] = React.useState<number[]>([]);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const animRef = React.useRef<number>(0);
    const bars = 48;

    // Generate waveform from audio data
    React.useEffect(() => {
        let cancelled = false;
        const generateWaveform = async () => {
            try {
                const response = await fetch(src);
                const arrayBuffer = await response.arrayBuffer();
                const audioCtx = new AudioContext();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                const rawData = audioBuffer.getChannelData(0);
                const samples: number[] = [];
                const blockSize = Math.floor(rawData.length / bars);
                for (let i = 0; i < bars; i++) {
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(rawData[i * blockSize + j]);
                    }
                    samples.push(sum / blockSize);
                }
                const max = Math.max(...samples, 0.01);
                const normalized = samples.map((s) => Math.max(s / max, 0.08));
                if (!cancelled) setWaveform(normalized);
                audioCtx.close();
            } catch {
                if (!cancelled) {
                    const fallback = Array.from({ length: bars }, (_, i) => {
                        const x = i / bars;
                        return 0.15 + 0.7 * Math.abs(Math.sin(x * Math.PI * 3 + 1.5) * Math.cos(x * 5));
                    });
                    setWaveform(fallback);
                }
            }
        };
        generateWaveform();
        return () => { cancelled = true; };
    }, [src, bars]);

    React.useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onLoaded = () => setDuration(audio.duration || 0);
        const onEnded = () => { setPlaying(false); setCurrent(0); };
        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("ended", onEnded);
        return () => {
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("ended", onEnded);
        };
    }, []);

    React.useEffect(() => {
        if (playing) {
            const tick = () => {
                const audio = audioRef.current;
                if (audio) setCurrent(audio.currentTime);
                animRef.current = requestAnimationFrame(tick);
            };
            animRef.current = requestAnimationFrame(tick);
        } else {
            cancelAnimationFrame(animRef.current);
        }
        return () => cancelAnimationFrame(animRef.current);
    }, [playing]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) { audio.pause(); setPlaying(false); }
        else { audio.play(); setPlaying(true); }
    };

    const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = pct * duration;
        setCurrent(audio.currentTime);
    };

    const progress = duration > 0 ? currentTime / duration : 0;

    const fmt = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const playedColor = isMe ? "rgba(255,255,255,0.85)" : "hsl(var(--primary))";
    const unplayedColor = isMe ? "rgba(255,255,255,0.25)" : "hsl(var(--muted-foreground) / 0.25)";

    return (
        <div className="flex items-center gap-3 min-w-[220px] w-full">
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause */}
            <button onClick={togglePlay} className="shrink-0">
                {playing
                    ? <Pause className={`h-5 w-5 ${isMe ? "text-primary-foreground" : "text-foreground"}`} fill="currentColor" />
                    : <Play className={`h-5 w-5 ${isMe ? "text-primary-foreground" : "text-foreground"}`} fill="currentColor" />
                }
            </button>

            {/* Waveform bars */}
            <div
                className="flex items-center gap-[1.5px] h-8 flex-1 cursor-pointer"
                onClick={handleBarClick}
            >
                {(waveform.length > 0 ? waveform : Array(bars).fill(0.15)).map((h, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-full"
                        style={{
                            height: `${Math.max(h * 100, 10)}%`,
                            backgroundColor: (i / bars) <= progress ? playedColor : unplayedColor,
                            minHeight: 2,
                            transition: "background-color 120ms",
                        }}
                    />
                ))}
            </div>

            {/* Time */}
            <span className={`text-[11px] tabular-nums shrink-0 font-medium ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {playing ? fmt(currentTime) : fmt(duration)}
            </span>
        </div>
    );
}

/**
 * Live recording waveform that accumulates bars over time and scrolls,
 * similar to WhatsApp's voice recording UI.
 */
export function RecordingWaveform({ stream }: { stream?: MediaStream | null }) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const barsRef = React.useRef<number[]>([]);
    const [bars, setBars] = React.useState<number[]>([]);
    const analyserRef = React.useRef<AnalyserNode | null>(null);
    const audioCtxRef = React.useRef<AudioContext | null>(null);

    React.useEffect(() => {
        if (!stream) return;
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        barsRef.current = [];

        // Sample every ~80ms to accumulate bars
        const interval = setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            const count = Math.min(32, dataArray.length);
            for (let i = 0; i < count; i++) {
                sum += dataArray[i];
            }
            const level = Math.max((sum / count) / 255, 0.06);
            barsRef.current = [...barsRef.current, level];
            setBars([...barsRef.current]);
        }, 80);

        return () => {
            clearInterval(interval);
            audioCtx.close();
        };
    }, [stream]);

    // Auto-scroll to the right when new bars appear
    React.useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.scrollLeft = container.scrollWidth;
        }
    }, [bars]);

    const barWidth = 3;
    const gap = 1.5;

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-hidden h-7 flex items-center relative"
        >
            <div
                className="flex items-center gap-[1.5px] h-full absolute right-0"
                style={{
                    minWidth: bars.length * (barWidth + gap),
                    justifyContent: "flex-end",
                }}
            >
                {bars.map((h, i) => (
                    <div
                        key={i}
                        className="rounded-full shrink-0"
                        style={{
                            width: barWidth,
                            height: `${Math.max(h * 100, 8)}%`,
                            minHeight: 3,
                            maxHeight: '100%',
                            backgroundColor: `hsl(var(--destructive) / ${0.4 + h * 0.5})`,
                            transition: "height 80ms ease-out",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
