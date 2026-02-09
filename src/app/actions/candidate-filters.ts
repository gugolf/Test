"use server";

import { adminAuthClient } from "@/lib/supabase/admin";

import { getCandidateIdsByExperienceFilters, CandidateFilters } from "@/lib/candidate-service";

export async function searchCompanies(query: string, limit = 50, filters?: any) {
    // If no query AND no filters, return empty (don't dump db)
    // Actually, "filters" object might be present but empty arrays.
    const hasActiveFilters = filters && Object.values(filters).some((v: any) => Array.isArray(v) ? v.length > 0 : !!v);

    if ((!query || query.length < 1) && !hasActiveFilters) return [];

    try {
        // Contextual Filter: If we have other filters, we should limit the scope.
        let candidateIds: string[] | null = null;

        // Only fetch candidate IDs if filter is active
        if (hasActiveFilters) {
            const contextFilters = { ...filters };
            delete contextFilters.companies; // Don't restrict by selected companies

            // Re-check if any filters remain after removing self
            const hasContext = Object.values(contextFilters).some((v: any) => Array.isArray(v) ? v.length > 0 : !!v);

            if (hasContext) {
                candidateIds = await getCandidateIdsByExperienceFilters(contextFilters);
            }
        }

        // Base Query
        let baseQuery = adminAuthClient
            .from('candidate_experiences')
            .select('company');

        if (candidateIds !== null) {
            if (candidateIds.length > 0) {
                baseQuery = baseQuery.in('candidate_id', candidateIds);
            } else {
                return []; // Filter yielded no candidates
            }
        }

        // Execute Search
        if (query && query.length > 0) {
            baseQuery = baseQuery.ilike('company', `%${query}%`);
        }

        const { data, error } = await baseQuery
            .order('company', { ascending: true })
            .limit(limit);

        if (error) {
            console.error("Error searching companies:", error);
            return [];
        }

        // De-duplicate
        const companies = Array.from(new Set(data.map((item: any) => item.company)));
        return companies;

    } catch (error) {
        console.error("Server Action Error (searchCompanies):", error);
        return [];
    }
}

export async function searchPositions(query: string, limit = 50, filters?: any) {
    const hasActiveFilters = filters && Object.values(filters).some((v: any) => Array.isArray(v) ? v.length > 0 : !!v);

    if ((!query || query.length < 1) && !hasActiveFilters) return [];

    try {
        let candidateIds: string[] | null = null;
        if (hasActiveFilters) {
            const contextFilters = { ...filters };
            delete contextFilters.positions; // Don't restrict by selected positions

            const hasContext = Object.values(contextFilters).some((v: any) => Array.isArray(v) ? v.length > 0 : !!v);
            if (hasContext) {
                candidateIds = await getCandidateIdsByExperienceFilters(contextFilters);
            }
        }

        let baseQuery = adminAuthClient
            .from('candidate_experiences')
            .select('position');

        if (candidateIds !== null) {
            if (candidateIds.length > 0) {
                baseQuery = baseQuery.in('candidate_id', candidateIds);
            } else {
                return [];
            }
        }

        if (query && query.length > 0) {
            baseQuery = baseQuery.ilike('position', `%${query}%`);
        }

        const { data, error } = await baseQuery
            .order('position', { ascending: true })
            .limit(limit);

        if (error) {
            console.error("Error searching positions:", error);
            return [];
        }

        const positions = Array.from(new Set(data.map((item: any) => item.position)));
        return positions;

    } catch (error) {
        console.error("Server Action Error (searchPositions):", error);
        return [];
    }
}

export async function getStatuses() {
    try {
        const { data, error } = await adminAuthClient
            .from('candidate_status_master')
            .select('*')
            .order('status', { ascending: true });

        if (error) {
            console.error("Error fetching statuses:", error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error("Server Action Error (getStatuses):", error);
        return [];
    }
}

export async function addStatus(status: string, color?: string) {
    try {
        const { error } = await adminAuthClient
            .from('candidate_status_master')
            .insert([{ status, color: color || '#64748b', description: 'User created' }]); // Default slate color

        if (error) {
            console.error("Error adding status:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (addStatus):", error);
        return { success: false, error: error.message };
    }
}
