const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- Database Schema Check ---');
    
    // Check if table exists
    const { data: tables, error: tErr } = await supabase
        .rpc('get_tables_info', { schema_name: 'public' }); // Assuming we have an RPC or we can use another way

    // Using a simple query if RPC doesn't exist
    const { data, error } = await supabase
        .from('candidate_audit_staging')
        .select('*')
        .limit(1);

    if (error) {
        if (error.code === '42P01') {
            console.log('❌ candidate_audit_staging table DOES NOT EXIST.');
        } else {
            console.error('Error checking table:', error);
        }
    } else {
        console.log('✅ candidate_audit_staging table exists.');
        console.log('Current row count (limit 1):', data.length);
    }
}

checkSchema();
