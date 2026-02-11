import { NextResponse } from 'next/server';
import { adminAuthClient } from '@/lib/supabase/admin';
import { getCandidateIdsByExperienceFilters } from '@/lib/candidate-service';

export async function POST(req: Request) {
    try {
        const { filters, page = 1, pageSize = 20, search } = await req.json();
        const offset = (page - 1) * pageSize;

        // --- 1. PRE-CALCULATE EXPERIENCE FILTERS ---
        // These are hard filters from the dropdowns (Position, Company, etc.)
        const normalizedFilters = {
            companies: filters?.company || filters?.companies,
            positions: filters?.position || filters?.positions,
            countries: filters?.country || filters?.countries,
            industries: filters?.industry || filters?.industries,
            groups: filters?.group || filters?.groups,
            experienceType: filters?.experienceType
        };

        const expCandidateIds = await getCandidateIdsByExperienceFilters(normalizedFilters);

        // --- 2. BASE QUERY INITIALIZATION ---
        let profileQuery: any;

        if (expCandidateIds !== null) {
            // Experience filters are active
            if (expCandidateIds.length === 0) {
                return NextResponse.json({ data: [], total: 0, page, pageSize });
            }
            // Use RPC to fetch profiles by ID to avoid URL length limit (uses POST body for IDs)
            profileQuery = (adminAuthClient.rpc as any)('get_profiles_by_ids', {
                p_ids: expCandidateIds
            });
        } else {
            // No experience-specific filters (global search mode)
            profileQuery = adminAuthClient.from('Candidate Profile').select('*');
        }

        // Ensure count is fetched
        profileQuery = profileQuery.select('*', { count: 'exact' });

        // --- 3. SMART SEARCH LOGIC (if search keyword present) ---
        if (search) {
            // Find candidate IDs where the keyword matches in their experience history
            let experienceSearchQuery = adminAuthClient
                .from('candidate_experiences')
                .select('candidate_id')
                .or(`company.ilike.%${search}%,position.ilike.%${search}%`)
                .limit(500); // Limit matches to top 500 for URL safety in the .or filter below

            // If we already have a hard filter pool, restrict search to it
            if (expCandidateIds !== null && expCandidateIds.length > 0) {
                // If the set is massive, this .in() might still be large but we've already 
                // secured the base query. The 경험 search is secondary.
                // To be safe, we only do this if expCandidateIds is reasonably sized for URL params.
                if (expCandidateIds.length < 1000) {
                    experienceSearchQuery = experienceSearchQuery.in('candidate_id', expCandidateIds);
                }
            }

            const { data: expSearchMatches } = await experienceSearchQuery;
            const searchExpIds = Array.from(new Set(expSearchMatches?.map((e: any) => e.candidate_id) || []));

            // Combine Profile Search (Name/Email) with Experience Search Matches
            let orString = `name.ilike.%${search}%,email.ilike.%${search}%,candidate_id.ilike.%${search}%`;

            if (searchExpIds.length > 0) {
                // Limit to top 150 IDs to keep URL within safe limits (PostgREST syntax)
                const idList = searchExpIds.slice(0, 150).map(id => `"${id}"`).join(',');
                orString += `,candidate_id.in.(${idList})`;
            }

            profileQuery = profileQuery.or(orString);
        }

        // --- 4. APPLY REMAINING ATTRIBUTE FILTERS ---
        if (filters?.gender?.length) profileQuery = profileQuery.in('gender', filters.gender);
        if (filters?.status?.length) profileQuery = profileQuery.in('candidate_status', filters.status);
        if (filters?.jobGrouping?.length) profileQuery = profileQuery.in('job_grouping', filters.jobGrouping);
        if (filters?.jobFunction?.length) profileQuery = profileQuery.in('job_function', filters.jobFunction);
        if (filters?.ageMin) profileQuery = profileQuery.gte('age', filters.ageMin);
        if (filters?.ageMax) profileQuery = profileQuery.lte('age', filters.ageMax);

        // Aging Group Filter
        if (filters?.agingGroup) {
            const now = new Date();
            const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
            const d90 = new Date(now); d90.setDate(d90.getDate() - 90);
            const d180 = new Date(now); d180.setDate(d180.getDate() - 180);

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

        // --- EXECUTE UNIFIED SEARCH RPC ---
        const { data, error } = await (adminAuthClient.rpc as any)('search_candidates_robust', {
            p_search: search || null,
            p_companies: normalizedFilters.companies || null,
            p_positions: normalizedFilters.positions || null,
            p_countries: normalizedFilters.countries || null,
            p_industries: normalizedFilters.industries || null,
            p_groups: normalizedFilters.groups || null,
            p_exp_type: normalizedFilters.experienceType || 'All',
            p_genders: filters?.gender || null,
            p_statuses: filters?.status || null,
            p_job_groupings: filters?.jobGrouping || null,
            p_job_functions: filters?.jobFunction || null,
            p_age_min: filters?.ageMin ? parseInt(filters.ageMin) : null,
            p_age_max: filters?.ageMax ? parseInt(filters.ageMax) : null,
            p_offset: offset,
            p_limit: pageSize
        });

        if (error) throw error;

        const totalCount = data?.[0]?.total_count || 0;
        const profiles = data || [];

        // --- 6. HYDRATE EXPERIENCES ---
        const pageCandidateIds = profiles.map((p: any) => p.candidate_id).filter(Boolean);

        let fullExp: any[] = [];
        if (pageCandidateIds.length > 0) {
            const { data: expData, error: expError } = await adminAuthClient
                .from('candidate_experiences')
                .select('*')
                .in('candidate_id', pageCandidateIds)
                .order('start_date', { ascending: false });

            if (expError) throw expError;
            fullExp = expData || [];
        }

        const finalResults = profiles.map((p: any) => ({
            ...p,
            experiences: fullExp.filter((e: any) => e.candidate_id === p.candidate_id)
        }));

        return NextResponse.json({
            data: finalResults,
            total: parseInt(totalCount.toString())
        });

    } catch (error: any) {
        console.error("Robust Search Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
