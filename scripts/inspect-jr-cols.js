const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- Table Inspection ---');
    
    // Inspect jr_candidates
    const { data: jrc, error: jrcErr } = await supabase
        .from('jr_candidates')
        .select('*')
        .limit(1);
    
    if (jrcErr) console.error('jr_candidates err:', jrcErr);
    else console.log('jr_candidates columns:', Object.keys(jrc[0] || {}));

    // Inspect status_log
    const { data: logs, error: lErr } = await supabase
        .from('status_log')
        .select('*')
        .limit(1);
    
    if (lErr) console.error('status_log err:', lErr);
    else console.log('status_log columns:', Object.keys(logs[0] || {}));
}

inspect();
