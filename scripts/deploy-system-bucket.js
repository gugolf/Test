
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials (URL or Service Role Key)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deploySystemBucket() {
    const bucketName = 'system';

    // 1. Create Bucket if not exists
    const { data: bucket, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 1024 * 1024 * 2, // 2MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif']
    });

    if (createError) {
        if (createError.message.includes('already exists')) {
            console.log(`Bucket '${bucketName}' already exists.`);
        } else {
            console.error('Error creating bucket:', createError);
            return;
        }
    } else {
        console.log(`Bucket '${bucketName}' created successfully.`);
    }

    // 2. Upload File
    const checkFile = path.join(__dirname, '../public/default-avatar.png');
    if (!fs.existsSync(checkFile)) {
        console.error("File not found:", checkFile);
        return;
    }

    const fileBuffer = fs.readFileSync(checkFile);
    const fileName = 'default-avatar.png';

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, fileBuffer, {
            contentType: 'image/png',
            upsert: true
        });

    if (uploadError) {
        console.error('Error uploading:', uploadError);
        return;
    }

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

    console.log('Upload successful!');
    console.log('Public URL:', publicUrl);
}

deploySystemBucket();
