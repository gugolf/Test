const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDetails() {
    console.log('--- Column Details for pre_screen_log ---');
    
    const { data: cols, error } = await supabase.rpc('get_column_details', { 
        table_name_input: 'pre_screen_log' 
    });

    if (error) {
        console.error('RPC get_column_details not found or failed. Trying direct query...');
        // Fallback to manual check of max ID
        const { data: maxId, error: maxErr } = await supabase
            .from('pre_screen_log')
            .select('pre_screen_id')
            .order('pre_screen_id', { ascending: false })
            .limit(1);
        
        if (maxErr) {
            console.error('Error fetching max ID:', maxErr.message);
        } else {
            console.log('Current Max ID:', maxId[0]?.pre_screen_id);
        }
    } else {
        console.table(cols);
    }
}

checkDetails();
