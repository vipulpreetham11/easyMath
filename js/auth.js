let currentUser = null;
window.currentUser = null;

async function fetchUserProfile(userId) {
    const { data: profile, error } = await window.supabaseClient
        .from('users').select('*').eq('id', userId).single();
    if (error) return { role: 'student', id: userId };
    return profile;
}

async function checkSession() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) return await fetchUserProfile(session.user.id);
    return null;
}

function hideLoader() {
    document.body.classList.remove('page-hidden');
    const el = document.getElementById('auth-loader');
    if (el) el.remove();
}

function redirectByRole(role) {
    if (role === 'super_admin') window.location.href = '/super-admin/index.html';
    else if (role === 'admin') window.location.href = '/admin/index.html';
    else window.location.href = '/app.html';
}

function updateUserUI(profile) {
    document.querySelectorAll('.user-name-display')
        .forEach(el => el.textContent = profile.name || profile.email || 'User');
    document.querySelectorAll('.user-role-display')
        .forEach(el => el.textContent =
            profile.role === 'super_admin' ? 'Super Admin' :
                profile.role === 'admin' ? 'Admin' : 'Student Account');
    document.querySelectorAll('.user-avatar-initial')
        .forEach(el => el.textContent =
            (profile.name || 'U').charAt(0).toUpperCase());
    hideLoader();
}

async function signInWithGoogle() {
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/app.html' }
    });
    if (error) console.error(error);
}

async function signOut() {
    await window.supabaseClient.auth.signOut();
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const isLogin = path.includes('login.html') || path.includes('index.html') || path === '/' || (path.endsWith('/') && !path.includes('app.html'));
    const isAdmin = path.includes('/admin/');
    const isSuperAdmin = path.includes('/super-admin/');
    const isStudent = path.includes('app.html') || path.includes('notes.html') || path.includes('practice.html') || path.includes('pyq.html') || path.includes('test.html') || path.includes('test-result.html') || path.includes('performance.html');

    const profile = await checkSession();

    if (isLogin) {
        hideLoader();
        if (profile) redirectByRole(profile.role);
    } else if (profile) {
        // Role protection
        if (isAdmin && profile.role !== 'admin' && profile.role !== 'super_admin') {
            window.location.href = '/app.html'; return;
        }
        if (isSuperAdmin && profile.role !== 'super_admin') {
            window.location.href = '/app.html'; return;
        }
        currentUser = profile;
        window.currentUser = profile;
        updateUserUI(profile);
        // Trigger page-specific load function if it exists
        if (typeof loadDashboard === 'function') loadDashboard();
        if (typeof loadDashboardStats === 'function') loadDashboardStats();
        if (typeof loadSubjects === 'function') loadSubjects();
    } else {
        if (!isLogin) window.location.href = '/login.html';
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); signOut(); });

    // Google login button
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) googleBtn.addEventListener('click', signInWithGoogle);
});
