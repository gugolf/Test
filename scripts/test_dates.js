
const dates = [
    '9/9/2025',
    '13/11/2026', // User claimed 13/11/2026
    '13/11/2025', // Maybe they meant this?
    '02/07/2026', // Today (approx)
    '2026-02-07T11:33:13.443Z'
];

const now = new Date('2026-02-07T22:22:49+07:00'); // User's current time approx
console.log("Reference NOW:", now.toString());

dates.forEach(dStr => {
    const d = new Date(dStr);
    console.log(`\nInput: '${dStr}'`);
    console.log(`Parsed: ${d.toString()}`);

    if (isNaN(d.getTime())) {
        console.log("Result: Invalid Date (Fallback to 6m+ in logic)");
    } else {
        const diffTime = now.getTime() - d.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log(`Diff Days: ${diffDays}`);

        let status = '6+ Months';
        if (diffDays <= 30) status = 'Fresh';
        else if (diffDays <= 90) status = '1-3 Months';
        else if (diffDays <= 180) status = '4-6 Months';

        console.log(`Classified as: ${status}`);
    }
});
