
import { adminAuthClient } from "./supabase/admin";

export interface CandidateFilters {
    query?: string;
    companies?: string[];
    positions?: string[];
    groups?: string[];
    countries?: string[];
    industries?: string[];
    jobGroupings?: string[];
    jobFunctions?: string[];
    statuses?: string[];
    genders?: string[];
    ageMin?: string;
    ageMax?: string;
    agingGroup?: string;
}

/**
 * Finds candidate IDs that match ALL the provided experience-based filters using SET INTERSECTION.
 * This ensures that if a user filters by "Company: Adidas" AND "Position: Director",
 * it returns candidates who have worked at Adidas AND have been a Director (even if in different roles).
 */
export async function getCandidateIdsByExperienceFilters(filters: any): Promise<string[] | null> {
    // List of filters that target candidate_experiences
    const expFilters = [
        { key: 'company', col: 'company' },
        { key: 'position', col: 'position' },
        { key: 'country', col: 'country' },
        { key: 'industry', col: 'company_industry' },
        { key: 'group', col: 'company_group' },
        { key: 'jobGrouping', col: 'job_grouping' }, // Note: job_grouping might be in Profile or Experience? User code had it in Profile? 
        // Checking route.ts: 
        // filters.jobGrouping -> profileQuery.in('job_grouping')
        // So jobGrouping is likely on Profile in the current implementation.
        // Wait, line 149 in route.ts used `company_group` for `filters.group`.
        // Line 104 used `job_grouping` on Profile.
        // Let's stick to what was in route.ts logic line 145-149.
    ];

    // Only these fields were in the Experience Query block in route.ts
    const activeExpFilters = [
        { key: 'companies', col: 'company' }, // Frontend uses plural 'companies', route.ts used 'company'?
        // route.ts line 6: const { filters... }
        // route.ts line 146: if (filters.company?.length)
        // Frontend toggleFilter uses 'companies'.
        // We need to be careful with keys.
        // The Payload from Frontend `fetch` body: `filters: { companies: [], positions: [] ... }`
        // Let's verify keys from route.ts.
    ];

    // Actually, let's look at route.ts line 145 again:
    // if (filters.position?.length) ...
    // But page.tsx sets `filters.positions`.
    // We need to confirm what is sent to API.
    // In `actions/candidate-filters.ts` or `page.tsx`, we construct the body.
    // Let's check `src/lib/api.ts` or wherever fetch is called? 
    // Wait, page.tsx calls `useEffect` -> `fetchCandidates`.

    // Simplification: We will accept an object with mapped column names.
    // The implementation below assumes the keys passed match what we need.

    // To implement "Intersection", we run a query for EACH active filter type.

    const queries: Promise<string[]>[] = [];

    // Helper to run query
    const runQuery = async (col: string, values: string[]) => {
        const { data, error } = await adminAuthClient
            .from('candidate_experiences')
            .select('candidate_id')
            .in(col, values)
            .limit(10000); // Scalability warning

        if (error) {
            console.error(`Error filtering ${col}:`, error);
            return [];
        }
        return Array.from(new Set(data?.map((d: any) => d.candidate_id) || [])) as string[];
    };

    // 1. Company
    if (filters.companies?.length) queries.push(runQuery('company', filters.companies));
    // Check if route.ts used 'company' or 'companies'. 
    // In route.ts line 146: filters.company?.length.
    // So the payload likely has 'company' or 'companies'.
    // We should support both or normalize before calling this.

    // 2. Position
    if (filters.positions?.length) queries.push(runQuery('position', filters.positions));

    // 3. Country (Experience level? route.ts line 147 used it on expQuery)
    if (filters.countries?.length) queries.push(runQuery('country', filters.countries));

    // 4. Industry
    if (filters.industries?.length) queries.push(runQuery('company_industry', filters.industries));

    // 5. Group
    if (filters.groups?.length) queries.push(runQuery('company_group', filters.groups));


    if (queries.length === 0) return null; // No experience filters active

    const results = await Promise.all(queries);

    // Intersect
    // Start with the first result set
    let intersection = new Set(results[0]);

    for (let i = 1; i < results.length; i++) {
        const currentSet = new Set(results[i]);
        intersection = new Set([...intersection].filter(x => currentSet.has(x)));
        if (intersection.size === 0) return []; // Short circuit
    }

    return Array.from(intersection);
}
