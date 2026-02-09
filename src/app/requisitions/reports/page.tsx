"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllReports } from "@/app/actions/n8n-actions";
import { getUserMap } from "@/app/actions/user-actions";
import {
    FileText,
    FileSpreadsheet,
    Share2,
    Loader2,
    ExternalLink,
    AlertCircle,
    ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AtsBreadcrumb } from "@/components/ats-breadcrumb";

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

export default function ReportsCenterPage() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [userMap, setUserMap] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        loadReports();
    }, []);

    async function loadReports() {
        setLoading(true);
        const res = await getAllReports();
        const map = await getUserMap();

        if (res.success) {
            setReports(res.data || []);
        }
        setUserMap(map);
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
        <div className="container mx-auto p-6 space-y-6 max-w-7xl">
            <div className="flex flex-col gap-2">
                <AtsBreadcrumb
                    items={[
                        { label: 'Job Requisition Menu', href: '/requisitions' },
                        { label: 'Report Center' }
                    ]}
                />
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Report Center</h1>
                        <p className="text-muted-foreground mt-1">Centralized dashboard for all generated reports across requisitions.</p>
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100/50">
                    <CardTitle className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        All Generated Reports
                        <Badge variant="secondary" className="ml-2 bg-indigo-50 text-indigo-600 border-indigo-100">
                            {reports.length} Records
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-xs font-bold uppercase tracking-widest">Loading reports...</span>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-slate-300">
                            <AlertCircle className="w-12 h-12 opacity-20" />
                            <span className="text-xs font-bold uppercase tracking-widest">No reports found in the system</span>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[180px]">Created At</TableHead>
                                    <TableHead className="w-[200px]">Requester</TableHead>
                                    <TableHead className="w-[120px]">JR ID</TableHead>
                                    <TableHead className="w-[200px]">Job Position</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="text-right">Report Files</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.map((report) => (
                                    <TableRow key={report.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-medium text-slate-600">
                                            {new Date(report.created_at).toLocaleString('th-TH', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm font-medium">
                                            {userMap.get(report.requester.toLowerCase()) || report.requester}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs bg-slate-50">
                                                {report.jr_id}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-800">{report.job_name}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "text-[10px] uppercase font-bold tracking-wider",
                                                    report.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                        report.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse" :
                                                            "bg-red-50 text-red-600 border-red-100"
                                                )}
                                            >
                                                {report.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <IconLink url={report.pptx_url} icon={FileText} label="PPTX Report" />
                                                <IconLink url={report.csv_top_profile_url} icon={FileSpreadsheet} label="Top Profile CSV" />
                                                <IconLink url={report.csv_longlist_url} icon={FileSpreadsheet} label="Longlist CSV" />
                                                <IconLink url={report.csv_longlist_aggregated_url} icon={Share2} label="Aggregated CSV" />
                                                <IconLink url={report.summary_mapping_url} icon={ExternalLink} label="Summary Mapping" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
