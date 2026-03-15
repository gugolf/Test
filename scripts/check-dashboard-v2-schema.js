const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Checking DB Structure for Expanded Dashboard ---');
    
    // 1. Candidate Profile (Gender, DOB)
    const { data: prof, error: profErr } = await supabase.from('Candidate Profile').select('*').limit(1);
    console.log('Candidate Profile columns:', prof ? Object.keys(prof[0]) : profErr);

    // 2. jr_candidate
    const { data: jrc, error: jrcErr } = await supabase.from('jr_candidate').select('*').limit(1);
    console.log('jr_candidate columns:', jrc ? Object.keys(jrc[0]) : jrcErr);

    // 3. job_requisitions (BU, Sub BU)
    const { data: jr, error: jrErr } = await supabase.from('job_requisitions').select('*').limit(1);
    console.log('job_requisitions columns:', jr ? Object.keys(jr[0]) : jrErr);
    
    // 4. company_master (Confirming Rating and Set)
    const { data: cm, error: cmErr } = await supabase.from('company_master').select('*').limit(1);
    console.log('company_master columns:', cm ? Object.keys(cm[0]) : cmErr);
}

check();
