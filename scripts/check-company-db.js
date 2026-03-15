const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Checking DB Structure for Companies ---');
    
    // 1. Check if company_master exists
    const { data: tables, error: tableError } = await supabase.rpc('get_table_names'); // If this RPC exists
    // Fallback: Try to select from company_master
    const { data: compMaster, error: compMasterError } = await supabase.from('company_master').select('*').limit(1);
    
    if (compMasterError) {
        console.log('company_master access error:', compMasterError.message);
    } else {
        console.log('company_master exists. Sample:', compMaster);
    }

    // 2. Check columns of candidate_experiences
    const { data: expCols, error: expColsError } = await supabase.from('candidate_experiences').select('*').limit(1);
    if (expCols && expCols.length > 0) {
        console.log('candidate_experiences columns:', Object.keys(expCols[0]));
    } else {
        console.log('Could not fetch candidate_experiences columns or table is empty.');
    }
}

check();
