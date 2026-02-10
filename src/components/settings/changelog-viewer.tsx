"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, GitCommit } from "lucide-react";

interface Release {
    version: string;
    date: string;
    description: string;
    features: string[];
}

const releases: Release[] = [
    {
        version: "v1.3.1",
        date: "Feb 11, 2026",
        description: "JR Table Refinements & Scalability Fixes.",
        features: [
            "**Created By Filter**: Added filter to Job Requisition table showing real user names.",
            "**Pagination Fix**: Resolved issue where charts limited data to 1000 candidates (now supports unrestricted volume).",
            "**Copy JR**: Added ability to duplicate a Job Requisition and its candidates (Reset to Pool/Longlist).",
            "**Table Sorting**: Added sorting capability to JR ID, Position, and Created By columns.",
            "**JR Type**: Renamed 'Status' column to 'JR Type' (New/Replacement)."
        ]
    },
    {
        version: "v1.3.0",
        date: "Feb 10, 2026",
        description: "User Management & Navigation enhancements.",
        features: [
            "**User Management**: Added Settings tab to map emails to real names.",
            "**Real Name Display**: Reports and Tables now show real names instead of emails.",
            "**Navigation**: Added Breadcrumbs to all sub-pages for easier navigation.",
            "**Resignation**: Added 'Edit' dialog for resignation records.",
            "**Menu**: Cleaned up Candidate Menu (removed Profile Table)."
        ]
    },
    {
        version: "v1.2.0",
        date: "Feb 09, 2026",
        description: "Resume Management & Candidate Interactivity.",
        features: [
            "**Resume Manager**: Upload, View, Download, and Replace resumes directly in Candidate Detail.",
            "**Add to JR**: Ability to add existing candidates to Job Requisitions.",
            "**Remove from JR**: Option to remove candidates from specific JRs.",
            "**Candidate Status**: Added 'Candidate Status Master' for custom statuses.",
            "**CSV Import**: Enhanced import to support AI Search data structure."
        ]
    },
    {
        version: "v1.1.0",
        date: "Feb 02, 2026",
        description: "Core ATS Features & UI Polish.",
        features: [
            "**Job Requisitions**: Create, Edit, and Manage JRs.",
            "**Kanban Board**: Drag-and-drop candidate pipeline management.",
            "**Reports**: Generated reports for Placements and Resignations.",
            "**AI Search**: Verified integration with vector search."
        ]
    },
    {
        version: "v1.0.0",
        date: "Jan 28, 2026",
        description: "Initial Release.",
        features: [
            "Candidate Database",
            "Job Requisition Management",
            "Basic Reporting",
            "User Authentication"
        ]
    }
];

export function ChangelogViewer() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <GitCommit className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xl font-black text-slate-900">System Changelog</h2>
            </div>

            <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-8">
                {releases.map((release, index) => (
                    <div key={index} className="relative pl-8">
                        {/* Timeline node */}
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-100 shadow-sm z-10">
                            <div className="w-full h-full rounded-full bg-indigo-500" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">
                                    {release.version}
                                </Badge>
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                    {release.date}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800">
                                {release.description}
                            </h3>

                            <ul className="space-y-2 mt-2">
                                {release.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                        <span dangerouslySetInnerHTML={{ __html: feature.replace(/\*\*(.*?)\*\*/g, '<b class="text-slate-900">$1</b>') }} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
