const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function aggressiveNormalize(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
}

async function run() {
    console.log('--- Auto-Onboarding Missing Companies (Dual-Table Manual IDs) ---');

    // 1. Fetch current max IDs
    const { data: mMax, error: mErr } = await supabase.from('company_master').select('company_id').order('company_id', { ascending: false }).limit(1);
    const { data: vMax, error: vErr } = await supabase.from('company_variation').select('variation_id').order('variation_id', { ascending: false }).limit(1);

    if (mErr || vErr) { console.error('Error fetching max IDs:', (mErr || vErr).message); return; }

    let nextCompanyId = (mMax[0]?.company_id || 0) + 1;
    let nextVariationId = (vMax[0]?.variation_id || 0) + 1;

    console.log(`Initial Start -> Company ID: ${nextCompanyId}, Variation ID: ${nextVariationId}`);

    // 2. Fetch ALL unmapped experience records
    let from = 0;
    const fetchBatchSize = 1000;
    let hasMore = true;
    const unmappedRecords = [];

    console.log('Fetching all unmapped experience records...');
    while (hasMore) {
        const { data, error } = await supabase
            .from('candidate_experiences')
            .select('id, company')
            .is('company_id', null)
            .neq('company', '')
            .range(from, from + fetchBatchSize - 1);

        if (error) { console.error('Error fetching records:', error.message); break; }
        if (data.length === 0) hasMore = false;
        else {
            unmappedRecords.push(...data);
            console.log(`   Fetched ${unmappedRecords.length} records...`);
            if (data.length < fetchBatchSize) hasMore = false;
            else from += fetchBatchSize;
        }
    }

    if (unmappedRecords.length === 0) {
        console.log('No unmapped records found. Exiting.');
        return;
    }

    // 3. Group by Aggressive Normalization
    const groups = {};
    unmappedRecords.forEach(rec => {
        const key = aggressiveNormalize(rec.company);
        if (!key) return;
        if (!groups[key]) {
            groups[key] = {
                variations: {},
                recordIds: [],
                key: key
            };
        }
        groups[key].variations[rec.company] = (groups[key].variations[rec.company] || 0) + 1;
        groups[key].recordIds.push(rec.id);
    });

    const sortedGroups = Object.entries(groups).map(([key, info]) => {
        const list = Object.entries(info.variations).map(([name, count]) => ({ name, count }));
        const bestName = list.sort((a, b) => b.count - a.count || b.name.length - a.name.length)[0].name;
        const totalRows = info.recordIds.length;
        return { key, bestName, totalRows, recordIds: info.recordIds, variations: Object.keys(info.variations) };
    }).sort((a, b) => b.totalRows - a.totalRows);

    console.log(`\nIdentified ${sortedGroups.length} unique company groups to onboard.`);

    let totalMastersCreated = 0;
    let totalVariationsCreated = 0;
    let totalExperiencesUpdated = 0;

    // 4. Process each group
    for (const group of sortedGroups) {
        console.log(`Processing Group: "${group.bestName}" (${group.totalRows} rows)`);

        const currentCompanyId = nextCompanyId++;

        // A. Insert into company_master
        const { error: insMasterErr } = await supabase
            .from('company_master')
            .insert({
                company_id: currentCompanyId,
                company_master: group.bestName,
                industry: 'Others',
                group: 'Others'
            });

        if (insMasterErr) {
            console.error(`   Failed to create master for ${group.bestName}:`, insMasterErr.message);
            nextCompanyId--; // Revoke ID
            continue;
        }
        totalMastersCreated++;

        // B. Insert Variations
        for (const vName of group.variations) {
            const currentVariationId = nextVariationId++;
            const { error: insVarErr } = await supabase
                .from('company_variation')
                .insert({
                    variation_id: currentVariationId,
                    company_id: currentCompanyId,
                    variation_name: vName,
                    company_master_name: group.bestName
                });

            if (insVarErr) {
                console.error(`   Failed to create variation "${vName}":`, insVarErr.message);
                nextVariationId--; // Revoke ID
            } else {
                totalVariationsCreated++;
            }
        }

        // C. Update Experiences
        const chunk = 100;
        for (let i = 0; i < group.recordIds.length; i += chunk) {
            const batch = group.recordIds.slice(i, i + chunk);
            const { error: updErr } = await supabase
                .from('candidate_experiences')
                .update({ company_id: currentCompanyId })
                .in('id', batch);

            if (updErr) console.error(`   Failed to link experiences for ${group.bestName}:`, updErr.message);
            else totalExperiencesUpdated += batch.length;
        }

        if (totalMastersCreated % 50 === 0) {
            console.log(`   Status: Created ${totalMastersCreated} masters, ${totalVariationsCreated} variations so far...`);
        }
    }

    console.log(`\n✅ Final Summary:`);
    console.log(`   - Created ${totalMastersCreated} new masters.`);
    console.log(`   - Created ${totalVariationsCreated} new variations.`);
    console.log(`   - Linked ${totalExperiencesUpdated} experience records.`);
}

run();
