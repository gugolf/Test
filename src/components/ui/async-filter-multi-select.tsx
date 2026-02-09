"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce"; // We might need to create this if it doesn't exist, or use a custom hook inside.

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface AsyncFilterMultiSelectProps {
    label: string;
    icon?: React.ElementType;
    selected: string[];
    onChange: (value: string) => void;
    fetcher: (query: string, limit?: number, filters?: any) => Promise<string[]>; // Updated signature match
    initialOptions?: string[];
    placeholder?: string;
    filters?: any; // Added filters prop
}

const DEFAULT_OPTIONS: string[] = [];

export function AsyncFilterMultiSelect({
    label,
    icon: Icon,
    selected,
    onChange,
    fetcher,
    initialOptions = DEFAULT_OPTIONS,
    placeholder = "Search...",
    filters,
}: AsyncFilterMultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [options, setOptions] = React.useState<string[]>(initialOptions);
    const [loading, setLoading] = React.useState(false);

    // Debounce the search query
    const [debouncedQuery, setDebouncedQuery] = React.useState(query);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    React.useEffect(() => {
        let active = true;

        async function fetchData() {
            // If no query and no filters, and we have initial options, use them.
            // But if we have filters, we likely want to fetch new options even if query is empty.
            const hasFilters = filters && Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : !!v);

            if (!debouncedQuery && !hasFilters && initialOptions.length > 0) {
                setOptions(initialOptions);
                return;
            }

            // If no query and no filters and no initial options, we normally don't fetch (to avoid full loose scan),
            // UNLESS the user explicitly opened the menu? 
            // For now, let's allow fetching defaults if it's "Position" or "Company" to just show *popular* ones?
            // Current strict logic: if (!query) return []; in server action.

            // We'll proceed to fetch. Server action will handle empty query policies.

            setLoading(true);
            try {
                // Pass limit=50 usually (server action default)
                // We must pass filters
                const results = await fetcher(debouncedQuery || "", 50, filters);

                if (active) {
                    setOptions(results || []);
                }
            } catch (error) {
                console.error("Async Select Fetch Error:", error);
                if (active) setOptions([]);
            } finally {
                if (active) setLoading(false);
            }
        }

        // Trigger fetch when query changes OR filters change OR open state changes (if we want to refresh on open)
        // For now, dependencies are debouncedQuery and filters.
        fetchData();

        return () => {
            active = false;
        };
    }, [debouncedQuery, filters, fetcher, initialOptions]);


    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    size="sm"
                    className={cn(
                        "h-9 gap-2 border-dashed bg-background",
                        selected.length > 0 && "border-primary/50 bg-primary/5"
                    )}
                >
                    {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                    {label}
                    {selected.length > 0 && (
                        <Badge
                            variant="secondary"
                            className="ml-1 h-5 px-1 text-[10px] bg-primary text-primary-foreground"
                        >
                            {selected.length}
                        </Badge>
                    )}
                    <ChevronsUpDown className="ml-auto h-3 w-3 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="start">
                <Command shouldFilter={false}>
                    {/* 
              IMPORTANT: We set shouldFilter={false} on Command because we are filtering/searching server-side.
              The CommandInput just captures the text. 
          */}
                    <CommandInput
                        placeholder={placeholder}
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <>
                                {options.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
                                {options.length > 0 && (
                                    <div className="flex items-center justify-between px-2 py-1.5 bg-secondary/20 border-b">
                                        <span className="text-[10px] text-muted-foreground font-medium">Found {options.length} results</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 text-[10px] px-2 hover:bg-background"
                                            onClick={() => {
                                                const newItems = options.filter(o => !selected.includes(o));
                                                if (newItems.length > 0) {
                                                    // We need to call onChange for EACH item, or better, expose a bulkOnChange?
                                                    // Since onChange is (value: string) => void, we can't do bulk easily without changing props.
                                                    // Let's iterate for now (React batching should handle it, or we might flicker).
                                                    // actually, we should probably update the parent to accept arrays if possible, but let's stick to the interface.
                                                    // Better: check if we should change the interface. The parent 'toggleFilter' takes a single value.
                                                    // We can try to loop.
                                                    newItems.forEach(item => onChange(item));
                                                }
                                            }}
                                        >
                                            Select All
                                        </Button>
                                    </div>
                                )}
                                <CommandGroup heading={query ? "Search Results" : "Recent / Suggested"}>
                                    {options.map((option) => {
                                        const isSelected = selected.includes(option);
                                        return (
                                            <CommandItem
                                                key={option}
                                                value={option}
                                                onSelect={() => {
                                                    onChange(option);
                                                }}
                                            >
                                                <div
                                                    className={cn(
                                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground"
                                                            : "opacity-50 [&_svg]:invisible"
                                                    )}
                                                >
                                                    <Check className={cn("h-4 w-4")} />
                                                </div>
                                                {/* Highlighting Logic */}
                                                <span className="truncate">
                                                    {(() => {
                                                        if (!query) return option;
                                                        const parts = option.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                                                        return parts.map((part, i) =>
                                                            part.toLowerCase() === query.toLowerCase() ? <span key={i} className="font-bold bg-yellow-100 dark:bg-yellow-900/40 text-primary">{part}</span> : part
                                                        );
                                                    })()}
                                                </span>
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </>
                        )}

                        {selected.length > 0 && (
                            <div className="border-t pt-1 mt-1">
                                <CommandGroup heading="Selected">
                                    {selected.map((item) => {
                                        // Only show if not already in the list above to avoid duplicates?
                                        // Or just show them all in a separate group.
                                        if (options.includes(item)) return null;

                                        return (
                                            <CommandItem
                                                key={item}
                                                value={item}
                                                onSelect={() => onChange(item)}
                                            >
                                                <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary bg-primary text-primary-foreground">
                                                    <Check className="h-4 w-4" />
                                                </div>
                                                {item}
                                            </CommandItem>
                                        )
                                    })}
                                </CommandGroup>
                            </div>
                        )}

                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
