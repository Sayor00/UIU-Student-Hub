"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface TimePickerInputProps {
    value?: string; // "HH:mm" 24h format
    onChange?: (time: string) => void;
    className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerInputProps) {
    const [hour, setHour] = React.useState("");
    const [minute, setMinute] = React.useState("");
    const [period, setPeriod] = React.useState<"AM" | "PM">("AM");
    const [isOpen, setIsOpen] = React.useState(false);

    const hourRef = React.useRef<HTMLInputElement>(null);
    const minuteRef = React.useRef<HTMLInputElement>(null);
    const periodRef = React.useRef<HTMLButtonElement>(null);
    const isInternalUpdate = React.useRef(false);

    // Sync from props — only when value changes from an EXTERNAL source
    React.useEffect(() => {
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }

        if (value) {
            const parts = value.split(":");
            if (parts.length !== 2) return;
            let hourInt = parseInt(parts[0], 10);
            const periodVal = hourInt >= 12 ? "PM" : "AM";

            if (hourInt > 12) hourInt -= 12;
            if (hourInt === 0) hourInt = 12;

            setHour(hourInt.toString().padStart(2, "0"));
            setMinute(parts[1]);
            setPeriod(periodVal);
        } else {
            setHour("");
            setMinute("");
            setPeriod("AM");
        }
    }, [value]);

    const emitTime = (h: string, m: string, p: "AM" | "PM") => {
        const hourNum = parseInt(h);
        const minuteNum = parseInt(m);

        if (!isNaN(hourNum) && !isNaN(minuteNum) && hourNum >= 1 && hourNum <= 12 && minuteNum >= 0 && minuteNum <= 59) {
            let finalHour = hourNum;
            if (p === "PM" && finalHour !== 12) finalHour += 12;
            if (p === "AM" && finalHour === 12) finalHour = 0;

            const timeStr = `${finalHour.toString().padStart(2, "0")}:${m.padStart(2, "0")}`;
            isInternalUpdate.current = true;
            onChange?.(timeStr);
        }
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "");

        if (raw.length === 0) {
            setHour("");
            return;
        }

        // Allow typing up to 2 digits
        let val = raw.slice(0, 2);
        const num = parseInt(val);

        if (val.length === 2) {
            // Clamp to valid 12h range
            if (num > 12) val = "12";
            else if (num === 0) val = "12";
            setHour(val);
            if (minute) emitTime(val, minute, period);
            // Auto-focus minute after 2 valid digits
            setTimeout(() => minuteRef.current?.focus(), 0);
        } else if (val.length === 1 && num > 1) {
            // Single digit 2-9: can't be start of 10/11/12, auto-pad
            val = "0" + val;
            setHour(val);
            if (minute) emitTime(val, minute, period);
            setTimeout(() => minuteRef.current?.focus(), 0);
        } else {
            // Single digit 0 or 1: could be start of 01-09 or 10-12, let user keep typing
            setHour(val);
        }
    };

    const handleHourBlur = () => {
        if (hour === "") return;
        let val = hour;
        if (val.length === 1) val = "0" + val;
        if (val === "00") val = "12";
        setHour(val);
        if (minute) emitTime(val, minute, period);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "");

        if (raw.length === 0) {
            setMinute("");
            return;
        }

        let val = raw.slice(0, 2);
        const num = parseInt(val);

        if (val.length === 2) {
            if (num > 59) val = "59";
            setMinute(val);
            if (hour) emitTime(hour, val, period);
            setTimeout(() => periodRef.current?.focus(), 0);
        } else if (val.length === 1 && num > 5) {
            // 6-9 can't be start of valid minute tens digit, auto-pad
            val = "0" + val;
            setMinute(val);
            if (hour) emitTime(hour, val, period);
            setTimeout(() => periodRef.current?.focus(), 0);
        } else {
            setMinute(val);
        }
    };

    const handleMinuteBlur = () => {
        if (minute === "") return;
        let val = minute;
        if (val.length === 1) val = "0" + val;
        setMinute(val);
        if (hour) emitTime(hour, val, period);
    };

    const togglePeriod = () => {
        const newPeriod = period === "AM" ? "PM" : "AM";
        setPeriod(newPeriod);
        if (hour && minute) emitTime(hour, minute, newPeriod);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'hour' | 'minute') => {
        if (e.key === "Backspace" && (e.target as HTMLInputElement).value === "") {
            if (type === 'minute') hourRef.current?.focus();
        }
        if (e.key === "ArrowLeft") {
            if (type === 'minute' && (e.currentTarget.selectionStart === 0 || e.currentTarget.value === "")) hourRef.current?.focus();
        }
        if (e.key === "ArrowRight") {
            if (type === 'hour' && (e.currentTarget.selectionStart === e.currentTarget.value.length || e.currentTarget.value === "")) minuteRef.current?.focus();
            if (type === 'minute' && (e.currentTarget.selectionStart === e.currentTarget.value.length || e.currentTarget.value === "")) periodRef.current?.focus();
        }
    };

    // Helper for popup selection
    const selectTime = (type: "hour" | "minute" | "period", v: string) => {
        if (type === "hour") {
            setHour(v);
            const m = minute || "00";
            setMinute(m);
            emitTime(v, m, period);
        } else if (type === "minute") {
            setMinute(v);
            const h = hour || "12";
            setHour(h);
            emitTime(h, v, period);
        } else if (type === "period") {
            setPeriod(v as "AM" | "PM");
            if (hour && minute) emitTime(hour, minute, v as "AM" | "PM");
        }
    };

    return (
        <div className={cn("relative w-full h-9", className)}>
            <div className="flex w-full h-full items-center rounded-md border border-input bg-background/60 backdrop-blur-xl ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="grid flex-1 grid-cols-[1fr_auto_1fr_auto_1fr] items-center text-sm">
                    <input
                        ref={hourRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="HH"
                        className="w-full bg-transparent p-0 text-center outline-none placeholder:text-muted-foreground"
                        value={hour}
                        onChange={handleHourChange}
                        onBlur={handleHourBlur}
                        onKeyDown={(e) => handleKeyDown(e, 'hour')}
                        onFocus={(e) => e.target.select()}
                        maxLength={2}
                    />
                    <span className="text-muted-foreground/50 text-center text-xs mx-0.5">:</span>
                    <input
                        ref={minuteRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="MM"
                        className="w-full bg-transparent p-0 text-center outline-none placeholder:text-muted-foreground"
                        value={minute}
                        onChange={handleMinuteChange}
                        onBlur={handleMinuteBlur}
                        onKeyDown={(e) => handleKeyDown(e, 'minute')}
                        onFocus={(e) => e.target.select()}
                        maxLength={2}
                    />
                    <span className="text-muted-foreground/50 text-center text-xs mx-0.5"> </span>
                    <button
                        ref={periodRef}
                        type="button"
                        onClick={togglePeriod}
                        className="w-full text-center hover:bg-muted/50 rounded-sm focus:outline-none focus:bg-muted/50 text-xs font-medium cursor-pointer"
                    >
                        {period}
                    </button>
                </div>

                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-9 w-9 text-muted-foreground hover:text-foreground rounded-r-md rounded-l-none"
                            type="button"
                        >
                            <Clock className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background/80 backdrop-blur-xl border-white/10" align="end">
                        <div className="flex items-center border-b divide-x bg-muted/40">
                            <div className="w-[60px] p-2 text-center text-xs font-medium text-muted-foreground">Hour</div>
                            <div className="w-[60px] p-2 text-center text-xs font-medium text-muted-foreground">Min</div>
                            <div className="w-[60px] p-2 text-center text-xs font-medium text-muted-foreground">AM/PM</div>
                        </div>
                        <div className="flex h-[200px] divide-x">
                            {/* Hours */}
                            <div className="h-full overflow-y-auto w-[60px]">
                                <div className="p-2 grid gap-1">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                                        var hStr = h.toString().padStart(2, "0");
                                        return (
                                            <Button
                                                key={h}
                                                variant={hour === hStr ? "default" : "ghost"}
                                                size="sm"
                                                className="w-full h-8"
                                                onClick={() => selectTime("hour", hStr)}
                                            >
                                                {hStr}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Minutes */}
                            <div className="h-full overflow-y-auto w-[60px]">
                                <div className="p-2 grid gap-1">
                                    {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => {
                                        var mStr = m.toString().padStart(2, "0");
                                        return (
                                            <Button
                                                key={m}
                                                variant={minute === mStr ? "default" : "ghost"}
                                                size="sm"
                                                className="w-full h-8"
                                                onClick={() => selectTime("minute", mStr)}
                                            >
                                                {mStr}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* AM/PM */}
                            <div className="h-full overflow-y-auto w-[60px]">
                                <div className="p-2 grid gap-1">
                                    {["AM", "PM"].map((p) => (
                                        <Button
                                            key={p}
                                            variant={period === p ? "default" : "ghost"}
                                            size="sm"
                                            className="w-full h-8"
                                            onClick={() => selectTime("period", p)}
                                        >
                                            {p}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
