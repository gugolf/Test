"use client";

import React, { useState } from "react";
import { Linkedin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CandidateLinkedinButtonProps {
    checked?: string;
    linkedin?: string;
    candidateId: string;
    className?: string;
}

export function CandidateLinkedinButton({ checked, linkedin, candidateId, className }: CandidateLinkedinButtonProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newType, setNewType] = useState("LinkedIN profile");
    const [newUrl, setNewUrl] = useState("");

    const normChecked = checked?.trim().toLowerCase() || "no profile";

    // Allow multiple URLs to be clickable
    const renderLinks = (text: string) => {
        if (!text) return <span className="text-muted-foreground italic">No link provided</span>;

        // Split by URL
        const parts = text.split(/(https?:\/\/[^\s]+)/g);
        return parts.map((part, i) => {
            if (part.match(/^https?:\/\//)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium break-all">
                        {part}
                    </a>
                );
            }
            return <span key={i} className="break-words">{part}</span>;
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!newUrl) return toast.error("Please enter a URL");

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/candidates/${candidateId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checked: newType, linkedin: newUrl })
            });
            if (!res.ok) throw new Error("Failed to update profile link");
            toast.success("Profile link updated successfully");
            setIsOpen(false);
            setNewUrl("");
            router.refresh(); // Refresh page data to reflect new status
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 1. LinkedIn Profile
    if (normChecked === 'linkedin profile') {
        return (
            <a href={linkedin} target="_blank" rel="noopener noreferrer"
                className={cn("h-7 w-7 rounded-md bg-[#0a66c2]/10 text-[#0a66c2] hover:bg-[#0a66c2]/20 transition-colors shadow-sm inline-flex items-center justify-center shrink-0", className)}
                title="LinkedIn Profile"
                onClick={(e) => e.stopPropagation()}>
                <Linkedin className="h-4 w-4" />
            </a>
        );
    }

    // 2. Individual Link
    if (normChecked === 'individual link') {
        return (
            <Popover>
                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className={cn("h-7 w-7 p-0 bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shrink-0", className)} title="Individual Profile">
                        <Globe className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <p className="font-semibold mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" /> Individual Link Reference
                    </p>
                    <div className="whitespace-pre-wrap bg-secondary/10 p-3 rounded-md border text-xs leading-relaxed max-h-[200px] overflow-y-auto">
                        {renderLinks(linkedin || "")}
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    // 3. No Profile or empty (fallback)
    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}>
                <Button variant="outline" size="sm" className={cn("h-7 w-7 p-0 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 border-red-200 relative overflow-hidden group shrink-0", className)} title="No Profile - Click to Add">
                    <Globe className="h-4 w-4" />
                    {/* Red line crossing out */}
                    <div className="absolute top-1/2 left-[-20%] w-[140%] h-[1.5px] bg-red-500 rotate-45 group-hover:bg-red-600 transition-colors" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] text-sm p-4 shadow-xl" align="start" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm">Add Profile Link</h4>
                        <p className="text-xs text-muted-foreground mt-1">Select the type of profile and enter the URL.</p>
                    </div>

                    <div className="space-y-3 bg-secondary/20 p-3 rounded-lg border">
                        <RadioGroup value={newType} onValueChange={setNewType}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="LinkedIN profile" id={`r1-${candidateId}`} />
                                <Label htmlFor={`r1-${candidateId}`} className="cursor-pointer text-xs font-medium">LinkedIn Profile</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Individual link" id={`r2-${candidateId}`} />
                                <Label htmlFor={`r2-${candidateId}`} className="cursor-pointer text-xs font-medium">Individual Profile</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor={`url-${candidateId}`} className="text-xs">URL Reference</Label>
                        <Input
                            id={`url-${candidateId}`}
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            placeholder="https://..."
                            className="h-8 text-xs"
                            autoComplete="off"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit" size="sm" className="h-8 bg-primary text-xs" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Link"}
                        </Button>
                    </div>
                </form>
            </PopoverContent>
        </Popover>
    );
}
