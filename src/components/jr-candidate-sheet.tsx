"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Loader2 } from "lucide-react";
import { getJRCandidateDetails } from "@/app/actions/jr-candidate-logs";
import { FeedbackSection } from "@/components/feedback-section";
import { CandidateActivityLog } from "@/components/candidate-activity-log";
import { CandidateAvatar } from "@/components/candidate-avatar";

interface JRCandidateSheetProps {
    jrCandidateId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function JRCandidateSheet({ jrCandidateId, open, onOpenChange }: JRCandidateSheetProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !jrCandidateId) {
            setData(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        getJRCandidateDetails(jrCandidateId).then((result) => {
            if (!cancelled) {
                setData(result);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [jrCandidateId, open]);

    const meta = data?.meta;
    const logs = data?.logs ?? [];
    const feedback = data?.feedback ?? [];
    const candidate = meta?.candidate_profile;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[820px] p-0 overflow-y-auto flex flex-col bg-[#f8fafc]"
            >
                {/* Header */}
                <SheetHeader className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b shadow-sm px-8 py-5 flex-shrink-0">
                    {/* SheetTitle must always be rendered for Radix accessibility */}
                    <SheetTitle className={loading || !data ? "sr-only" : "text-xl font-black text-slate-900 leading-none tracking-tight"}>
                        {loading || !data ? "Candidate Details" : candidate?.name}
                    </SheetTitle>
                    {loading || !data ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                            <span className="text-sm font-bold text-slate-500">Loading candidate details...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 -mt-1">
                            <CandidateAvatar
                                src={candidate?.photo_url}
                                name={candidate?.name}
                                className="h-12 w-12 border-4 border-white shadow-md ring-2 ring-indigo-50"
                                fallbackClassName="text-lg"
                            />
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                                        JR: {meta?.jr_id}
                                    </span>
                                    <span className="bg-indigo-50 px-2 py-0.5 rounded text-indigo-700 border border-indigo-100 font-mono">
                                        ID: {meta?.candidate_id}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetHeader>


                {/* Content */}
                {!loading && data && (
                    <div className="flex-1 py-6 px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Summary + Feedback */}
                            <div className="lg:col-span-2 space-y-5">
                                {/* Recruitment Summary Card */}
                                <Card className="rounded-2xl border-none shadow-sm shadow-indigo-100 overflow-hidden">
                                    <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" /> Recruitment Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <span className="text-[10px] font-black uppercase text-indigo-500 mb-2 block tracking-wider">Note from JR</span>
                                            <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                                {meta?.temp_note || "No notes recorded for this JR requisition."}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-4 pt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-slate-400">Rank</span>
                                                <span className="text-lg font-black text-slate-900">{meta?.rank || "-"}</span>
                                            </div>
                                            <div className="flex flex-col border-l border-slate-100 pl-4">
                                                <span className="text-[10px] font-black uppercase text-slate-400">List Type</span>
                                                <Badge className="w-fit bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 font-black uppercase tracking-tighter mt-1">
                                                    {meta?.list_type || "Longlist"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Interview Feedback */}
                                <FeedbackSection
                                    jrCandidateId={meta?.jr_candidate_id || jrCandidateId!}
                                    candidateName={candidate?.name}
                                    feedback={feedback}
                                />
                            </div>

                            {/* Right: Activity Log */}
                            <div className="lg:col-span-1">
                                <CandidateActivityLog
                                    logs={logs}
                                    jrCandidateId={jrCandidateId!}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
