const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
    console.log('--- Creating pre_screen_logs Bucket ---');
    const { data, error } = await supabase.storage.createBucket('pre_screen_logs', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['application/pdf']
    });
    
    if (error) {
        console.error('Error:', error.message);
        if (error.message.includes('already exists')) {
            console.log('Bucket already exists.');
        }
    } else {
        console.log('Bucket created successfully:', data.name);
    }
}

createBucket();
