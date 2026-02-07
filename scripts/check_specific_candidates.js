
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envConfig = fs.readFileSync(envPath, { encoding: 'utf8' });
    envConfig.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
} catch (e) { console.error(e); }

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCandidates() {
    const ids = ['C00046', 'C00021', 'C00025'];
    console.log("Checking IDs:", ids);

    const { data, error } = await supabase
        .from('Candidate Profile')
        .select('candidate_id, modify_date, created_date')
        .in('candidate_id', ids);

    if (error) console.error(error);
    else console.table(data);
}

checkCandidates();
