const keycloak = new Keycloak({
    url: 'http://localhost:8080',
    realm: 'desarealm',
    clientId: 'laravel-app'
});

keycloak.init({
    onLoad: 'login-required',
    checkLoginIframe: false, 
    pkceMethod: 'S256' 
})
.then(authenticated => {
    if (!authenticated) {
        console.log('Not authenticated, redirecting to login');
        keycloak.login();
        return;
    }
    
    loadUserAndPermissions();
})
.catch(err => {
    console.error('Keycloak initialization failed:', err);
    window.location.href = window.location.origin + window.location.pathname;
});

function loadUserAndPermissions() {
    const realmRoles = keycloak.realmAccess?.roles || [];
    const clientRoles = keycloak.resourceAccess?.['laravel-app']?.roles || [];
    
    let allClientRoles = [];
    for (const clientName in keycloak.resourceAccess || {}) {
        if (keycloak.resourceAccess[clientName]?.roles) {
            allClientRoles = [...allClientRoles, ...keycloak.resourceAccess[clientName].roles];
        }
    }
    
    const allRoles = [...realmRoles, ...clientRoles, ...allClientRoles];
    
    const canDownload = allRoles.includes('file-download');
    const canRestrict = allRoles.includes('file-restrict');
    const canDelete = allRoles.includes('file-delete');
    
    console.log(`Permissions: Download=${canDownload}, Restrict=${canRestrict}, Delete=${canDelete}`);

    keycloak.loadUserInfo().then(user => {
        console.log('User info loaded:', user);
        
        let displayName = 'User';
        if (user.given_name && user.family_name) {
            displayName = `${user.given_name} ${user.family_name}`;
        } else if (user.preferred_username) {
            displayName = user.preferred_username;
        } else if (user.name) {
            displayName = user.name;
        }
        
        document.getElementById('username').textContent = displayName;
        
        const accountLink = document.querySelector('a[href*="account"]');
        if (accountLink) {
            accountLink.href = keycloak.createAccountUrl();
        }
    }).catch(err => {
        console.error('Failed to load user info:', err);
        document.getElementById('username').textContent = 'Profile';
    });

    applyPermissions({
        canDownload: canDownload,
        canRestrict: canRestrict,
        canDelete: canDelete
    });
    
    setupTokenRefresh();
}

function setupTokenRefresh() {
    const refreshInterval = setInterval(() => {
        if (keycloak.isTokenExpired(30)) { 
            keycloak.updateToken(30)
                .then(refreshed => {
                    if (refreshed) {
                        console.log('Token refreshed successfully');
                    }
                })
                .catch(err => {
                    console.error('Failed to refresh token:', err);
                    clearInterval(refreshInterval);
                    logout();
                });
        }
    }, 5000);
}

function applyPermissions({ canDownload, canRestrict, canDelete }) {
    
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadText = document.getElementById('download-content');
    if (downloadBtn) {
        downloadBtn.style.display = canDownload ? 'inline-block' : 'none';
        if (canDownload) {
            downloadBtn.onclick = () => {
                alert('Download functionality would be triggered here');
            };
        }
    }
    if (downloadText) {
        downloadText.textContent = canDownload
            ? 'You are allowed to download files.'
            : 'You do not have permission to download files.';
        downloadText.className = canDownload ? 'text-success' : 'text-danger';
    }

    const restrictBtn = document.getElementById('restrictBtn');
    const restrictText = document.getElementById('access-function');
    if (restrictBtn) {
        restrictBtn.style.display = canRestrict ? 'inline-block' : 'none';
        if (canRestrict) {
            restrictBtn.onclick = () => {
                alert('Restricted functionality would be triggered here');
            };
        }
    }
    if (restrictText) {
        restrictText.textContent = canRestrict
            ? 'You have access to restricted functionality.'
            : 'You do not have access to this functionality.';
        restrictText.className = canRestrict ? 'text-success' : 'text-danger';
    }

    const deleteBtn = document.getElementById('deleteBtn');
    const deleteText = document.getElementById('delete-file');
    if (deleteBtn) {
        deleteBtn.style.display = canDelete ? 'inline-block' : 'none';
        if (canDelete) {
            deleteBtn.onclick = () => {
                if (confirm('Are you sure you want to delete?')) {
                    alert('Delete functionality would be triggered here');
                }
            };
        }
    }
    if (deleteText) {
        deleteText.textContent = canDelete
            ? 'You have permission to delete files. Proceed with caution.'
            : 'You do not have permission to delete files. Please contact an administrator.';
        deleteText.className = canDelete ? 'text-success' : 'text-danger';
    }
}

function logout() {
    console.log('Initiating logout...');
    
    localStorage.clear();
    sessionStorage.clear();
    
    keycloak.logout({
        redirectUri: window.location.origin + window.location.pathname
    }).then(() => {
        console.log('Logout completed successfully');
    }).catch((error) => {
        console.error('Keycloak logout error:', error);
        window.location.href = window.location.origin + window.location.pathname;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const logoutLink = document.querySelector('.nav-link[onclick*="logout"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});
