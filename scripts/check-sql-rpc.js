const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function listRPCs() {
    console.log('--- Listing RPC Functions ---');
    
    const { data, error } = await supabase
        .rpc('list_functions_temporarily_if_exists'); // This is just a placeholder to trigger an error usually, but better info
        
    // Better way: query the rpc info if possible via standard API 
    // Actually, I'll just try to search for common names
    const commonNames = ['exec_sql', 'execute_sql', 'run_sql', 'sql'];
    
    for (const name of commonNames) {
        const { error } = await supabase.rpc(name, { query: 'SELECT 1' });
        if (!error) {
            console.log(`Found RPC: ${name}`);
            return;
        } else if (error.code !== 'PGRST202') { // 202 is "function not found"
            console.log(`RPC ${name} exists but error:`, error.message);
        }
    }
    console.log('No common SQL execution RPCs found.');
}

listRPCs();
