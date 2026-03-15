const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- HQ Location Cleansing Stats ---');

    // 1. Records with empty work_location but populated country (potential references)
    const { count: refPotentialCount, error: e1 } = await supabase
        .from('candidate_experiences')
        .select('*', { count: 'exact', head: true })
        .or('work_location.is.null,work_location.eq.""')
        .not('country', 'is', null)
        .neq('country', '');

    if (e1) console.error('Error e1:', e1.message);

    // 2. Records with empty work_location AND empty country (target for filling)
    // We also need to check if company is not empty
    const { count: targetsCount, error: e2 } = await supabase
        .from('candidate_experiences')
        .select('*', { count: 'exact', head: true })
        .or('work_location.is.null,work_location.eq.""')
        .or('country.is.null,country.eq.""')
        .not('company', 'is', null)
        .neq('company', '');

    if (e2) console.error('Error e2:', e2.message);

    console.log(`1. Potential Ref Sources (Empty work_location, Populated country): ${refPotentialCount}`);
    console.log(`2. Target Updates (Empty work_location, Empty country, Populated company): ${targetsCount}`);
}

check();
