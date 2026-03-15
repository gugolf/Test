const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const AUDIT_NOTE = 'Location from HQ location';

function normalize(str) {
    if (!str) return '';
    // Trim, lowercase, and remove special characters/spaces for robust matching
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function run() {
    console.log('--- Filling Countries from HQ Reference ---');

    // 1. Fetch all HQ references
    const { data: refs, error: e1 } = await supabase
        .from('company_reference_location')
        .select('company, unique_location');

    if (e1) { console.error('Error fetching refs:', e1.message); return; }

    // Create a map: normalized_company -> country
    // If duplicates exist, the last one wins (could be refined)
    const refMap = {};
    refs.forEach(r => {
        const norm = normalize(r.company);
        if (norm) {
            refMap[norm] = r.unique_location;
        }
    });
    console.log(`Mapped ${Object.keys(refMap).length} unique companies from reference table.`);

    // 2. Fetch target experiences
    // where work_location AND country are empty
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    let totalUpdated = 0;

    console.log('\nProcessing candidate_experiences...');

    while (hasMore) {
        console.log(`   Batch: ${from} to ${from + batchSize}...`);
        const { data: exp, error: eExp } = await supabase
            .from('candidate_experiences')
            .select('id, company, work_location, country, note')
            .or('work_location.is.null,work_location.eq.""')
            .or('country.is.null,country.eq.""')
            .not('company', 'is', null)
            .neq('company', '')
            .range(from, from + batchSize - 1);

        if (eExp) {
            console.error('Error fetching batch:', eExp.message);
            break;
        }

        if (exp.length === 0) {
            hasMore = false;
            break;
        }

        for (const ce of exp) {
            const normComp = normalize(ce.company);
            const matchedCountry = refMap[normComp];

            if (matchedCountry) {
                // Determine new note
                let newNote = ce.note || '';
                if (!newNote.includes(AUDIT_NOTE)) {
                    if (newNote.length > 0) {
                        newNote += ` | ${AUDIT_NOTE}`;
                    } else {
                        newNote = AUDIT_NOTE;
                    }
                }

                const { error: uErr } = await supabase
                    .from('candidate_experiences')
                    .update({
                        country: matchedCountry,
                        note: newNote
                    })
                    .eq('id', ce.id);

                if (!uErr) {
                    totalUpdated++;
                } else {
                    console.error(`   Failed to update id ${ce.id}:`, uErr.message);
                }
            }
        }

        if (exp.length < batchSize) {
            hasMore = false;
        } else {
            from += batchSize;
        }
    }

    console.log(`\n✅ Step 2 Complete: Updated ${totalUpdated} records with HQ countries and audit notes.`);
}

run();
