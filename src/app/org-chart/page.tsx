import { fetchOrgChartUploads, fetchOrgChartData, getOrgNodesRaw } from '@/app/actions/org-chart-actions'
import { OrgChartClientPage } from './org-chart-client-page'

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
        // Parallel server-side fetch
        const [chart, list] = await Promise.all([
            fetchOrgChartData(currentUploadId),
            getOrgNodesRaw(currentUploadId)
        ])
        chartData = chart
        tableData = list
    }

    return (
        <OrgChartClientPage
            uploads={uploads}
            currentUploadId={currentUploadId}
            chartData={chartData}
            tableData={tableData}
        />
    )
}
