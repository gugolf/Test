import { NextResponse } from 'next/server';
import { adminAuthClient } from '@/lib/supabase/admin';

export async function GET() {
    try {
        // 1. Get Candidate Count (Bypass RLS)
        const { count: candCount, error: candError } = await adminAuthClient
            .from('Candidate Profile')
            .select('*', { count: 'exact', head: true });

        if (candError) throw candError;

        // 2. Get Job Stats
        const { data: jobs, error: jobError } = await adminAuthClient
            .from('job_requisitions')
            .select('is_active');

        if (jobError) throw jobError;

        const active = (jobs as any)?.filter((j: any) => j.is_active?.toString().toLowerCase() === 'active').length || 0;
        const total = jobs?.length || 0;
        const inactive = total - active;

        // 3. Get Resume Count
        const { count: resumeCount } = await adminAuthClient
            .from('Candidate Profile')
            .select('*', { count: 'exact', head: true })
            .not('resume_url', 'is', null)
            .neq('resume_url', '');

        // 4. Get OrgChart Count
        const { count: orgChartCount } = await adminAuthClient
            .from('org_chart_uploads')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            totalCandidates: candCount || 0,
            activeJobs: active,
            totalJRs: total,
            inactiveJobs: inactive,
            resumeCount: resumeCount || 0,
            orgChartCount: orgChartCount || 0
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
