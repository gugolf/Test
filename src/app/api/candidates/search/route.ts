import { NextResponse } from 'next/server';
import { adminAuthClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
    try {
        const { filters, page = 1, pageSize = 20, search } = await req.json();
        const offset = (page - 1) * pageSize;

        // Check if any "Experience Level" filters are applied
        const hasExperienceFilters =
            filters?.country?.length > 0 ||
            filters?.company?.length > 0 ||
            filters?.industry?.length > 0 ||
            filters?.group?.length > 0 ||
            filters?.position?.length > 0 ||
            (filters?.isCurrent !== undefined);

        let profileQuery = adminAuthClient
            .from('Candidate Profile')
            .select('*', { count: 'exact' });

        // --- APPLY PROFILE FILTERS ---
        if (search) {
            profileQuery = profileQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,candidate_id.ilike.%${search}%`);
        }
        if (filters?.gender?.length) profileQuery = profileQuery.in('gender', filters.gender);
        if (filters?.status?.length) profileQuery = profileQuery.in('candidate_status', filters.status);
        if (filters?.jobGrouping?.length) profileQuery = profileQuery.in('job_grouping', filters.jobGrouping);
        if (filters?.jobFunction?.length) profileQuery = profileQuery.in('job_function', filters.jobFunction);
        if (filters?.ageMin) profileQuery = profileQuery.gte('age', filters.ageMin);
        if (filters?.ageMax) profileQuery = profileQuery.lte('age', filters.ageMax);

        // --- Aging Group Filter ---
        if (filters?.agingGroup) {
            const now = new Date();
            const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
            const d90 = new Date(now); d90.setDate(d90.getDate() - 90);
            const d180 = new Date(now); d180.setDate(d180.getDate() - 180);

            // Migration completed: modify_date is now ISO 8601 string.
            // Direct comparison works correctly.
            const field = 'modify_date';

            if (filters.agingGroup === 'fresh') {
                profileQuery = profileQuery.gt(field, d30.toISOString());
            } else if (filters.agingGroup === '1-3m') {
                profileQuery = profileQuery.lte(field, d30.toISOString()).gt(field, d90.toISOString());
            } else if (filters.agingGroup === '4-6m') {
                profileQuery = profileQuery.lte(field, d90.toISOString()).gt(field, d180.toISOString());
            } else if (filters.agingGroup === '6m+') {
                profileQuery = profileQuery.lte(field, d180.toISOString());
            }
        }

        // --- STRATEGY SWITCH ---

        if (hasExperienceFilters) {
            // STRATEGY A: Experience Filters Applied
            // We must first find candidates who match the experience criteria
            // Note: For large datasets, this linking should be done via a View or RPC. 
            // Note: For large datasets, this linking should be done via a View or RPC.
            // For 25k rows, we can fetch matching IDs.

            // STRATEGY: Find matching IDs from experiences first
            let expQuery = adminAuthClient
                .from('candidate_experiences')
                .select('candidate_id'); // We need ALL matches to correct count? No, just IDs.

            if (filters.position?.length) expQuery = expQuery.in('position', filters.position);
            if (filters.company?.length) expQuery = expQuery.in('company', filters.company);
            if (filters.country?.length) expQuery = expQuery.in('country', filters.country);
            if (filters.industry?.length) expQuery = expQuery.in('company_industry', filters.industry);
            if (filters.group?.length) expQuery = expQuery.in('company_group', filters.group);

            // Increase limit to scan more experiences (Supabase default is 1000)
            // Warning: This is not scalable to millions, but fine for 25k.
            // We limit to 5000 matches for now to prevent timeout, or use range if needed.
            // Get unique IDs (limit 10000 to be safe, or use a better strategy for huge datasets)
            const { data: expMatches, error: expError } = await expQuery.limit(10000);

            if (expError) throw expError;

            const candidateIds = Array.from(new Set((expMatches as any)?.map((e: any) => e.candidate_id) || []));

            if (candidateIds.length === 0) {
                return NextResponse.json({ data: [], total: 0, page, pageSize });
            }

            // Apply ID filter to Profile Query
            profileQuery = profileQuery.in('candidate_id', candidateIds);
        }

        // --- EXECUTE PAGINATED PROFILE QUERY ---
        // Now running the final query on Profiles (either filtered by IDs from Exp, or just raw Profile filters)
        // User Request: Sort by candidate_id ASC (numeric string C00001...)
        const { data: profiles, count, error: profileError } = await profileQuery
            .range(offset, offset + pageSize - 1)
            .order('candidate_id', { ascending: true }); // Changed to ASC // Show recently modified first

        if (profileError) throw profileError;

        // --- HYDRATE EXPERIENCES ---
        // Fetch experiences ONLY for the displayed page of candidates
        const pageCandidateIds = (profiles as any)?.map((p: any) => p.candidate_id) || [];

        let fullExpQuery = adminAuthClient
            .from('candidate_experiences')
            .select('*')
            .in('candidate_id', pageCandidateIds)
            .order('start_date', { ascending: false });

        // Optional: If we want to highlight "matching" experiences vs "all", we could do logic here.
        // For now, return ALL experiences for the candidate so the timeline is complete.

        const { data: fullExp, error: fullExpError } = await fullExpQuery;
        if (fullExpError) throw fullExpError;
        // Merge Profile Data
        const finalResults = (profiles as any).map((p: any) => ({
            ...p,
            candidate_id: p.candidate_id, // Ensure explicit mapping
            match_score: 0, // Simplified for now
            skills_match: [],
            experiences: (fullExp as any)?.filter((e: any) => e.candidate_id === p.candidate_id) || []
        }));

        return NextResponse.json({
            data: finalResults,
            total: count
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
