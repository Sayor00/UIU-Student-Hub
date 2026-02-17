"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    const defaultClassNames = getDefaultClassNames();
    const isDropdown = props.captionLayout?.startsWith("dropdown");

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: `relative flex ${defaultClassNames.months}`,
                month_caption: `relative mx-10 flex h-7 items-center justify-center ${defaultClassNames.month_caption}`,
                weekdays: cn("flex flex-row", classNames?.weekdays),
                weekday: cn(
                    "w-8 text-sm font-normal text-muted-foreground",
                    classNames?.weekday
                ),
                month: cn("w-full", classNames?.month),
                caption_label: cn(
                    "truncate text-sm font-medium",
                    isDropdown && "hidden",
                    classNames?.caption_label
                ),
                dropdowns: cn("flex flex-row gap-2 items-center", classNames?.dropdowns),
                dropdown: cn("bg-transparent border-none shadow-none p-0 m-0 cursor-pointer appearance-none text-sm font-medium hover:bg-muted/50 rounded-md px-1", classNames?.dropdown),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 p-0 absolute right-1 opacity-70 hover:opacity-100",
                    classNames?.button_next
                ),
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 p-0 absolute left-1 opacity-70 hover:opacity-100",
                    classNames?.button_previous
                ),
                nav: cn("flex items-start", classNames?.nav),
                month_grid: cn("mx-auto mt-4", classNames?.month_grid),
                week: cn("mt-2 flex w-full", classNames?.week),
                day: cn(
                    "flex size-8 flex-1 items-center justify-center p-0 text-sm",
                    classNames?.day
                ),
                day_button: cn(
                    "size-8 rounded-md p-0 font-normal transition-none aria-selected:opacity-100",
                    classNames?.day_button
                ),
                range_start: cn(
                    "bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground day-range-start rounded-s-md",
                    classNames?.range_start
                ),
                range_middle: cn(
                    "bg-accent [&>button]:bg-transparent aria-selected:bg-accent",
                    classNames?.range_middle
                ),
                range_end: cn(
                    "bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground day-range-end rounded-e-md",
                    classNames?.range_end
                ),
                selected: cn(
                    "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
                    classNames?.selected
                ),
                today: cn(
                    "[&>button]:bg-accent [&>button]:text-accent-foreground",
                    classNames?.today
                ),
                outside: cn(
                    "day-outside text-muted-foreground opacity-50",
                    classNames?.outside
                ),
                disabled: cn("text-muted-foreground opacity-50", classNames?.disabled),
                hidden: cn("invisible", classNames?.hidden),
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation, ...props }) => {
                    const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
                    return <Icon className="h-4 w-4" {...props} />
                },
                Dropdown: ({ value, onChange, children, ...props }: any) => {
                    const options = props.options || React.Children.toArray(children)
                    const selected = options.find((child: any) => {
                        return child.value === value || child.props?.value === value
                    })

                    const handleChange = (value: string) => {
                        const changeEvent = {
                            target: { value },
                        } as React.ChangeEvent<HTMLSelectElement>
                        onChange?.(changeEvent)
                    }

                    return (
                        <Select
                            value={value?.toString()}
                            onValueChange={handleChange}
                        >
                            <SelectTrigger
                                className="h-7 w-fit font-medium text-sm border border-input shadow-sm bg-transparent px-2 py-1 focus:ring-1 focus:ring-ring gap-1"
                            >
                                <SelectValue>{selected?.label ?? selected?.props?.children ?? value}</SelectValue>
                            </SelectTrigger>
                            <SelectContent position="popper">
                                <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                                    {options.map((option: any, id: number) => (
                                        <SelectItem key={`${option.value || option.props?.value}-${id}`} value={option.value?.toString() ?? option.props?.value?.toString() ?? ""}>
                                            {option.label || option.props?.children}
                                        </SelectItem>
                                    ))}
                                </div>
                            </SelectContent>
                        </Select>
                    )
                },
            }}
            {...props}
        />
    );
}
Calendar.displayName = "Calendar";

export { Calendar };
