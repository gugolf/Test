
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
    experienceType?: 'Current' | 'Past' | 'All';
}

/**
 * Finds candidate IDs that match ALL the provided experience-based filters using SET INTERSECTION.
 * This ensures that if a user filters by "Company: Adidas" AND "Position: Director",
 * it returns candidates who have worked at Adidas AND have been a Director (even if in different roles).
 */
export async function getCandidateIdsByExperienceFilters(filters: any): Promise<string[] | null> {
    const hasActiveFilters = filters && Object.values(filters).some((v: any) => Array.isArray(v) ? v.length > 0 : (v && v !== 'All'));
    if (!hasActiveFilters) return null;

    try {
        const { data, error } = await (adminAuthClient.rpc as any)('filter_candidate_ids_by_experience', {
            p_companies: filters.companies || filters.company || null,
            p_positions: filters.positions || filters.position || null,
            p_countries: filters.countries || filters.country || null,
            p_industries: filters.industries || filters.industry || null,
            p_groups: filters.groups || filters.group || null,
            p_exp_type: filters.experienceType || 'All'
        });

        if (error) {
            console.error("Error filtering candidate IDs (RPC):", error);
            return [];
        }

        return (data as any[])?.map((d: any) => d.candidate_id) || [];
    } catch (error) {
        console.error("Server Action Error (getCandidateIdsByExperienceFilters):", error);
        return [];
    }
}
