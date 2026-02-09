"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface AtsBreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string; // Additional classes for container
    pageTitle?: string; // Optional: Override the last item as a title
    action?: React.ReactNode; // Optional: Action button on the right
}

export function AtsBreadcrumb({ items, className, pageTitle, action }: AtsBreadcrumbProps) {
    const router = useRouter();

    // Logic: 
    // - Always start with Home icon -> /
    // - Then map items
    // - Last item is usually current page (text only, no link) unless specified

    return (
        <div className={cn("flex flex-col gap-4 mb-6", className)}>
            {/* Top Row: Back Button + Breadcrumbs + Action */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {/* Home */}
                    <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        <span className="sr-only">Home</span>
                    </Link>

                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        return (
                            <React.Fragment key={index}>
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                                {item.href && !isLast ? (
                                    <Link href={item.href} className="hover:text-primary transition-colors font-medium">
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className={cn("font-medium", isLast ? "text-foreground font-semibold" : "")}>
                                        {item.label}
                                    </span>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {action && <div>{action}</div>}
            </div>

            {/* Optional: If we want a standardized Title/Header logic here too, we could add it. 
                For now, we keep it simple as just navigation. 
            */}
        </div>
    );
}
