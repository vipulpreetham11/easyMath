let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initSuperAdmin, 600);
});

async function initSuperAdmin() {
    // ACCESS CONTROL â€” direct Supabase check
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) { window.location.href = '../login.html'; return; }
    // Auth confirmed - unhide page
    document.body.classList.remove('page-hidden');
    document.getElementById('auth-loader')?.remove();
    // Auth confirmed - unhide page
    document.body.classList.remove('page-hidden');
    document.getElementById('auth-loader')?.remove();

    const { data: profile } = await window.supabaseClient
        .from('users').select('role, name').eq('id', session.user.id).single();

    if (!profile || profile.role !== 'super_admin') {
        document.body.innerHTML = '<h2>Access Denied</h2>'; return;
    }

    // Display user name
    document.querySelectorAll('.user-name-display').forEach(el => {
        el.textContent = profile.name || 'Super Admin';
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.supabaseClient.auth.signOut();
        window.location.href = '../login.html';
    });

    // Load everything in parallel
    loadPlatformStats();
    loadUsers();
    loadSettings();
    loadRecentRegistrations();
}

// ==================== 1. Platform Stats ====================

async function loadPlatformStats() {
    // Students count
    const { count: studentCount } = await window.supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

    document.getElementById('s-students').textContent = studentCount || 0;

    // Active last 7 days â€” from users table (last_sign_in is in auth.users, but we use users table created_at as fallback)
    // We'll query users who have logged in recently by checking if they have test_attempts in last 7 days as a proxy
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: activeCount } = await window.supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .gte('updated_at', sevenDaysAgo.toISOString());

    document.getElementById('s-active').textContent = activeCount || 0;

    // Subjects count
    const { count: subCount } = await window.supabaseClient
        .from('subjects')
        .select('*', { count: 'exact', head: true });

    document.getElementById('s-subjects').textContent = subCount || 0;

    // Chapters count
    const { count: chapCount } = await window.supabaseClient
        .from('chapters')
        .select('*', { count: 'exact', head: true });

    document.getElementById('s-chapters').textContent = chapCount || 0;

    // Questions count
    const { count: qCount } = await window.supabaseClient
        .from('questions')
        .select('*', { count: 'exact', head: true });

    document.getElementById('s-questions').textContent = qCount || 0;
}

// ==================== 2. User Management ====================

async function loadUsers() {
    const { data: users, error } = await window.supabaseClient
        .from('users')
        .select('id, name, email, role, is_active, created_at')
        .order('created_at', { ascending: false });

    if (error || !users) {
        document.getElementById('user-tbody').innerHTML = '<tr><td colspan="5" style="color: var(--error-color);">Failed to load users.</td></tr>';
        return;
    }

    allUsers = users;
    renderUsers(users);
}

function renderUsers(users) {
    const tbody = document.getElementById('user-tbody');

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="color: var(--text-secondary); text-align: center;">No users found.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => {
        const date = new Date(u.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });

        const isActive = u.is_active !== false; // default to true

        return `
            <tr>
                <td style="font-weight: 500;">${u.name || 'No Name'}</td>
                <td style="color: var(--text-secondary);">${u.email || '-'}</td>
                <td>
                    <select class="role-select" onchange="changeRole('${u.id}', this.value)">
                        <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                    </select>
                </td>
                <td>
                    <button class="toggle-btn ${isActive ? 'active' : 'inactive'}" onclick="toggleActive('${u.id}', ${!isActive})">
                        ${isActive ? 'âœ“ Active' : 'âœ— Inactive'}
                    </button>
                </td>
                <td style="color: var(--text-secondary);">${date}</td>
            </tr>
        `;
    }).join('');
}

function filterUsers() {
    const query = document.getElementById('user-search').value.toLowerCase().trim();
    if (!query) {
        renderUsers(allUsers);
        return;
    }

    const filtered = allUsers.filter(u =>
        (u.name || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query)
    );
    renderUsers(filtered);
}

async function changeRole(userId, newRole) {
    const { error } = await window.supabaseClient
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) {
        showToast('Failed to update role', 'error');
    } else {
        showToast(`Role updated to ${newRole}`, 'success');
        // Update local cache
        const u = allUsers.find(u => u.id === userId);
        if (u) u.role = newRole;
    }
}

async function toggleActive(userId, newState) {
    const { error } = await window.supabaseClient
        .from('users')
        .update({ is_active: newState })
        .eq('id', userId);

    if (error) {
        showToast('Failed to update status', 'error');
    } else {
        showToast(newState ? 'User activated' : 'User deactivated', 'success');
        // Refresh
        loadUsers();
    }
}

// ==================== 3. Global Settings ====================

async function loadSettings() {
    // Fetch from settings table
    const { data: rows } = await window.supabaseClient
        .from('settings')
        .select('key, value');

    if (rows) {
        rows.forEach(r => {
            if (r.key === 'course_active') {
                document.getElementById('setting-course-active').checked = r.value === 'true' || r.value === true;
            }
            if (r.key === 'course_price') {
                document.getElementById('setting-course-price').value = r.value || '';
            }
        });
    }
}

async function saveSetting(key, value) {
    const { error } = await window.supabaseClient
        .from('settings')
        .upsert({ key, value: String(value) }, { onConflict: 'key' });

    if (error) {
        showToast(`Failed to save ${key}`, 'error');
    } else {
        showToast(`${key} updated!`, 'success');
    }
}

async function saveAllSettings() {
    const statusEl = document.getElementById('settings-status');
    statusEl.textContent = 'Saving...';

    const courseActive = document.getElementById('setting-course-active').checked;
    const coursePrice = document.getElementById('setting-course-price').value;

    const settings = [
        { key: 'course_active', value: String(courseActive) },
        { key: 'course_price', value: String(coursePrice) }
    ];

    const { error } = await window.supabaseClient
        .from('settings')
        .upsert(settings, { onConflict: 'key' });

    if (error) {
        statusEl.textContent = 'âŒ Failed to save settings.';
        statusEl.style.color = '#ef4444';
        showToast('Failed to save settings', 'error');
    } else {
        statusEl.textContent = 'âœ… Settings saved successfully!';
        statusEl.style.color = '#10b981';
        showToast('All settings saved!', 'success');
    }
}

// ==================== 4. Recent Registrations ====================

async function loadRecentRegistrations() {
    const { data: recent, error } = await window.supabaseClient
        .from('users')
        .select('name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    const list = document.getElementById('reg-list');

    if (error || !recent || recent.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-secondary);">No registrations yet.</div>';
        return;
    }

    list.innerHTML = recent.map(u => {
        const date = new Date(u.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });

        return `
            <div class="reg-item">
                <div>
                    <div class="reg-name">${u.name || 'No Name'}</div>
                    <div class="reg-email">${u.email || '-'}</div>
                </div>
                <div class="reg-date">${date}</div>
            </div>
        `;
    }).join('');
}

// ==================== Toast ====================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}


