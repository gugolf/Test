const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- Column Inspection ---');
    
    // Inspect candidate_audit_staging
    const { data: staging, error: sErr } = await supabase
        .from('candidate_audit_staging')
        .select('*')
        .limit(1);
    
    if (sErr) console.error('Staging err:', sErr);
    else console.log('Staging columns:', Object.keys(staging[0] || {}));

    // Inspect Candidate Profile
    const { data: profiles, error: pErr } = await supabase
        .from('Candidate Profile')
        .select('*')
        .limit(1);
    
    if (pErr) console.error('Profile err:', pErr);
    else console.log('Profile columns:', Object.keys(profiles[0] || {}));
}

inspect();
