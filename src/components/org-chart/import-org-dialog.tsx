'use client'

import React, { useState, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UploadCloud, FileText, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { importOrgChart } from '@/app/actions/org-chart-actions'
import { CompanySuggestionInput } from './company-suggestion-input'

export function ImportOrgDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [companyName, setCompanyName] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!companyName.trim()) {
            toast.error("Please enter a company name")
            return
        }
        if (!selectedFile) {
            toast.error("Please select a PDF file")
            return
        }

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const result = await importOrgChart(companyName, formData)

            if (result.success) {
                toast.success("OrgChart import initiated! The system is processing the PDF.")
                setIsOpen(false)
                setCompanyName('')
                setSelectedFile(null)
            } else {
                toast.error(result.error || "Failed to trigger import")
            }
        } catch (err: any) {
            toast.error("An error occurred: " + err.message)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm h-8 px-3 rounded-lg text-xs font-bold transition-all">
                    <Plus size={14} className="stroke-[3]" />
                    IMPORT ORGCHART
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Import New OrgChart</DialogTitle>
                        <DialogDescription>
                            Upload a PDF file of the organization structure to generate a new interactive chart.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="company">Company Name (Master)</Label>
                            <CompanySuggestionInput
                                value={companyName}
                                onChange={setCompanyName}
                                disabled={isUploading}
                                placeholder="e.g. Asset World Corp"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="file">OrgChart PDF</Label>
                            <div
                                className={`
                                    border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors
                                    ${selectedFile ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                                `}
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    id="file"
                                    className="hidden"
                                    accept=".pdf"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                />
                                {selectedFile ? (
                                    <div className="flex flex-col items-center">
                                        <FileText className="h-10 w-10 text-rose-500 mb-2" />
                                        <span className="text-xs font-medium text-slate-900 truncate max-w-[200px]">
                                            {selectedFile.name}
                                        </span>
                                        <span className="text-[10px] text-slate-500 mt-1">
                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <UploadCloud className="h-10 w-10 text-slate-300 mb-2" />
                                        <span className="text-sm text-slate-600">Click to upload PDF</span>
                                        <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Only PDF allowed</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full h-11"
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    UPLOADING & TRIGGERING...
                                </>
                            ) : (
                                'UPLOAD & START IMPORT'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
