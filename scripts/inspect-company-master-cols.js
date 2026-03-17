const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- Company Master Table Inspection ---');
    
    const { data, error } = await supabase
        .from('company_master')
        .select('*')
        .limit(1);
    
    if (error) console.error('Error:', error);
    else {
        const item = data[0];
        console.log('Columns:', Object.keys(item || {}));
        // Try to find the company_id or id specifically
        if (item) {
            const idKey = Object.keys(item).find(k => k.toLowerCase().includes('id'));
            console.log(`Potential ID key: ${idKey}, Value: ${item[idKey]}, Type: ${typeof item[idKey]}`);
        }
    }
}

inspect();
