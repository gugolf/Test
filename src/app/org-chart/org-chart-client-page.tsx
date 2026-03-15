'use client'

import React, { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrgChartHeader } from '@/components/org-chart/org-chart-header'
import { OrgDirectory } from '@/components/org-chart/org-directory'
import { OrgNodeTable } from '@/components/org-chart/org-node-table'
import { OrgChartClientWrapper } from '@/components/org-chart/org-chart-client-wrapper'

type OrgChartClientPageProps = {
    uploads: any[]
    currentUploadId: string | null
    chartData: any
    tableData: any[]
}

export function OrgChartClientPage({
    uploads,
    currentUploadId,
    chartData,
    tableData
}: OrgChartClientPageProps) {
    return (
        <div className="container mx-auto py-2 space-y-2 flex flex-col h-screen overflow-hidden px-4 md:px-6">
            <OrgChartHeader />

            {/* Top Area: Compact Directory Toolbar */}
            <OrgDirectory
                uploads={uploads}
                currentId={currentUploadId}
            />

            {/* Main Content: Chart/Table */}
            <div className="flex-1 min-h-0 relative">
                <Tabs defaultValue="chart" className="h-full flex flex-col">
                    <div className="flex mb-1 shrink-0 justify-between items-center bg-white/50 dark:bg-slate-950/50 p-1 rounded-lg border border-slate-100 dark:border-slate-800 px-3">
                        <TabsList className="h-8 bg-transparent p-0 gap-1">
                            <TabsTrigger
                                value="chart"
                                className="h-7 text-xs px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
                            >
                                Chart View
                            </TabsTrigger>
                            <TabsTrigger
                                value="list"
                                className="h-7 text-xs px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
                            >
                                Data Table
                            </TabsTrigger>
                        </TabsList>

                        {currentUploadId && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Current Org:
                                </span>
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                    {uploads.find((u: any) => u.upload_id === currentUploadId)?.company_name}
                                </span>
                            </div>
                        )}
                    </div>

                    <TabsContent value="chart" className="flex-1 min-h-0 border rounded-xl overflow-hidden mt-0 bg-slate-50/50 dark:bg-slate-900/10">
                        <Suspense fallback={<div className="h-full w-full bg-slate-100 dark:bg-slate-800 animate-pulse" />}>
                            <OrgChartClientWrapper
                                initialData={chartData}
                            />
                        </Suspense>
                    </TabsContent>

                    <TabsContent value="list" className="flex-1 overflow-auto mt-0 border rounded-xl bg-white dark:bg-slate-950">
                        <OrgNodeTable nodes={tableData} uploadId={currentUploadId} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
