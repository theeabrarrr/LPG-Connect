const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    console.log('--- Database Connectivity & Permission Test ---');

    // 1. Read .env.local
    const envPath = path.resolve(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('FAIL: .env.local not found at', envPath);
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    const env = {};
    envLines.forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim();
        }
    });

    const url = env['NEXT_PUBLIC_SUPABASE_URL'];
    const key = env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!url) console.error('FAIL: NEXT_PUBLIC_SUPABASE_URL missing in .env.local');
    if (!key) console.error('FAIL: SUPABASE_SERVICE_ROLE_KEY missing in .env.local');

    if (!url || !key) process.exit(1);

    console.log(`URL Found: ${url}`);
    console.log(`Key Found: ${key.substring(0, 10)}... (Service Role)`);

    // 2. Connect
    const supabase = createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // 3. Test Connection (SELECT count FROM profiles)
    // Using a simple query. 'profiles' table usually exists.
    try {
        const { data, error, count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('FAIL: Connection / Query Error:', error.message);
            if (error.code) console.error('Error Code:', error.code);
        } else {
            console.log('SUCCESS: Database Connection Established.');
            console.log('Query: SELECT count FROM profiles');
            console.log(`Result: Count = ${count}`);
        }
    } catch (err) {
        console.error('FAIL: Exception during query:', err.message);
    }

    // 4. Test Service Role Permissions (List Users)
    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

        if (error) {
            console.error('FAIL: Service Role Permission Check Failed:', error.message);
        } else {
            console.log('SUCCESS: Service Role Verified (Admin API access confirmed).');
            console.log(`Users found: ${users ? users.length : 0}`);
        }
    } catch (err) {
        console.error('FAIL: Exception during admin check:', err.message);
    }
}

main();
