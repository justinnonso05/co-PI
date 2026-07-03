import process from 'process';
const API_URL = 'http://localhost:3000/api';

async function runTest() {
  console.log('🚀 Starting API End-to-End Test...\n');

  try {
    // 1. Register Alice
    console.log('1. Registering Alice...');
    const emailAlice = `alice.${Date.now()}@example.com`;
    const resAliceReg = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAlice, password: 'password123', firstName: 'Alice', lastName: 'Smith' })
    });
    const aliceData = await resAliceReg.json();
    if (!resAliceReg.ok) throw new Error(aliceData.message || 'Failed to register Alice');
    console.log('✅ Alice registered.');

    // 2. Login Alice
    console.log('2. Logging in Alice...');
    const resAliceLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAlice, password: 'password123' })
    });
    const aliceLoginData = await resAliceLogin.json();
    if (!resAliceLogin.ok) throw new Error(aliceLoginData.message || 'Failed to login Alice');
    const tokenAlice = aliceLoginData.token;
    const userIdAlice = aliceLoginData.user.id;
    console.log('✅ Alice logged in.');

    // 3. Register Bob
    console.log('3. Registering Bob...');
    const emailBob = `bob.${Date.now()}@example.com`;
    const resBobReg = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailBob, password: 'password123', firstName: 'Bob', lastName: 'Jones' })
    });
    const bobData = await resBobReg.json();
    if (!resBobReg.ok) throw new Error(bobData.message || 'Failed to register Bob');
    const userIdBob = bobData.userId;
    console.log('✅ Bob registered.');

    // 4. Login Bob
    const resBobLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailBob, password: 'password123' })
    });
    const tokenBob = (await resBobLogin.json()).token;

    // 5. Alice creates a Project
    console.log('5. Alice creates a Project...');
    const resProject = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAlice}` },
      body: JSON.stringify({ title: 'Cancer Research Alpha', description: 'Testing novel compounds.' })
    });
    const projectData = await resProject.json();
    if (!resProject.ok) throw new Error(projectData.message || 'Failed to create project');
    const projectId = projectData.project.id;
    console.log('✅ Project created:', projectId);

    // 6. Alice adds Bob to the Project as CO_INVESTIGATOR
    console.log('6. Alice invites Bob to the project...');
    const resInvite = await fetch(`${API_URL}/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAlice}` },
      body: JSON.stringify({ targetUserId: userIdBob, role: 'CO_INVESTIGATOR' })
    });
    if (!resInvite.ok) throw new Error('Failed to invite Bob');
    console.log('✅ Bob added as CO_INVESTIGATOR.');

    // 7. Alice creates a Task for Bob
    console.log('7. Alice creates a task for Bob...');
    const resTask = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAlice}` },
      body: JSON.stringify({ title: 'Analyze sample A', dueDate: '2026-12-31T00:00:00.000Z', assignedUserId: userIdBob })
    });
    const taskData = await resTask.json();
    if (!resTask.ok) throw new Error(taskData.message || 'Failed to create task');
    const taskId = taskData.task.id;
    console.log('✅ Task created:', taskId);

    // 8. Bob completes the Task
    console.log('8. Bob marks the task as completed...');
    const resTaskUpdate = await fetch(`${API_URL}/tasks/${taskId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenBob}` },
      body: JSON.stringify({ isCompleted: true })
    });
    if (!resTaskUpdate.ok) throw new Error('Failed to update task status');
    console.log('✅ Task marked as completed by Bob.');

    // 9. Alice logs an Output
    console.log('9. Alice logs a Research Output...');
    const resOutput = await fetch(`${API_URL}/projects/${projectId}/outputs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAlice}` },
      body: JSON.stringify({ outputType: 'JOURNAL', citation: 'Smith et al. 2026' })
    });
    if (!resOutput.ok) throw new Error('Failed to log output');
    console.log('✅ Output logged.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The API architecture is rock solid.');
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

runTest();
