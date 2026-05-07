import Keycloak from 'keycloak-js';

const keycloakConfig = {
    url: 'http://localhost:8088',
    realm: 'desarealm',
    clientId: 'laravel-app'
};

// Singleton pattern - ensure only one instance
let keycloakInstance = null;

const getKeycloakInstance = () => {
    if (!keycloakInstance) {
        keycloakInstance = new Keycloak(keycloakConfig);
    }
    return keycloakInstance;
};

const keycloak = getKeycloakInstance();

export default keycloak;
