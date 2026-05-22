/**
 * Integration Test Script for Task Manager REST API
 * Verifies authentication flows, validation, role-based controls, task CRUD, and admin actions.
 * 
 * Instructions:
 * 1. Ensure the backend server is running (npm run dev:backend)
 * 2. Run: node verify_api.js
 */

const API_URL = 'http://localhost:5000/api/v1';

async function testAPI() {
  console.log('🚀 Starting API Integration Verification Test...\n');

  const randomId = Math.floor(Math.random() * 10000);
  const userEmail = `user_${randomId}@test.com`;
  const adminEmail = `admin_${randomId}@test.com`;
  const password = 'Password123!';

  let userToken = '';
  let userId = '';
  let adminToken = '';
  let taskId = '';

  // 1. Register User
  console.log(`[1] Registering standard user: ${userEmail}...`);
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password, role: 'USER' })
  });
  const regData = await regRes.json();
  if (regRes.status !== 201) {
    throw new Error(`Failed to register user: ${JSON.stringify(regData)}`);
  }
  userId = regData.data.user.id;
  console.log(`✅ User registered successfully. ID: ${userId}`);

  // 2. Log in User
  console.log('[2] Logging in user...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password })
  });
  const loginData = await loginRes.json();
  if (loginRes.status !== 200) {
    throw new Error(`Failed to log in: ${JSON.stringify(loginData)}`);
  }
  userToken = loginData.data.token;
  console.log('✅ User login successful. Token acquired.');

  // 3. Verify Route Guard (Get Profile)
  console.log('[3] Fetching user profile (/users/me)...');
  const meRes = await fetch(`${API_URL}/users/me`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const meData = await meRes.json();
  if (meRes.status !== 200 || meData.data.user.email !== userEmail) {
    throw new Error(`Profile validation failed: ${JSON.stringify(meData)}`);
  }
  console.log(`✅ Profile fetched successfully. Email matches: ${meData.data.user.email}`);

  // 4. Verify Role Restriction (Fetch all users as USER - should fail)
  console.log('[4] Attempting to access admin-only users list as standard user (expecting 403)...');
  const listUsersRes = await fetch(`${API_URL}/users`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  if (listUsersRes.status === 403) {
    console.log('✅ Access denied (403 Forbidden) as expected.');
  } else {
    throw new Error(`Security breach: User with role USER accessed admin list with status: ${listUsersRes.status}`);
  }

  // 5. Create Task
  console.log('[5] Creating a new workspace task...');
  const createTaskRes = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      title: 'Review PrimeTrade backend design',
      description: 'Analyze security features, schema relations, and modularity.',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 86400000).toISOString() // 1 day from now
    })
  });
  const createTaskData = await createTaskRes.json();
  if (createTaskRes.status !== 201) {
    throw new Error(`Task creation failed: ${JSON.stringify(createTaskData)}`);
  }
  taskId = createTaskData.data.task.id;
  console.log(`✅ Task created successfully. ID: ${taskId}`);

  // 6. Get Tasks List
  console.log('[6] Fetching user tasks list...');
  const getTasksRes = await fetch(`${API_URL}/tasks`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const getTasksData = await getTasksRes.json();
  if (getTasksRes.status !== 200 || getTasksData.data.tasks.length !== 1) {
    throw new Error(`Fetching tasks list failed: ${JSON.stringify(getTasksData)}`);
  }
  console.log(`✅ Retrieved ${getTasksData.data.tasks.length} task(s).`);

  // 7. Update Task
  console.log('[7] Updating task status to IN_PROGRESS...');
  const updateRes = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ status: 'IN_PROGRESS' })
  });
  const updateData = await updateRes.json();
  if (updateRes.status !== 200 || updateData.data.task.status !== 'IN_PROGRESS') {
    throw new Error(`Task update failed: ${JSON.stringify(updateData)}`);
  }
  console.log('✅ Task updated successfully to IN_PROGRESS.');

  // 8. Register Admin User
  console.log(`[8] Registering admin user: ${adminEmail}...`);
  const regAdminRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password, role: 'ADMIN' })
  });
  const regAdminData = await regAdminRes.json();
  if (regAdminRes.status !== 201) {
    throw new Error(`Failed to register admin: ${JSON.stringify(regAdminData)}`);
  }
  console.log(`✅ Admin registered successfully. ID: ${regAdminData.data.user.id}`);

  // 9. Log in Admin
  console.log('[9] Logging in admin...');
  const loginAdminRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password })
  });
  const loginAdminData = await loginAdminRes.json();
  if (loginAdminRes.status !== 200) {
    throw new Error(`Failed to log in admin: ${JSON.stringify(loginAdminData)}`);
  }
  adminToken = loginAdminData.data.token;
  console.log('✅ Admin login successful. Token acquired.');

  // 10. Fetch users as Admin
  console.log('[10] Fetching all users as Admin...');
  const adminUsersRes = await fetch(`${API_URL}/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminUsersData = await adminUsersRes.json();
  if (adminUsersRes.status !== 200 || adminUsersData.data.users.length < 2) {
    throw new Error(`Admin failed to fetch users list: ${JSON.stringify(adminUsersData)}`);
  }
  console.log(`✅ Admin successfully retrieved users. Total registered users: ${adminUsersData.data.users.length}`);

  // 11. Fetch all tasks as Admin (should include user's task)
  console.log('[11] Fetching all tasks as Admin...');
  const adminTasksRes = await fetch(`${API_URL}/tasks`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminTasksData = await adminTasksRes.json();
  if (adminTasksRes.status !== 200) {
    throw new Error(`Admin failed to retrieve tasks list: ${JSON.stringify(adminTasksData)}`);
  }
  const foundTask = adminTasksData.data.tasks.find(t => t.id === taskId);
  if (!foundTask) {
    throw new Error(`Admin tasks list did not include the user task of ID ${taskId}`);
  }
  console.log(`✅ Admin successfully retrieved all tasks. Included user task ID: ${foundTask.id} (Owner: ${foundTask.user.email})`);

  // 12. Delete User Task as Admin
  console.log(`[12] Deleting user's task as Admin. Task ID: ${taskId}...`);
  const adminDelRes = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminDelData = await adminDelRes.json();
  if (adminDelRes.status !== 200) {
    throw new Error(`Admin task deletion failed: ${JSON.stringify(adminDelData)}`);
  }
  console.log('✅ Admin task deletion successful.');

  // 13. Verify task deletion on user side
  console.log('[13] Re-fetching tasks list on user side (expecting empty list)...');
  const userCheckRes = await fetch(`${API_URL}/tasks`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const userCheckData = await userCheckRes.json();
  if (userCheckRes.status !== 200 || userCheckData.data.tasks.some(t => t.id === taskId)) {
    throw new Error(`Verification failed. User still sees deleted task: ${JSON.stringify(userCheckData)}`);
  }
  console.log('✅ User tasks list is empty. Deletion confirmed.');

  console.log('\n⭐ Integration Verification Complete! All tests PASSED successfully. ⭐');
}

testAPI().catch((err) => {
  console.error('\n❌ Verification failed with error:');
  console.error(err);
  process.exit(1);
});
