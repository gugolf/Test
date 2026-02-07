const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
    console.log("Checking Storage Buckets...");
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error("List Buckets Error:", error);
    } else {
        console.log("Buckets:", data.map(b => b.name));
        const resumesBucket = data.find(b => b.name === 'resumes');
        if (resumesBucket) {
            console.log("✅ 'resumes' bucket exists.");
        } else {
            console.log("❌ 'resumes' bucket MISSING.");
            // Try to create it
            console.log("Attempting to create 'resumes' bucket...");
            const { data: createData, error: createError } = await supabase.storage.createBucket('resumes', {
                public: true,
                fileSizeLimit: 5242880, // 5MB
                allowedMimeTypes: ['application/pdf']
            });
            if (createError) console.error("Create Bucket Error:", createError);
            else console.log("✅ Bucket created successfully!");
        }

        // Test Upload
        console.log("Testing Upload Permissions...");
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('resumes')
            .upload('test_permission.pdf', 'This is a test file content', {
                upsert: true,
                contentType: 'application/pdf'
            });

        if (uploadError) {
            console.error("❌ Upload Failed (Likely Policy Issue):", uploadError);
        } else {
            console.log("✅ Upload Successful:", uploadData);
        }
    }
}

checkStorage();
