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
    console.log('--- Executing Final Candidate Experience Cleanup ---');

    // 1. Load Variation Mappings
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    const variationMap = {};

    console.log('Loading variation mappings...');
    while (hasMore) {
        const { data, error } = await supabase
            .from('company_variation')
            .select('variation_name, company_id')
            .range(from, from + batchSize - 1);
        if (error) { console.error('Error variations:', error.message); break; }
        if (data.length === 0) hasMore = false;
        else {
            data.forEach(v => {
                const key = aggressiveNormalize(v.variation_name);
                if (key) variationMap[key] = v.company_id;
            });
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }
    console.log(`Loaded ${Object.keys(variationMap).length} variations.`);

    // 2. Load Master Metadata
    from = 0;
    hasMore = true;
    const masterMap = {};

    console.log('Loading master company data...');
    while (hasMore) {
        const { data, error } = await supabase
            .from('company_master')
            .select('company_id, industry, group')
            .range(from, from + batchSize - 1);
        if (error) { console.error('Error masters:', error.message); break; }
        if (data.length === 0) hasMore = false;
        else {
            data.forEach(m => {
                masterMap[m.company_id] = { industry: m.industry, group: m.group };
            });
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }
    console.log(`Loaded ${Object.keys(masterMap).length} master companies.`);

    // 3. Process Experiences in Batches
    from = 0;
    hasMore = true;
    let totalUpdatedId = 0;
    let totalUpdatedMeta = 0;
    const missingCompanies = {};

    console.log('\nProcessing candidate_experiences for ID and Metadata updates...');
    while (hasMore) {
        console.log(`   Batch: ${from} to ${from + batchSize}...`);
        const { data: exp, error: eExp } = await supabase
            .from('candidate_experiences')
            .select('id, company, company_id, company_industry, company_group')
            .range(from, from + batchSize - 1);

        if (eExp) { console.error('Error fetching experiences:', eExp.message); break; }
        if (exp.length === 0) { hasMore = false; break; }

        for (const ce of exp) {
            const normName = aggressiveNormalize(ce.company);
            const correctId = variationMap[normName];

            let needsUpdate = false;
            const updateFields = {};

            // A. Check/Update company_id
            if (correctId) {
                if (String(ce.company_id) !== String(correctId)) {
                    updateFields.company_id = correctId;
                    needsUpdate = true;
                    totalUpdatedId++;
                }

                // B. Sync Industry/Group
                const master = masterMap[correctId];
                if (master) {
                    if (ce.company_industry !== master.industry || ce.company_group !== master.group) {
                        updateFields.company_industry = master.industry;
                        updateFields.company_group = master.group;
                        needsUpdate = true;
                        totalUpdatedMeta++;
                    }
                }
            } else if (ce.company && !ce.company_id) {
                // Collect missing mapping
                missingCompanies[ce.company] = (missingCompanies[ce.company] || 0) + 1;
            }

            if (needsUpdate) {
                const { error: uErr } = await supabase
                    .from('candidate_experiences')
                    .update(updateFields)
                    .eq('id', ce.id);
                if (uErr) console.error(`      Failed to update ID ${ce.id}:`, uErr.message);
            }
        }

        if (exp.length < batchSize) hasMore = false;
        else from += batchSize;
    }

    console.log(`\n✅ Summary:`);
    console.log(`   - Redirected/Filled company_id for ${totalUpdatedId} records.`);
    console.log(`   - Synced Industry/Group for ${totalUpdatedMeta} records.`);

    // 4. Output Top Missing
    console.log('\nTop 20 Missing Company Mappings:');
    Object.entries(missingCompanies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .forEach(([name, count]) => {
            console.log(`- ${name}: ${count} rows`);
        });
}

run();
