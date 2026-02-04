import { fetchOrgChartUploads, fetchOrgChartData, getOrgNodesRaw } from '@/app/actions/org-chart-actions'
import { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrgNodeTable } from '@/components/org-chart/org-node-table'
import { OrgChartSelector } from '@/components/org-chart/org-chart-selector'
import { OrgChartClientWrapper } from '@/components/org-chart/org-chart-client-wrapper'

export default async function OrgChartPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const uploads = await fetchOrgChartUploads()

    // Default to the first (latest) upload if no ID provided
    const latestUploadId = uploads.length > 0 ? uploads[0].upload_id : null
    const currentUploadId = (params.id as string) || latestUploadId

    let chartData = null
    let tableData: any[] = []

    if (currentUploadId) {
        // Parallel fetch
        const [chart, list] = await Promise.all([
            fetchOrgChartData(currentUploadId),
            getOrgNodesRaw(currentUploadId)
        ])
        chartData = chart
        tableData = list
    }

    return (
        <div className="container mx-auto py-6 space-y-6 h-screen flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Organization Chart
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Visualizing company structure from PDF uploads.
                    </p>
                </div>

                {/* Global Company Selector */}
                <div className="flex items-center gap-4">
                    <OrgChartSelector
                        uploads={uploads}
                        currentId={currentUploadId}
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0 relative">
                <Tabs defaultValue="chart" className="h-full flex flex-col">
                    <div className="flex mb-4">
                        <TabsList>
                            <TabsTrigger value="chart">Visual Chart View</TabsTrigger>
                            <TabsTrigger value="list">Raw Data Table (Edit)</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="chart" className="flex-1 min-h-0 border rounded-xl overflow-hidden mt-0 bg-slate-50/50">
                        <Suspense fallback={<div className="h-full w-full bg-slate-100 animate-pulse" />}>
                            <OrgChartClientWrapper
                                initialData={chartData}
                            />
                        </Suspense>
                    </TabsContent>

                    <TabsContent value="list" className="flex-1 overflow-auto mt-0">
                        <OrgNodeTable nodes={tableData} uploadId={currentUploadId} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
