const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function aggressiveNormalize(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
}

async function audit() {
    console.log('--- Auditing Existing company_id Mappings ---');

    // 1. Load Variations Map
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

        if (error) { console.error('Error fetching variations:', error.message); break; }

        if (data.length === 0) {
            hasMore = false;
        } else {
            data.forEach(v => {
                const key = aggressiveNormalize(v.variation_name);
                if (key) variationMap[key] = v.company_id;
            });
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
        }
    }
    console.log(`Loaded ${Object.keys(variationMap).length} variations.`);

    // 2. Sample candidate_experiences with company_id
    from = 0;
    hasMore = true;
    let totalChecked = 0;
    let inconsistencies = 0;
    const sampleErrors = [];

    console.log('\nChecking existing mappings in candidate_experiences...');
    while (hasMore && totalChecked < 5000) { // Check a significant sample
        const { data: exp, error: eExp } = await supabase
            .from('candidate_experiences')
            .select('id, company, company_id')
            .not('company_id', 'is', null)
            .range(from, from + batchSize - 1);

        if (eExp) { console.error('Error fetching experiences:', eExp.message); break; }

        if (exp.length === 0) {
            hasMore = false;
            break;
        }

        for (const ce of exp) {
            totalChecked++;
            const normName = aggressiveNormalize(ce.company);
            const expectedId = variationMap[normName];

            if (expectedId && String(expectedId) !== String(ce.company_id)) {
                inconsistencies++;
                if (sampleErrors.length < 10) {
                    sampleErrors.push({
                        id: ce.id,
                        company: ce.company,
                        current_id: ce.company_id,
                        expected_id: expectedId
                    });
                }
            }
        }

        if (exp.length < batchSize) hasMore = false;
        else from += batchSize;
    }

    console.log(`\nAudit Summary:`);
    console.log(`- Total records checked: ${totalChecked}`);
    console.log(`- Inconsistencies found: ${inconsistencies} (${((inconsistencies / totalChecked) * 100).toFixed(2)}%)`);

    if (sampleErrors.length > 0) {
        console.log('\nSample Inconsistencies:');
        sampleErrors.forEach(err => {
            console.log(`- Experience ID: ${err.id}, Company: "${err.company}"`);
            console.log(`  Current ID: ${err.current_id} vs Expected ID: ${err.expected_id}`);
        });
    }
}

audit();
