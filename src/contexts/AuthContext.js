import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import keycloak from '../config/keycloak';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState({
        canDownload: false,
        canRestrict: false,
        canDelete: false
    });
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    const loadUserInfo = useCallback(async () => {
        try {
            const userInfo = await keycloak.loadUserInfo();
            setUser(userInfo);
            return userInfo;
        } catch (error) {
            console.error('Failed to load user info:', error);
            return null;
        }
    }, []);

    const getRoles = useCallback(() => {
        const realmRoles = keycloak.realmAccess?.roles || [];
        const clientRoles = keycloak.resourceAccess?.['laravel-app']?.roles || [];
        
        let allClientRoles = [];
        for (const clientName in keycloak.resourceAccess || {}) {
            if (keycloak.resourceAccess[clientName]?.roles) {
                allClientRoles = [...allClientRoles, ...keycloak.resourceAccess[clientName].roles];
            }
        }
        
        const allRoles = [...realmRoles, ...clientRoles, ...allClientRoles];
        setRoles(allRoles);
        
        const canDownload = allRoles.includes('file-download');
        const canRestrict = allRoles.includes('file-restrict');
        const canDelete = allRoles.includes('file-delete');
        
        setPermissions({
            canDownload,
            canRestrict,
            canDelete
        });
        
        console.log('User roles:', allRoles);
        return allRoles;
    }, []);

    const setupTokenRefresh = useCallback(() => {
        const refreshInterval = setInterval(() => {
            if (keycloak.isTokenExpired(30)) {
                keycloak.updateToken(30)
                    .then(refreshed => {
                        if (refreshed) {
                            console.log('Token refreshed successfully');
                            setToken(keycloak.token);
                        }
                    })
                    .catch(err => {
                        console.error('Failed to refresh token:', err);
                        clearInterval(refreshInterval);
                        logout();
                    });
            }
        }, 5000);
        
        return refreshInterval;
    }, []);

    const login = () => {
        keycloak.login();
    };

    const logout = useCallback(() => {
        console.log('Initiating logout...');
        localStorage.clear();
        sessionStorage.clear();
        
        keycloak.logout({
            redirectUri: window.location.origin
        }).then(() => {
            console.log('Logout completed successfully');
            setAuthenticated(false);
            setUser(null);
            setRoles([]);
            setToken(null);
        }).catch((error) => {
            console.error('Keycloak logout error:', error);
            window.location.href = window.location.origin;
        });
    }, []);

    useEffect(() => {
        const initKeycloak = async () => {
            try {
                const authenticated = await keycloak.init({
                    onLoad: 'login-required',
                    checkLoginIframe: false,
                    pkceMethod: 'S256'
                });
                
                if (authenticated) {
                    setAuthenticated(true);
                    setToken(keycloak.token);
                    await loadUserInfo();
                    getRoles();
                    setupTokenRefresh();
                } else {
                    console.log('Not authenticated, redirecting to login');
                    keycloak.login();
                }
            } catch (error) {
                console.error('Keycloak initialization failed:', error);
            } finally {
                setLoading(false);
            }
        };
        
        initKeycloak();
    }, [loadUserInfo, getRoles, setupTokenRefresh]);

    const value = {
        authenticated,
        user,
        roles,
        permissions,
        loading,
        token,
        login,
        logout,
        keycloak
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
