const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
    const tables = ['unique_location_name', 'company_reference_location', 'company_variation', 'company_master', 'country'];
    console.log('--- Table Verification ---');
    
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ Table ${table} error: ${error.message}`);
        } else {
            console.log(`✅ Table ${table} exists.`);
        }
    }
}

verifyTables();
