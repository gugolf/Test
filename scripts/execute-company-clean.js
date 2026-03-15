const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Deduplicating Company Master ---');

    // 1. Fetch all masters
    const { data: masters, error: e1 } = await supabase
        .from('company_master')
        .select('*');

    if (e1) { console.error('Error fetching masters:', e1.message); return; }

    // 2. Group by normalized name
    const grouped = {};
    masters.forEach(m => {
        const name = (m.company_master || '').toLowerCase().trim();
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push(m);
    });

    const duplicates = Object.entries(grouped).filter(([name, list]) => list.length > 1);
    console.log(`Found ${duplicates.length} duplicate name sets.`);

    let totalRedirectedExp = 0;
    let totalRedirectedVar = 0;
    let totalDeleted = 0;

    for (const [name, list] of duplicates) {
        // Selection Strategy: Pick the one with the most data or lowest ID
        // For now, let's pick the one with industry or group if others are empty, or just list[0]
        const survivor = list.sort((a, b) => {
            const aScore = (a.industry ? 1 : 0) + (a.group ? 1 : 0) + (a.business_tags ? 1 : 0);
            const bScore = (b.industry ? 1 : 0) + (b.group ? 1 : 0) + (b.business_tags ? 1 : 0);
            return bScore - aScore || a.company_id - b.company_id;
        })[0];

        const deprecatedIds = list.filter(m => m.company_id !== survivor.company_id).map(m => m.company_id);

        console.log(`\nMerging "${name}" -> Survivor ID: ${survivor.company_id}`);
        console.log(`   Deprecated IDs: ${deprecatedIds.join(', ')}`);

        // Update candidate_experiences
        const { error: ueErr } = await supabase
            .from('candidate_experiences')
            .update({ company_id: survivor.company_id })
            .in('company_id', deprecatedIds);

        if (!ueErr) totalRedirectedExp += deprecatedIds.length;

        // Update company_variation
        const { error: uvErr } = await supabase
            .from('company_variation')
            .update({ company_id: survivor.company_id })
            .in('company_id', deprecatedIds);

        if (!uvErr) totalRedirectedVar += deprecatedIds.length;

        // Delete duplicates
        const { error: dErr } = await supabase
            .from('company_master')
            .delete()
            .in('company_id', deprecatedIds);

        if (!dErr) totalDeleted += deprecatedIds.length;
    }

    console.log(`\n✅ Summary:`);
    console.log(`   - Redirected ${totalRedirectedExp} experience references.`);
    console.log(`   - Redirected ${totalRedirectedVar} variation references.`);
    console.log(`   - Deleted ${totalDeleted} duplicate master records.`);
}

run();
