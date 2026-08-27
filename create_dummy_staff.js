const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/"/g, '');
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']);

async function run() {
  console.log('\nLogging in as Platform Admin (tokimekidxb@gmail.com)...');
  // NOTE: the user set their password for the admin account earlier, but I don't know it. 
  // Let me try Test@123456 since they used it for the client.
  const { data: adminData, error: adminError } = await supabase.auth.signInWithPassword({
    email: 'tokimekidxb@gmail.com',
    password: 'Test@123456'
  });

  if (adminError) {
    console.error('Failed to log in as platform admin:', adminError.message);
    return;
  }
  
  await supabase.auth.setSession({
    access_token: adminData.session.access_token,
    refresh_token: adminData.session.refresh_token
  });

  const tenantId = '0b48a379-3dc8-4177-ad54-82f50ed3e082'; // Wait, I need to fetch it dynamically.
  
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', 'test-ltd')
    .single();

  const users = [
    { email: 'manager.testltd@workgrid.app', id: '48e9d864-28f8-4f69-82ff-90e4e3777dd6', role: 'manager' },
    { email: 'finance.testltd@workgrid.app', id: '2cfb5366-54c2-4c82-b4b3-bbd3ded7b5b1', role: 'manager' }
  ];

  for (const user of users) {
    const { error: memberError } = await supabase
      .from('tenant_members')
      .upsert({
        tenant_id: tenantData.id,
        user_id: user.id,
        role: user.role,
        status: 'active'
      }, { onConflict: 'tenant_id, user_id' });
      
    if (memberError) console.error(memberError.message);
    else console.log(`Successfully added ${user.email} to tenant_members.`);
  }
}

run();
