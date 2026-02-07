

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Normalization Helpers ---

export function normalizeName(name: string): string {
    if (!name) return "";
    // 1. Trim
    // 2. Remove accents/diacritics (NFD -> Remove non-spacing marks)
    // 3. Lowercase
    // 4. Replace multiple spaces with single space
    return name
        .trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

export function normalizeLinkedIn(url: string): string {
    if (!url) return "";
    try {
        // Remove query params by parsing URL
        const urlObj = new URL(url.trim());
        urlObj.search = "";
        return urlObj.toString().toLowerCase(); // Ensure lowercase
    } catch (e) {
        // If not a valid URL, just trim and lower
        return url.trim().toLowerCase();
    }
}

// --- Duplicate Check Logic ---

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    candidateId: string | null;
    reason?: string; // 'name' or 'linkedin'
}

export async function checkDuplicateCandidate(name: string, linkedin: string): Promise<DuplicateCheckResult> {
    const normName = normalizeName(name);
    const normLinkedIn = normalizeLinkedIn(linkedin);

    if (!normName && !normLinkedIn) {
        return { isDuplicate: false, candidateId: null };
    }

    // Optimized: Fetch only potential matches using ILIKE
    // This avoids fetching the entire database and hitting the 1000-row limit.
    const nameQuery = `name.ilike.%${name}%`;
    // Note: ilike with % matches substrings, but here we want close matches. 
    // Better: name.ilike.${name} (exact match case-insensitive)
    // But since we normalize/clean inputs, exact match might miss "Manish  Sharma" (spaces).
    // Let's use flexible OR query.

    let query = supabase
        .from('Candidate Profile')
        .select('candidate_id, name, linkedin');

    const conditions = [];
    if (name) conditions.push(`name.ilike.${name}`);
    if (linkedin) conditions.push(`linkedin.ilike.${linkedin}`);

    // Also try to match without middle name or slightly fuzzy? 
    // For now, adhere to the "Targeted" approach to be better than "Fetch All".
    // If we want stricter "contains", we can use `%name%`, but that might fetch too many for common names.
    // Let's stick to case-insensitive exact match for now as a safe optimization.

    if (conditions.length > 0) {
        query = query.or(conditions.join(','));
    } else {
        return { isDuplicate: false, candidateId: null };
    }

    const { data: candidates, error } = await query.order('candidate_id', { ascending: true });

    if (error || !candidates) {
        console.error("Duplicate Check Error:", error);
        return { isDuplicate: false, candidateId: null };
    }

    const found = candidates.find(c => {
        const dbName = normalizeName(c.name || "");
        const dbLinkedIn = normalizeLinkedIn(c.linkedin || "");

        // Check Name
        if (normName && dbName === normName) return true;

        // Check LinkedIn (Only if input has linkedin and it looks valid)
        if (normLinkedIn && normLinkedIn.includes("linkedin.com") && dbLinkedIn === normLinkedIn) return true;

        return false;
    });

    if (found) {
        return {
            isDuplicate: true,
            candidateId: found.candidate_id,
            reason: normalizeName(found.name || "") === normName ? 'name' : 'linkedin'
        };
    }

    return { isDuplicate: false, candidateId: null };
}

// Check if candidate is currently being processed in other queues
export async function checkActiveProcessing(name: string, linkedin: string, currentUploadId?: string): Promise<{ isProcessing: boolean, source?: string }> {
    const normName = normalizeName(name);
    const normLinkedIn = normalizeLinkedIn(linkedin);

    if (!normName && !normLinkedIn) return { isProcessing: false };

    // 1. Check CSV Upload Logs (Active)
    const { data: csvLogs } = await supabase
        .from('csv_upload_logs')
        .select('name, linkedin')
        .in('status', ['Scraping', 'Processing', 'PENDING']);

    const inCsv = csvLogs?.some((log: any) =>
        (log.name && normalizeName(log.name) === normName) ||
        (log.linkedin && normalizeLinkedIn(log.linkedin) === normLinkedIn)
    );

    if (inCsv) return { isProcessing: true, source: 'CSV Queue' };

    // 2. Check Resume Uploads (Active)
    // Note: Resume uploads might not have name until processed, but if we are at callback stage, others might be too.
    // We check for *other* completed/processing uploads that haven't been finalized into Candidate Profile yet?
    // Actually, if it's 'Complete' in resume_uploads, it effectively SHOULD be in Candidate Profile soon.
    // If it's 'Processing', we might catch race conditions.
    if (currentUploadId) {
        const { data: resumeLogs } = await supabase
            .from('resume_uploads')
            .select('candidate_name, id')
            .neq('id', currentUploadId) // Don't match self
            .in('status', ['Processing', 'Scraping']); // Check active statuses

        const inResume = resumeLogs?.some((log: any) =>
            (log.candidate_name && normalizeName(log.candidate_name) === normName)
        );

        if (inResume) return { isProcessing: true, source: 'Resume Queue' };
    }

    return { isProcessing: false };
}
