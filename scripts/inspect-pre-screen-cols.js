const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- Pre Screen Log Table Inspection ---');
    
    // Check if table exists and get columns
    const { data, error } = await supabase
        .from('pre_screen_log')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error:', error.message);
        console.log('Trying to find table via information_schema...');
    } else {
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}

inspect();
