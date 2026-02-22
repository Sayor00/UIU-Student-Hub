import fs from 'fs';

const departments = [
    { code: '011', name: 'BSCSE' },
    { code: '015', name: 'BSDS' },
    { code: '111', name: 'BBA' },
    { code: '021', name: 'BSEEE' }
];

async function main() {
    try {
        console.log('Logging in...');
        const authRes = await fetch('https://m5p10igya2.execute-api.ap-southeast-1.amazonaws.com/v3/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: '0112430141',
                password: 'tF@uCaMa41.uIu.aC.bD',
                logout_other_sessions: false
            })
        });
        const authData = await authRes.json();

        if (!authData.data || !authData.data.access_token) {
            console.error('Failed to retrieve token:', authData);
            process.exit(1);
        }

        const token = authData.data.access_token;
        const allCourses = {};

        for (const dept of departments) {
            console.log(`Fetching courses for ${dept.name} (${dept.code})...`);
            const res = await fetch(`https://m5p10igya2.execute-api.ap-southeast-1.amazonaws.com/v3/courses/sections?department=${dept.code}&limit=1000`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Origin': 'https://cloud-v3.edusoft-ltd.workers.dev'
                }
            });
            const data = await res.json();
            allCourses[dept.name] = data;
        }

        fs.writeFileSync('public/courses.json', JSON.stringify(allCourses, null, 2));
        console.log('Successfully saved to public/courses.json');
    } catch (err) {
        console.error('Error fetching courses:', err);
    }
}

main();
