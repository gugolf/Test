import Link from "next/link";
import { ArrowLeft, History, MessageSquare, Star, FileText, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getJRCandidateDetails } from "@/app/actions/jr-candidate-logs";
import { cn } from "@/lib/utils";

export default async function CandidateLogPage({ params }: { params: { jr_candidate_id: string } }) {
    const data = await getJRCandidateDetails(params.jr_candidate_id);

    if (!data) {
        return <div className="p-8 text-center">Candidate data not found</div>;
    }

    const { meta, logs, feedback } = data;
    const candidate = meta.candidates;

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc]">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md">
                <div className="container flex h-16 items-center px-8 gap-6 max-w-[1400px] mx-auto">
                    <Link href="/requisitions/manage">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="h-4 w-4" /> Back to JR
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-indigo-100 ring-2 ring-white">
                            <AvatarImage src={candidate?.candidate_image_url} />
                            <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold">
                                {candidate?.candidate_name?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <h1 className="text-base font-black text-slate-900 leading-tight">
                                {candidate?.candidate_name}
                            </h1>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                <span>JR_ID: {meta.jr_id}</span>
                                <span>•</span>
                                <span>Candidate ID: {meta.candidate_id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 container py-8 px-8 max-w-[1400px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Details & Feedback */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Summary Card */}
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
                                        {meta.temp_note || "No notes recorded for this JR requisition."}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Rank</span>
                                        <span className="text-lg font-black text-slate-900">{meta.rank || "-"}</span>
                                    </div>
                                    <div className="flex flex-col border-l border-slate-100 pl-4">
                                        <span className="text-[10px] font-black uppercase text-slate-400">List Type</span>
                                        <Badge className="w-fit bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 font-black uppercase tracking-tighter mt-1">
                                            {meta.list_type || "Longlist"}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Interview Feedback Section */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 pl-1">
                                <Star className="h-4 w-4" /> Interview Feedback
                            </h2>
                            {feedback.length === 0 ? (
                                <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-200 text-center">
                                    <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MessageSquare className="h-6 w-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm text-slate-400 font-bold">No interview feedback submitted yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {feedback.map((f: any) => (
                                        <Card key={f.feedback_id} className="rounded-2xl border-none shadow-sm shadow-indigo-100 hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-3 border-b border-slate-50">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">
                                                            {f.Interviewer_type || "Interview"}
                                                        </span>
                                                        <span className="font-black text-slate-900 leading-tight">{f.Interviewer_name}</span>
                                                    </div>
                                                    <div className="bg-indigo-50 text-indigo-700 rounded-lg px-2 py-1 flex items-center gap-1">
                                                        <Star className="h-3 w-3 fill-current" />
                                                        <span className="text-xs font-black">{f.rating_score || "-"}</span>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4 space-y-3">
                                                <p className="text-[13px] text-slate-600 font-medium leading-relaxed italic">
                                                    "{f.feedback_text}"
                                                </p>
                                                <div className="flex justify-between items-center pt-2">
                                                    <span className="text-[10px] font-bold text-slate-400">{f.interview_date}</span>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest",
                                                        f.overall_recommendation === 'Recommend' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                                                    )}>
                                                        {f.overall_recommendation}
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Status Timeline */}
                    <div className="lg:col-span-1">
                        <Card className="rounded-2xl border-none shadow-sm shadow-indigo-100 h-fit sticky top-24">
                            <CardHeader className="pb-4 border-b border-slate-50">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <History className="h-4 w-4" /> Activity Log
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 relative">
                                <div className="absolute left-[35px] top-6 bottom-6 w-0.5 bg-slate-100" />
                                <div className="space-y-8">
                                    {logs.map((log: any, idx: number) => (
                                        <div key={log.log_id} className="relative flex gap-4 pr-2">
                                            <div className={cn(
                                                "z-10 h-3 w-3 rounded-full shrink-0 mt-1 border-2 border-white ring-2 ring-slate-50",
                                                idx === 0 ? "bg-indigo-500 ring-indigo-50 scale-125" : "bg-slate-300"
                                            )} />
                                            <div className="flex flex-col gap-1">
                                                <span className={cn(
                                                    "text-xs font-black leading-none",
                                                    idx === 0 ? "text-indigo-700" : "text-slate-800"
                                                )}>
                                                    {log.status}
                                                </span>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                                    <span>{log.timestamp}</span>
                                                    <span>•</span>
                                                    <span className="text-slate-500">{log.updated_By}</span>
                                                </div>
                                                {log.note && (
                                                    <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 mt-1 font-medium border border-slate-100">
                                                        {log.note}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
