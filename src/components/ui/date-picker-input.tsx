"use client";

import * as React from "react";
import { format, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithInputProps {
    value?: Date;
    onChange?: (date: Date | undefined) => void;
    className?: string;
}

export function DatePickerWithInput({
    value,
    onChange,
    className,
}: DatePickerWithInputProps) {
    const [day, setDay] = React.useState("");
    const [month, setMonth] = React.useState("");
    const [year, setYear] = React.useState("");
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

    const dayRef = React.useRef<HTMLInputElement>(null);
    const monthRef = React.useRef<HTMLInputElement>(null);
    const yearRef = React.useRef<HTMLInputElement>(null);

    // Sync from props (Date object) to strings
    React.useEffect(() => {
        if (value && isValid(value)) {
            setDay(format(value, "dd"));
            setMonth(format(value, "MM"));
            setYear(format(value, "yyyy"));
        } else {
            setDay("");
            setMonth("");
            setYear("");
        }
    }, [value]);

    // Push changes to parent
    const updateDate = (d: string, m: string, y: string) => {
        const dayNum = parseInt(d);
        const monthNum = parseInt(m);
        const yearNum = parseInt(y);

        if (
            d.length === 2 &&
            m.length === 2 &&
            y.length === 4 &&
            !isNaN(dayNum) &&
            !isNaN(monthNum) &&
            !isNaN(yearNum)
        ) {
            const date = new Date(yearNum, monthNum - 1, dayNum);
            // Check if valid and matches input (e.g. 30/02 shouldn't become 02/03)
            if (
                isValid(date) &&
                date.getDate() === dayNum &&
                date.getMonth() === monthNum - 1 &&
                date.getFullYear() === yearNum
            ) {
                if (!value || date.getTime() !== value.getTime()) {
                    onChange?.(date);
                }
            }
        } else if (d === "" && m === "" && y === "") {
            onChange?.(undefined);
        }
    };

    const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, "").slice(0, 2);
        // Prevent manual entry of > 31
        if (parseInt(val) > 31) val = "31";

        setDay(val);
        updateDate(val, month, year);

        if (val.length === 2) {
            monthRef.current?.focus();
        }
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, "").slice(0, 2);
        // Prevent manual entry of > 12
        if (parseInt(val) > 12) val = "12";

        setMonth(val);
        updateDate(day, val, year);

        if (val.length === 2) {
            yearRef.current?.focus();
        }
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
        setYear(val);
        updateDate(day, month, val);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'day' | 'month' | 'year') => {
        if (e.key === "Backspace") {
            if ((e.target as HTMLInputElement).value === "") {
                if (type === 'month') dayRef.current?.focus();
                if (type === 'year') monthRef.current?.focus();
            }
        }
        if (e.key === "ArrowLeft") {
            if (e.currentTarget.selectionStart === 0 || e.currentTarget.value === "") {
                e.preventDefault();
                if (type === 'month') dayRef.current?.focus();
                if (type === 'year') monthRef.current?.focus();
            }
        }
        if (e.key === "ArrowRight") {
            if (e.currentTarget.selectionStart === e.currentTarget.value.length || e.currentTarget.value === "") {
                e.preventDefault();
                if (type === 'day') monthRef.current?.focus();
                if (type === 'month') yearRef.current?.focus();
            }
        }
    };

    const handleDateSelect = (date: Date | undefined) => {
        onChange?.(date); // Effects will sync state
        setIsPopoverOpen(false);
    };

    return (
        <div className={cn("relative w-full", className)}>
            <div className="flex w-full h-full items-center rounded-md border border-input bg-background/60 backdrop-blur-xl ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="grid flex-1 grid-cols-[1fr_auto_1fr_auto_1.4fr] items-center text-sm">
                    <input
                        ref={dayRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="DD"
                        className="w-full bg-transparent p-0 text-center outline-none placeholder:text-muted-foreground"
                        value={day}
                        onChange={handleDayChange}
                        onKeyDown={(e) => handleKeyDown(e, 'day')}
                        maxLength={2}
                    />
                    <span className="text-muted-foreground/50 text-center mx-1">/</span>
                    <input
                        ref={monthRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="MM"
                        className="w-full bg-transparent p-0 text-center outline-none placeholder:text-muted-foreground"
                        value={month}
                        onChange={handleMonthChange}
                        onKeyDown={(e) => handleKeyDown(e, 'month')}
                        maxLength={2}
                    />
                    <span className="text-muted-foreground/50 text-center mx-1">/</span>
                    <input
                        ref={yearRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="YYYY"
                        className="w-full bg-transparent p-0 text-center outline-none placeholder:text-muted-foreground"
                        value={year}
                        onChange={handleYearChange}
                        onKeyDown={(e) => handleKeyDown(e, 'year')}
                        maxLength={4}
                    />
                </div>

                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-9 w-9 text-muted-foreground hover:text-foreground rounded-r-md rounded-l-none"
                            type="button"
                        >
                            <CalendarIcon className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background/80 backdrop-blur-xl border-white/10" align="end">
                        <Calendar
                            mode="single"
                            selected={value}
                            onSelect={handleDateSelect}
                            initialFocus
                            captionLayout="dropdown"
                            startMonth={new Date(2020, 0)}
                            endMonth={new Date(2030, 11)}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
