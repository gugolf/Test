"use client";


import { useRouter } from "next/navigation";
import { AtsBreadcrumb } from "@/components/ats-breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import {
    Briefcase,
    UserPlus,
    LayoutList,
    Kanban,
    TableProperties,
    LogOut,
    CheckCircle2,
    BarChart,
    Users,
    UploadCloud
} from "lucide-react";

export default function RequisitionsMenuPage() {
    const router = useRouter();

    return (
        <div className="container mx-auto p-6 flex flex-col gap-8 max-w-7xl h-full justify-center">

            <div className="space-y-2">
                <AtsBreadcrumb
                    items={[
                        { label: 'Job Requisition Menu' }
                    ]}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* 1. Job Requisition Manage (Unified) */}
                <MenuCard
                    title="Job Requisitions Manage"
                    subtitle="List & Feedback"
                    icon={LayoutList}
                    color="bg-orange-100 text-orange-600"
                    onClick={() => router.push('/requisitions/manage')}
                />

                {/* 2. Job Requisition Table (Overview) */}
                <MenuCard
                    title="Job Requisition Table"
                    icon={TableProperties}
                    color="bg-indigo-100 text-indigo-600"
                    onClick={() => router.push('/requisitions/table')}
                />


                {/* 4. Successful Placement */}
                <MenuCard
                    title="Successful Placement Table"
                    icon={CheckCircle2}
                    color="bg-green-100 text-green-600"
                    onClick={() => router.push('/requisitions/placements')}
                />

                <MenuCard
                    title="Resignation Table"
                    icon={LogOut}
                    color="bg-red-100 text-red-600"
                    onClick={() => router.push('/requisitions/resignations')}
                />

                {/* 6. Report Center */}
                <MenuCard
                    title="Report Center"
                    subtitle="Centralized Reports"
                    icon={BarChart}
                    color="bg-sky-100 text-sky-600"
                    onClick={() => router.push('/requisitions/reports')}
                />

                {/* 7. CSV Import */}
                <MenuCard
                    title="Import Candidate CSV"
                    subtitle="Bulk Upload & Dup Check"
                    icon={UploadCloud}
                    color="bg-purple-100 text-purple-600"
                    onClick={() => router.push('/candidates/import')}
                />

            </div>
        </div>
    );
}

function MenuCard({
    title,
    subtitle,
    icon: Icon,
    color,
    onClick,
    image
}: {
    title: string;
    subtitle?: string;
    icon: any;
    color: string;
    onClick?: () => void;
    image?: string;
}) {
    return (
        <Card
            onClick={onClick}
            className="group relative cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden h-[220px] flex flex-col items-center justify-center p-6 border-2 border-transparent hover:border-primary/20"
        >
            <div className={`p-5 rounded-3xl ${color} mb-4 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                <Icon className="w-10 h-10" />
            </div>
            <h3 className="font-bold text-center text-slate-800 group-hover:text-primary transition-colors">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </Card>
    );
}
