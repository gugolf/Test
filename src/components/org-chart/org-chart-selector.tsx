'use client'

import React from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useRouter } from 'next/navigation'

type Upload = {
    upload_id: string
    company_name: string
    created_at: string
}

type OrgChartSelectorProps = {
    uploads: Upload[]
    currentId: string | null
}

export function OrgChartSelector({ uploads, currentId }: OrgChartSelectorProps) {
    const router = useRouter()

    const handleValueChange = (value: string) => {
        router.push(`/org-chart?id=${value}`)
    }

    if (uploads.length === 0) return null

    return (
        <Select onValueChange={handleValueChange} defaultValue={currentId || (uploads[0]?.upload_id)}>
            <SelectTrigger className="w-[280px] bg-white shadow-sm border-slate-200">
                <SelectValue placeholder="Select Organization / Version" />
            </SelectTrigger>
            <SelectContent>
                {uploads.map((upload) => (
                    <SelectItem key={upload.upload_id} value={upload.upload_id}>
                        <div className="flex flex-col items-start">
                            <span className="font-medium">{upload.company_name}</span>
                            <span className="text-[10px] text-slate-400">
                                {new Date(upload.created_at).toLocaleString()}
                            </span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
