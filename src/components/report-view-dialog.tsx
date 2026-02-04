"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getReportsByJR } from "@/app/actions/n8n-actions";
import {
    FileText,
    FileSpreadsheet,
    Share2,
    Clock,
    Loader2,
    ExternalLink,
    AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Report {
    id: number;
    created_at: string;
    requester: string;
    jr_id: string;
    job_name: string;
    pptx_url: string;
    csv_top_profile_url: string;
    csv_longlist_url: string;
    csv_longlist_aggregated_url: string;
    summary_mapping_url: string;
    status: string;
}

interface ReportViewDialogProps {
    jrId: string;
    jobName?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReportViewDialog({ jrId, jobName, open, onOpenChange }: ReportViewDialogProps) {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && jrId) {
            loadReports();
        }
    }, [open, jrId]);

    async function loadReports() {
        setLoading(true);
        const res = await getReportsByJR(jrId);
        if (res.success) {
            setReports(res.data || []);
        }
        setLoading(false);
    }

    const IconLink = ({ url, icon: Icon, label }: { url?: string, icon: any, label: string }) => {
        if (!url || url === "" || url === "null") return null;
        return (
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full"
                title={label}
                asChild
            >
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <Icon className="w-4 h-4" />
                </a>
            </Button>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                                Reports History
                            </DialogTitle>
                            <DialogDescription className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest mt-1">
                                {jrId} {jobName ? `• ${jobName}` : ""}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto p-6 scrollbar-thin">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-widest">Fetching reports...</span>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                            <AlertCircle className="w-12 h-12 opacity-20" />
                            <span className="text-xs font-bold uppercase tracking-widest">No reports found for this JR</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map((report) => (
                                <div
                                    key={report.id}
                                    className="group flex items-center justify-between p-4 bg-white border-2 border-slate-50 hover:border-indigo-100 rounded-2xl transition-all hover:shadow-lg hover:shadow-indigo-500/5"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-black text-slate-800">
                                                {new Date(report.created_at).toLocaleString('th-TH', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0",
                                                        report.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                                                            report.status === 'pending' ? "bg-amber-50 text-amber-600 animate-pulse" :
                                                                "bg-red-50 text-red-600"
                                                    )}
                                                >
                                                    {report.status}
                                                </Badge>
                                                <span className="text-[10px] text-slate-400 font-medium">{report.requester}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <IconLink url={report.pptx_url} icon={FileText} label="PPTX Report" />
                                        <IconLink url={report.csv_top_profile_url} icon={FileSpreadsheet} label="Top Profile CSV" />
                                        <IconLink url={report.csv_longlist_url} icon={FileSpreadsheet} label="Longlist CSV" />
                                        <IconLink url={report.csv_longlist_aggregated_url} icon={Share2} label="Aggregated CSV" />
                                        <IconLink url={report.summary_mapping_url} icon={ExternalLink} label="Summary Mapping" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
                    >
                        Close Window
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
