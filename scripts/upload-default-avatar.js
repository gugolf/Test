
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Or SERVICE_ROLE_KEY if needed for bucket creation

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadAvatar() {
    const filePath = path.join(__dirname, '../public/default-avatar.png');
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = 'default-avatar.png';
    const bucketName = 'candidate_profile'; // Using existing bucket

    // Upload
    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, fileBuffer, {
            contentType: 'image/png',
            upsert: true
        });

    if (error) {
        console.error('Error uploading:', error);
        return;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

    console.log('Upload successful!');
    console.log('Public URL:', publicUrl);
}

uploadAvatar();
