'use client'

import React from 'react'
import { ImportOrgDialog } from './import-org-dialog'

export function OrgChartHeader() {
    return (
        <div className="shrink-0 flex items-center justify-between">
            <div className="flex items-baseline gap-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 italic">
                    Organization Chart
                </h1>
            </div>

            <div className="flex items-center gap-3">
                <ImportOrgDialog />
                {/* Secondary Tab Switcher placeholder or extra tools */}
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                    {/* Compact tools can go here */}
                </div>
            </div>
        </div>
    )
}
