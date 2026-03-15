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
    console.log('--- Auto-Onboarding Missing Companies ---');

    // 1. Fetch ALL unmapped experience records (id and company name)
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
        if (data.length === 0) {
            hasMore = false;
        } else {
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

    // 2. Group by Aggressive Normalization
    const groups = {};
    unmappedRecords.forEach(rec => {
        const key = aggressiveNormalize(rec.company);
        if (!key) return;
        if (!groups[key]) {
            groups[key] = {
                variations: {}, // name -> count
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

    // 3. Process each group
    for (const group of sortedGroups) {
        console.log(`Processing Group: "${group.bestName}" (${group.totalRows} rows, ${group.variations.length} variations)`);

        // A. Create Master Record
        const { data: newMaster, error: mErr } = await supabase
            .from('company_master')
            .insert({
                company_master: group.bestName,
                industry: 'Others',
                group: 'Others'
            })
            .select()
            .single();

        if (mErr) {
            console.error(`   Error creating master for ${group.bestName}:`, mErr.message);
            continue;
        }

        const newCompanyId = newMaster.company_id;
        totalMastersCreated++;

        // B. Create Variations
        for (const varName of group.variations) {
            const { error: vErr } = await supabase
                .from('company_variation')
                .insert({
                    company_id: newCompanyId,
                    variation_name: varName,
                    company_master_name: group.bestName
                });

            if (vErr) {
                console.error(`   Error creating variation "${varName}":`, vErr.message);
            } else {
                totalVariationsCreated++;
            }
        }

        // C. Update Experiences
        // Since recordIds can be large, we update in chunks
        const updateBatchSize = 100;
        for (let i = 0; i < group.recordIds.length; i += updateBatchSize) {
            const batch = group.recordIds.slice(i, i + updateBatchSize);
            const { error: uErr } = await supabase
                .from('candidate_experiences')
                .update({ company_id: newCompanyId })
                .in('id', batch);

            if (uErr) {
                console.error(`   Error updating experiences for group ${group.bestName}:`, uErr.message);
            } else {
                totalExperiencesUpdated += batch.length;
            }
        }
    }

    console.log(`\n✅ Summary:`);
    console.log(`   - Created ${totalMastersCreated} new company master records.`);
    console.log(`   - Created ${totalVariationsCreated} new company variations.`);
    console.log(`   - Linked ${totalExperiencesUpdated} experience records.`);
}

run();
