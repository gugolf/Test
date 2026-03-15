const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function aggressiveNormalize(str) {
    if (!str) return '';
    // Lowercase, then remove anything that isn't a letter or number (including spaces, symbols, and Thai)
    return str.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
}

async function run() {
    console.log('--- Aggressive Deduplicating Company Master ---');

    // 1. Fetch ALL masters in batches
    let from = 0;
    const fetchBatchSize = 1000;
    let hasMore = true;
    const allMasters = [];

    console.log('Fetching all company_master records...');
    while (hasMore) {
        const { data, error } = await supabase
            .from('company_master')
            .select('*')
            .range(from, from + fetchBatchSize - 1);

        if (error) { console.error('Error fetching masters:', error.message); break; }

        if (data.length === 0) {
            hasMore = false;
        } else {
            allMasters.push(...data);
            console.log(`   Fetched ${allMasters.length} records...`);
            if (data.length < fetchBatchSize) {
                hasMore = false;
            } else {
                from += fetchBatchSize;
            }
        }
    }

    // 2. Group by AGGRESSIVE normalized name
    const grouped = {};
    allMasters.forEach(m => {
        const key = aggressiveNormalize(m.company_master);
        if (!key) return; // Skip empty names
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(m);
    });

    const duplicates = Object.entries(grouped).filter(([key, list]) => list.length > 1);
    console.log(`\nFound ${duplicates.length} duplicate name sets (with aggressive normalization).`);

    let totalRedirectedExp = 0;
    let totalRedirectedVar = 0;
    let totalDeleted = 0;

    for (const [key, list] of duplicates) {
        // Selection Strategy: Priority to record with most info or lowest ID
        const survivor = list.sort((a, b) => {
            const aScore = (a.industry ? 1 : 0) + (a.group ? 1 : 0) + (a.business_tags ? 1 : 0);
            const bScore = (b.industry ? 1 : 0) + (b.group ? 1 : 0) + (b.business_tags ? 1 : 0);
            return bScore - aScore || a.company_id - b.company_id;
        })[0];

        const deprecatedIds = list.filter(m => m.company_id !== survivor.company_id).map(m => m.company_id);

        console.log(`Merging [${key}] -> Survivor: "${survivor.company_master}" (ID: ${survivor.company_id})`);
        console.log(`   Merging names: ${list.map(l => '"' + l.company_master + '"').join(', ')}`);
        console.log(`   Deprecated IDs: ${deprecatedIds.join(', ')}`);

        // Update candidate_experiences
        const { error: ueErr } = await supabase
            .from('candidate_experiences')
            .update({ company_id: survivor.company_id })
            .in('company_id', deprecatedIds);

        if (ueErr) console.error(`   Error updating experiences for ${key}:`, ueErr.message);
        else totalRedirectedExp += deprecatedIds.length;

        // Update company_variation
        const { error: uvErr } = await supabase
            .from('company_variation')
            .update({ company_id: survivor.company_id })
            .in('company_id', deprecatedIds);

        if (uvErr) console.error(`   Error updating variations for ${key}:`, uvErr.message);
        else totalRedirectedVar += deprecatedIds.length;

        // Delete duplicates
        const { error: dErr } = await supabase
            .from('company_master')
            .delete()
            .in('company_id', deprecatedIds);

        if (dErr) console.error(`   Error deleting master records for ${key}:`, dErr.message);
        else totalDeleted += deprecatedIds.length;
    }

    console.log(`\n✅ Summary:`);
    console.log(`   - Redirected ${totalRedirectedExp} experience references.`);
    console.log(`   - Redirected ${totalRedirectedVar} variation references.`);
    console.log(`   - Deleted ${totalDeleted} duplicate master records.`);
}

run();
