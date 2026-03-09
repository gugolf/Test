import { getEmploymentRecords } from "./src/app/actions/employment";

async function debug() {
    const records = await getEmploymentRecords('Resigned');
    console.log("Found", records.length, "resigned records");
    if (records.length > 0) {
        console.log("Keys of first record:", Object.keys(records[0]));
        console.log("resignation_reason of first record:", records[0].resignation_reason);
        console.log("resignation_reason_test of first record:", records[0].resignation_reason_test);
    }
}

debug();
