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
    ArrowLeft,
    Search,
    ChevronDown,
    ChevronRight,
    History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

    const toggleGroup = (jrId: string) => {
        const next = new Set(expandedGroups);
        if (next.has(jrId)) next.delete(jrId);
        else next.add(jrId);
        setExpandedGroups(next);
    };

    // Filter and Group reports
    const filteredReports = reports.filter(r => {
        const requester = userMap.get(r.requester.toLowerCase()) || r.requester;
        const search = searchTerm.toLowerCase();
        return (
            r.jr_id?.toLowerCase().includes(search) ||
            r.job_name?.toLowerCase().includes(search) ||
            requester?.toLowerCase().includes(search)
        );
    });

    const groupedReports = filteredReports.reduce((acc, report) => {
        const key = report.jr_id || "No JR";
        if (!acc[key]) acc[key] = [];
        acc[key].push(report);
        return acc;
    }, {} as Record<string, Report[]>);

    // Sort reports within each group by date descending
    Object.keys(groupedReports).forEach(key => {
        groupedReports[key].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Sort groups by the latest report's date
    const sortedGroupKeys = Object.keys(groupedReports).sort((a, b) => {
        const latestA = new Date(groupedReports[a][0].created_at).getTime();
        const latestB = new Date(groupedReports[b][0].created_at).getTime();
        return latestB - latestA;
    });

    const IconLink = ({ url, icon: Icon, label }: { url?: string, icon: any, label: string }) => {
        if (!url || url === "" || url === "null") return null;
        return (
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full shrink-0"
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
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Report Center</h1>
                        <p className="text-muted-foreground mt-1">Centralized dashboard for all generated reports across requisitions.</p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search JR, Position, Requester..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 bg-white border-slate-200 rounded-2xl shadow-sm font-medium"
                        />
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
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead className="w-[180px] font-black uppercase text-[10px] tracking-widest py-4">Created At</TableHead>
                                    <TableHead className="w-[200px] font-black uppercase text-[10px] tracking-widest py-4">Requester</TableHead>
                                    <TableHead className="w-[120px] font-black uppercase text-[10px] tracking-widest py-4">JR ID</TableHead>
                                    <TableHead className="w-[200px] font-black uppercase text-[10px] tracking-widest py-4">Job Position</TableHead>
                                    <TableHead className="w-[100px] font-black uppercase text-[10px] tracking-widest py-4">Status</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest py-4 pr-6">Report Files</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedGroupKeys.map((jrId) => {
                                    const group = groupedReports[jrId];
                                    const latest = group[0];
                                    const others = group.slice(1);
                                    const isExpanded = expandedGroups.has(jrId);
                                    const hasOthers = others.length > 0;

                                    return (
                                        <React.Fragment key={jrId}>
                                            <TableRow className={cn(
                                                "transition-colors border-slate-100",
                                                isExpanded ? "bg-slate-50/50" : "hover:bg-slate-50/50"
                                            )}>
                                                <TableCell className="pl-4">
                                                    {hasOthers && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 rounded-lg"
                                                            onClick={() => toggleGroup(jrId)}
                                                        >
                                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-600 text-xs">
                                                    {new Date(latest.created_at).toLocaleString('th-TH', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-xs font-bold uppercase tracking-tight">
                                                    {userMap.get(latest.requester.toLowerCase()) || latest.requester}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="font-black text-[10px] bg-slate-50 border-slate-200">
                                                            {latest.jr_id}
                                                        </Badge>
                                                        {hasOthers && !isExpanded && (
                                                            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black px-1.5 h-4">
                                                                +{others.length}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-800 text-xs">{latest.job_name}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn(
                                                            "text-[9px] uppercase font-black tracking-wider px-2 py-0.5",
                                                            latest.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                latest.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse" :
                                                                    "bg-red-50 text-red-600 border-red-100"
                                                        )}
                                                    >
                                                        {latest.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <IconLink url={latest.pptx_url} icon={FileText} label="PPTX Report" />
                                                        <IconLink url={latest.csv_top_profile_url} icon={FileSpreadsheet} label="Top Profile CSV" />
                                                        <IconLink url={latest.csv_longlist_url} icon={FileSpreadsheet} label="Longlist CSV" />
                                                        <IconLink url={latest.csv_longlist_aggregated_url} icon={Share2} label="Aggregated CSV" />
                                                        <IconLink url={latest.summary_mapping_url} icon={ExternalLink} label="Summary Mapping" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Historical Reports Rendering */}
                                            {isExpanded && others.map((report) => (
                                                <TableRow key={report.id} className="bg-slate-50/30 border-slate-100 hover:bg-slate-100/50 transition-colors">
                                                    <TableCell className="pl-4">
                                                        <div className="w-full flex justify-end pr-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 ml-auto mr-3.5" />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-400 text-[11px] italic">
                                                        {new Date(report.created_at).toLocaleString('th-TH', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="text-slate-400 text-[10px] font-bold uppercase tracking-tight opacity-70">
                                                        {userMap.get(report.requester.toLowerCase()) || report.requester}
                                                    </TableCell>
                                                    <TableCell></TableCell>
                                                    <TableCell className="font-medium text-slate-400 text-xs italic">{report.job_name}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="secondary"
                                                            className={cn(
                                                                "text-[9px] uppercase font-black tracking-wider px-2 py-0.5 opacity-60",
                                                                report.status === 'completed' ? "bg-slate-200 text-slate-600 border-slate-300" :
                                                                    "bg-red-50 text-red-400 border-red-100"
                                                            )}
                                                        >
                                                            {report.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex items-center justify-end gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                            <IconLink url={report.pptx_url} icon={FileText} label="PPTX Report" />
                                                            <IconLink url={report.csv_top_profile_url} icon={FileSpreadsheet} label="Top Profile CSV" />
                                                            <IconLink url={report.csv_longlist_url} icon={FileSpreadsheet} label="Longlist CSV" />
                                                            <IconLink url={report.csv_longlist_aggregated_url} icon={Share2} label="Aggregated CSV" />
                                                            <IconLink url={report.summary_mapping_url} icon={ExternalLink} label="Summary Mapping" />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
