"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Download, FileText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPreScreenLog, deletePreScreenLog } from "@/app/actions/pre-screen-actions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function BackButton({ fallbackHref = '/candidates' }: { fallbackHref?: string }) {
    const router = useRouter();
    return (
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground pl-0 gap-1 group" onClick={() => router.push(fallbackHref)}>
            <div className="rounded-full bg-background/50 p-1 group-hover:bg-background transition-colors">
                <ChevronLeft className="h-4 w-4" />
            </div>
            Back to List
        </Button>
    );
}

export function EditButton({ id }: { id: string }) {
    const router = useRouter();
    return (
        <Button onClick={() => router.push(`/candidates/${id}/edit`)}>Edit Profile</Button>
    );
}

export function AddPrescreenDialog({ candidateId }: { candidateId: string }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append("candidate_id", candidateId);

        startTransition(async () => {
            const result = await createPreScreenLog(formData);
            if (result.error) {
                alert("Error saving log: " + result.error);
            } else {
                setOpen(false);
                router.refresh();
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2 h-8">
                    <Plus className="h-3 w-3" /> Add Log
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Pre-Screen Log</DialogTitle>
                    <DialogDescription>Record a new screening session for this candidate.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="screener_name">Screener Name</Label>
                            <Input id="screener_name" name="screener_name" placeholder="e.g. John Doe" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="screening_date">Date</Label>
                            <Input id="screening_date" name="screening_date" type="date" required 
                                defaultValue={new Date().toISOString().split('T')[0]} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rating_score">Rating Score (1-10)</Label>
                            <Select name="rating_score" defaultValue="8">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select score" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                                        <SelectItem key={score} value={score.toString()}>
                                            {score}/10
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="feedback_text">Feedback</Label>
                        <Textarea
                            id="feedback_text"
                            name="feedback_text"
                            className="min-h-[150px]"
                            placeholder="Type your feedback here... (Supports basic text)"
                            required
                        />
                        <p className="text-xs text-muted-foreground">Detailed feedback about the screening session.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file">Attachment (PDF)</Label>
                        <div className="flex items-center gap-2">
                            <Input id="file" name="file" type="file" accept=".pdf" className="cursor-pointer" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving..." : "Save Log"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function DeletePrescreenButton({ logId, candidateId }: { logId: string, candidateId: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleDelete = () => {
        if (!confirm("Are you sure you want to delete this log?")) return;
        
        startTransition(async () => {
            const result = await deletePreScreenLog(logId, candidateId);
            if (result.error) {
                alert("Error deleting log: " + result.error);
            } else {
                router.refresh();
            }
        });
    };

    return (
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
        >
            <Trash2 className="h-3.5 w-3.5" />
        </Button>
    );
}

export function DeleteCandidateDialog({ id, name }: { id: string, name: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            router.push('/candidates/list');
            router.refresh();
        } catch (err: any) {
            alert("Error deleting candidate: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                    Delete Candidate
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <span className="font-bold">{name}</span> ({id})?
                        This action cannot be undone and will remove all associated data.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 sr-only">
                    {/* Hidden div if we wanted to keep the old structure, but DialogDescription is better */}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? "Deleting..." : "Confirm Delete"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
