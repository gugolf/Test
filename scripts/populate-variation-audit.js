const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Populating Variation Audit Data ---');

    // 1. Fetch all company_master records
    // Since we have ~4000 records, we might need to fetch in batches if it grows,
    // but for now 4000 fits in a few ranges. Let's use range to be safe.
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    const masterMap = {};

    console.log('Fetching master company data...');
    while (hasMore) {
        const { data, error } = await supabase
            .from('company_master')
            .select('company_id, company_master')
            .range(from, from + batchSize - 1);

        if (error) { console.error('Error fetching masters:', error.message); break; }

        if (data.length === 0) {
            hasMore = false;
        } else {
            data.forEach(m => {
                masterMap[m.company_id] = m.company_master;
            });
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }
    console.log(`Loaded ${Object.keys(masterMap).length} master company names.`);

    // 2. Process variations in batches
    from = 0;
    hasMore = true;
    let totalUpdated = 0;

    console.log('\nUpdating variations...');
    while (hasMore) {
        const { data: variations, error: vErr } = await supabase
            .from('company_variation')
            .select('variation_id, company_id')
            .range(from, from + batchSize - 1);

        if (vErr) { console.error('Error fetching variations:', vErr.message); break; }

        if (variations.length === 0) {
            hasMore = false;
            break;
        }

        for (const v of variations) {
            const masterName = masterMap[v.company_id];
            if (masterName) {
                const { error: uErr } = await supabase
                    .from('company_variation')
                    .update({ company_master_name: masterName })
                    .eq('variation_id', v.variation_id);

                if (!uErr) {
                    totalUpdated++;
                } else {
                    console.error(`   Failed to update variation ${v.variation_id}:`, uErr.message);
                }
            }
        }

        console.log(`   Processed batch up to ${from + variations.length}...`);
        if (variations.length < batchSize) hasMore = false;
        else from += batchSize;
    }

    console.log(`\n✅ Finished: Populated company_master_name for ${totalUpdated} variation records.`);
}

run();
