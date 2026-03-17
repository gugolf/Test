const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Normalization Helpers ---
function normalizeName(name) {
    if (!name) return "";
    return name
        .toString()
        .replace(/\\n/g, " ") // Handle literal \n
        .replace(/\n/g, " ")   // Handle actual newlines
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[\(\)\[\]]/g, " ") // Remove parentheses and brackets
        .toLowerCase()
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();
}

function normalizeLinkedIn(url) {
    if (!url) return "";
    try {
        const cleanUrl = url.toString().replace(/\\n/g, "").replace(/\n/g, "").trim();
        const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
        urlObj.search = "";
        let path = urlObj.pathname.toLowerCase();
        if (path.endsWith('/')) path = path.slice(0, -1);
        return path;
    } catch (e) {
        return url.toString().replace(/\\n/g, "").replace(/\n/g, "").trim().toLowerCase().replace(/\/$/, "");
    }
}

async function runAudit() {
    console.log('🚀 Starting Multi-JR Candidate Audit...\n');

    try {
        // --- STEP 1: Link system_candidate_id based on name matching ---
        console.log('Step 1: Matching report names with System Candidate Profiles...');
        
        // Fetch all staging records
        const { data: staging, error: sErr } = await supabase
            .from('candidate_audit_staging')
            .select('id, report_name, report_jr_id');

        if (sErr) throw sErr;
        console.log(`Found ${staging.length} records in staging.`);

        // Fetch all internal candidates for matching
        const { data: profiles, error: pErr } = await supabase
            .from('Candidate Profile')
            .select('candidate_id, name, linkedin');
        
        if (pErr) throw pErr;

        // Build lookup maps
        const nameMap = new Map();
        const linkedinMap = new Map();

        profiles.forEach(p => {
            if (p.name) nameMap.set(normalizeName(p.name), p.candidate_id);
            if (p.linkedin) linkedinMap.set(normalizeLinkedIn(p.linkedin), p.candidate_id);
        });

        let matchCount = 0;
        for (const row of staging) {
            let systemId = null;
            let matchType = null;

            // 1. Try LinkedIn Match first
            if (row.report_linkedin) {
                const normReportLI = normalizeLinkedIn(row.report_linkedin);
                systemId = linkedinMap.get(normReportLI);
                if (systemId) matchType = 'LinkedIn';
            }

            // 2. Try Name Match if no LinkedIn match
            if (!systemId && row.report_name) {
                const normReportName = normalizeName(row.report_name);
                systemId = nameMap.get(normReportName);
                if (systemId) matchType = 'Name';
            }

            if (systemId) {
                console.log(`🔗 Matched: "${row.report_name}" -> ${systemId} (${matchType})`);
                await supabase
                    .from('candidate_audit_staging')
                    .update({ system_candidate_id: systemId })
                    .eq('id', row.id);
                matchCount++;
            }
        }
        console.log(`\n✅ Linked ${matchCount} candidates to existing system profiles.\n`);

        // --- STEP 2: Check Assignment in JR ---
        console.log('Step 2: Checking JR assignments and linking to jr_candidates...');
        
        const { data: updatedStaging, error: usErr } = await supabase
            .from('candidate_audit_staging')
            .select('*')
            .not('system_candidate_id', 'is', null);
        
        if (usErr) throw usErr;

        let jrMatchCount = 0;
        for (const row of updatedStaging) {
            // Find IF candidate is in the SPECIFIC JR
            const { data: jc, error: jErr } = await supabase
                .from('jr_candidates')
                .select('jr_candidate_id, temp_status')
                .eq('candidate_id', row.system_candidate_id)
                .eq('jr_id', row.report_jr_id)
                .single();

            let status = 'Missing in JR';
            let remark = `Status ในระบบ: ไม่พบ | ใน Report: ${row.report_status || '-'}`;
            let jrIdInSystem = null;

            if (jc) {
                status = 'Correct (In JR)';
                remark = `Status ในระบบ: ${jc.temp_status || 'Pool'} | ใน Report: ${row.report_status || '-'}`;
                jrIdInSystem = jc.jr_candidate_id;
                jrMatchCount++;
            }

            await supabase
                .from('candidate_audit_staging')
                .update({ 
                    system_jr_candidate_id: jrIdInSystem,
                    audit_status: status,
                    remark: remark
                })
                .eq('id', row.id);
        }
        console.log(`✅ Processed ${updatedStaging.length} candidates. Matches: ${jrMatchCount}\n`);

        // --- STEP 3: Identify Extra Candidates (System Only) ---
        console.log('Step 3: Identifying "System Only" candidates (not in report)...');
        
        const jrIds = [...new Set(staging.map(s => s.report_jr_id).filter(Boolean))];
        console.log('JRs to audit:', jrIds.join(', '));

        for (const jrId of jrIds) {
            console.log(`Auditing ${jrId}...`);
            const { data: jcList, error: listErr } = await supabase
                .from('jr_candidates')
                .select('candidate_id, temp_status')
                .eq('jr_id', jrId);

            if (listErr) throw listErr;

            for (const jc of jcList) {
                // Check if this candidate is in the report for this JR
                const reportMatch = staging.find(s => 
                    s.system_candidate_id === jc.candidate_id && s.report_jr_id === jrId
                );

                if (!reportMatch) {
                    // Fetch Name manually since join failed
                    const { data: profile } = await supabase
                        .from('Candidate Profile')
                        .select('name')
                        .eq('candidate_id', jc.candidate_id)
                        .single();

                    const name = profile?.name || 'Unknown';
                    
                    // Check if already in staging as "System Only" to avoid dupes
                    const { data: existing } = await supabase
                        .from('candidate_audit_staging')
                        .select('id')
                        .eq('system_candidate_id', jc.candidate_id)
                        .eq('report_jr_id', jrId)
                        .eq('audit_status', 'System Only')
                        .limit(1);

                    if (!existing || existing.length === 0) {
                        await supabase
                            .from('candidate_audit_staging')
                            .insert({
                                report_name: name,
                                report_jr_id: jrId,
                                system_candidate_id: jc.candidate_id,
                                audit_status: 'System Only',
                                remark: `มีในระบบ (${jc.temp_status || 'Pool'}) แต่ไม่มีใน Report`
                            });
                    }
                }
            }
        }
        console.log('✅ Identify Extra Candidates completed.\n');

        console.log('🎉 AUDIT COMPLETE. Please check the candidate_audit_staging table for details.');

    } catch (err) {
        console.error('❌ Audit Failed:', err);
    }
}

runAudit();
