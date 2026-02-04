'use client'

import dynamic from 'next/dynamic'
import { OrgNode } from '@/app/actions/org-chart-actions'

const DynamicViewer = dynamic(
    () => import('./org-chart-viewer').then((mod) => mod.OrgChartViewer),
    {
        ssr: false,
        loading: () => (
            <div className="h-[600px] flex items-center justify-center text-slate-400">
                Loading Visualization...
            </div>
        )
    }
)

export function OrgChartClientWrapper({ initialData }: { initialData: OrgNode | null }) {
    return <DynamicViewer initialData={initialData} />
}
