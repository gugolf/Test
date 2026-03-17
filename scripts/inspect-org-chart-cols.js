const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- Org Chart Table Inspection ---');
    
    const { data, error } = await supabase
        .from('org_chart_uploads')
        .select('*')
        .limit(1);
    
    if (error) console.error('Error:', error);
    else console.log('Columns:', Object.keys(data[0] || {}));
}

inspect();
