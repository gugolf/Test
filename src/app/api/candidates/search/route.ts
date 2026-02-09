import { NextResponse } from 'next/server';
import { adminAuthClient } from '@/lib/supabase/admin';
import { getCandidateIdsByExperienceFilters } from '@/lib/candidate-service';

export async function POST(req: Request) {
    try {
        const { filters, page = 1, pageSize = 20, search } = await req.json();
        const offset = (page - 1) * pageSize;

        // --- PRE-CALCULATE EXPERIENCE FILTERS ---
        // We do this first so we can use the restricted candidate pool for both:
        // 1. Scoping the smart search (e.g. "Director" only within "Adidas")
        // 2. Filtering the final profile list

        const normalizedFilters = {
            companies: filters?.company || filters?.companies,
            positions: filters?.position || filters?.positions,
            countries: filters?.country || filters?.countries,
            industries: filters?.industry || filters?.industries,
            groups: filters?.group || filters?.groups,
        };

        const expCandidateIds = await getCandidateIdsByExperienceFilters(normalizedFilters);

        let profileQuery = adminAuthClient
            .from('Candidate Profile')
            .select('*', { count: 'exact' });

        // --- SEARCH LOGIC ---
        let searchCandidateIds: string[] = [];

        if (search) {
            // 1. Search in Profile (Name, Email, ID)
            profileQuery = profileQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,candidate_id.ilike.%${search}%`);

            // 2. Search in Experiences (Company, Position)
            // Optimization: If we already have a candidate pool from filters, restricts the search to them.
            let experienceSearchQuery = adminAuthClient
                .from('candidate_experiences')
                .select('candidate_id')
                .or(`company.ilike.%${search}%,position.ilike.%${search}%`);

            if (expCandidateIds !== null) {
                // If we have < 10000 IDs, we can filter directly.
                // If massive, this might be slow, but better than global search.
                if (expCandidateIds.length > 0) {
                    // Restrict search to already filtered candidates
                    experienceSearchQuery = experienceSearchQuery.in('candidate_id', expCandidateIds);
                } else {
                    // Filter returned 0 candidates. Smart search in experiences should also return 0.
                    // We can skip the query. But let's let it run with empty IN to be safe/consistent?
                    // Or just skip.
                }
            }

            // Only run if we either have NO filters (global search) OR we have matching candidates
            if (expCandidateIds === null || expCandidateIds.length > 0) {
                const { data: expSearchMatches, error: expSearchError } = await experienceSearchQuery.limit(5000);

                if (!expSearchError && expSearchMatches && expSearchMatches.length > 0) {
                    const ids = expSearchMatches.map((e: any) => e.candidate_id);
                    // Deduplicate
                    searchCandidateIds = Array.from(new Set(ids));
                }
            }
        }

        // Apply Search Filter with Experience IDs support
        if (search) {
            let orString = `name.ilike.%${search}%,email.ilike.%${search}%,candidate_id.ilike.%${search}%`;

            if (searchCandidateIds.length > 0) {
                // Note: syntax `candidate_id.in.("id1","id2")`
                // We limit to top 100 matches from experience to prevent URL overflow.
                const limitedIds = searchCandidateIds.slice(0, 100);
                const idList = limitedIds.map(id => `"${id}"`).join(',');
                orString += `,candidate_id.in.(${idList})`;
            }

            profileQuery = profileQuery.or(orString);
        }

        // --- APPLY OTHER PROFILE FILTERS ---
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

        // --- APPLY EXPERIENCE FILTERS (Intersection) ---
        if (expCandidateIds !== null) {
            if (expCandidateIds.length === 0) {
                return NextResponse.json({ data: [], total: 0, page, pageSize });
            }
            // Apply ID filter to Profile Query
            profileQuery = profileQuery.in('candidate_id', expCandidateIds);
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

        const fullExpQuery = adminAuthClient
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
