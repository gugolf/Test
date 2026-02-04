
/**
 * Image Migration Script
 * 
 * Usage: npx tsx scripts/migrate-images.ts
 * 
 * Prerequisites:
 * 1. image_mapping.csv in project root (Columns: candidate_id, imagename)
 * 2. Access to D:\Profile IMG (or configure IMAGE_DIR)
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const IMAGE_DIR = 'D:\\Profile IMG';
const CSV_FILE = 'image_mapping.csv';
const BUCKET = 'avatars'; // Ensure this bucket exists and is public

interface CsvRow {
    candidate_id: string;
    imagename: string;
    [key: string]: any;
}

async function main() {
    // 0. Ensure Bucket Exists
    console.log(`Checking bucket '${BUCKET}'...`);
    const { data: bucket, error: getBucketError } = await supabase.storage.getBucket(BUCKET);

    if (getBucketError) {
        console.log(`Bucket '${BUCKET}' not found or not accessible. Attempting to create...`);
        const { data: newBucket, error: createBucketError } = await supabase.storage.createBucket(BUCKET, {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
            fileSizeLimit: 5242880 // 5MB
        });

        if (createBucketError) {
            console.error(`Error creating bucket '${BUCKET}':`, createBucketError.message);
            console.error("Please create the 'avatars' bucket manually in your Supabase Dashboard and make it PUBLIC.");
            return;
        }
        console.log(`Bucket '${BUCKET}' created successfully!`);
    } else {
        console.log(`Bucket '${BUCKET}' exists.`);
    }

    if (!fs.existsSync(CSV_FILE)) {
        console.error(`Error: ${CSV_FILE} not found. Please create a CSV with columns 'candidate_id' and 'imagename' and place it in the project root.`);
        return;
    }

    if (!fs.existsSync(IMAGE_DIR)) {
        console.error(`Error: Image directory ${IMAGE_DIR} not found.`);
        return;
    }

    console.log("Reading CSV...");
    const csvContent = fs.readFileSync(CSV_FILE, 'utf8');

    // Parse CSV with header normalization
    const { data: rows } = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase()
    });

    console.log(`Found ${rows.length} rows in CSV.`);
    if (rows.length > 0) {
        console.log("First row preview:", rows[0]);
    }

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const row of (rows as CsvRow[])) {
        const candidateId = row.candidate_id?.trim();
        const imageName = row.imagename?.trim();

        if (!candidateId || !candidateId.toLowerCase().startsWith('c')) {
            // Skip empty or invalid IDs
            skipCount++;
            continue;
        }

        console.log(`Processing ${candidateId}...`);

        // Find Image File
        let imagePath: string | null = null;
        const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.PNG'];

        // Priority 1: Check candidate_id.jpg (e.g. C00123.jpg)
        for (const ext of extensions) {
            const p = path.join(IMAGE_DIR, `${candidateId}${ext}`);
            if (fs.existsSync(p)) {
                imagePath = p;
                break;
            }
        }

        // Priority 2: Check imagename (Hash/Other Name)
        if (!imagePath && imageName) {
            for (const ext of extensions) {
                const p = path.join(IMAGE_DIR, `${imageName}${ext}`);
                if (fs.existsSync(p)) {
                    imagePath = p;
                    break;
                }
            }
        }

        if (!imagePath) {
            console.log(`  [MISSING] No image found for ${candidateId} (Checked ID and Name: ${imageName})`);
            failCount++;
            continue;
        }

        console.log(`  [FOUND] Image found at: ${imagePath}`);

        try {
            // Upload to Supabase
            const fileBuffer = fs.readFileSync(imagePath);
            const contentType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
            const fileName = `${candidateId}-${Date.now()}${path.extname(imagePath)}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(fileName, fileBuffer, {
                    contentType: contentType,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

            // Update Profile
            const { error: updateError } = await supabase
                .from('Candidate Profile')
                .update({ photo: publicUrl })
                .eq('candidate_id', candidateId);

            if (updateError) throw updateError;

            console.log(`  [SUCCESS] Updated ${candidateId} with photo: ${publicUrl}`);
            successCount++;

        } catch (err: any) {
            console.error(`  [ERROR] Failed to process ${candidateId}:`, err.message);
            failCount++;
        }
    }

    console.log("\nMigration Complete.");
    console.log(`Success: ${successCount}`);
    console.log(`Failed/Missing: ${failCount}`);
    console.log(`Skipped: ${skipCount}`);
}

main().catch(console.error);
