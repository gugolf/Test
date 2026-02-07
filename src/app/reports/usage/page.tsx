"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { getUnusedStats, getUnusedCandidates } from "@/app/actions/report-actions";
import { ReportCandidateTable } from "@/components/reports/ReportCandidateTable";
import { Button } from "@/components/ui/button";

export default function UsageReportPage() {
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingList, setLoadingList] = useState(true);

    const [stats, setStats] = useState<any>(null);
    const [candidates, setCandidates] = useState<any[]>([]);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalListCount, setTotalListCount] = useState(0);

    // Load Stats
    const loadStats = async () => {
        setLoadingStats(true);
        const s = await getUnusedStats();
        setStats(s);
        setLoadingStats(false);
    };

    // Load Candidates
    const fetchCandidates = async () => {
        setLoadingList(true);
        try {
            // We only need "Unused" candidates here. 
            // The action getUnusedCandidates handles the logic.
            const { data, total } = await getUnusedCandidates(currentPage, pageSize, "");
            setCandidates(data);
            setTotalListCount(total);
        } catch (e) {
            console.error("Failed to load unused candidates", e);
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        fetchCandidates();
    }, [currentPage, pageSize]);

    const handleDataChanged = () => {
        loadStats();
        fetchCandidates();
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Profile Usage Report</h1>
                    <p className="text-slate-500">Identify and clean up candidates not assigned to any job requisition.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDataChanged}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh Data
                </Button>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <SummaryCard title="Total Candidates" value={stats.total} />
                    <SummaryCard title="Used (In Jobs)" value={stats.used} color="text-indigo-600" />
                    <SummaryCard title="Unused (Orphaned)" value={stats.unused} color="text-rose-600" isHighlight />
                </div>
            )}

            {/* Main Table Area */}
            <div className="grid grid-cols-1 gap-6">
                {/* Table */}
                <div className="flex flex-col gap-4">
                    <ReportCandidateTable
                        title="Unused Candidates"
                        candidates={candidates}
                        onDataChanged={handleDataChanged}
                    />

                    {/* Pagination - Simple for now, reusing what ReportCandidateTable lacks (it has internal search but external pagination needs to be passed in?) 
                        Wait, ReportCandidateTable has internal filtering logic?
                        Let's check ReportCandidateTable again.
                        It has: `const filteredCandidates = candidates.filter(...)`
                        It does Client-Side filtering on the passed `candidates` prop.
                        This means if I pass only 20 rows, it filters within those 20.
                        For server-side pagination, I should probably pass the whole list if I can, OR
                        I should update ReportCandidateTable to support server-side props.
                        Given the "Unused" list might be large (thousands), client-side filtering of 20 rows is weird.
                        However, the `AgingCandidateTable` I saw earlier had pagination controls OUTSIDE.
                        `ReportCandidateTable` (generic one) does NOT have pagination controls inside.
                        So I need to render pagination controls here in the Page.
                    */}

                    <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
                        <span>Page {currentPage} of {Math.ceil(totalListCount / pageSize)} ({totalListCount} total)</span>
                        <div className="flex gap-1">
                            <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
                            <Button size="sm" variant="outline" disabled={currentPage * pageSize >= totalListCount} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ title, value, color, isHighlight }: any) {
    return (
        <Card className={`${isHighlight ? 'border-rose-200 bg-rose-50/50' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className={`text-sm font-medium ${color || 'text-slate-600'}`}>{title}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{value}</div></CardContent>
        </Card>
    );
}
