// www.lexie.xyz account backend (Phalcon, site key apiwww_lexie_xyz) - the
// same API the web app's password manager uses.
const settings = {
    API_URL: 'https://apiwww.lexie.xyz/',
    SITE_URL: 'https://www.lexie.xyz/',

    API_ENDPOINT_LOGIN: 'users/login',
    API_ENDPOINT_LOGOUT: 'users/logout',
    API_ENDPOINT_REGISTER: 'users/register',
    API_ENDPOINT_REGISTER_YEAR: 'users/register/years',
    API_ENDPOINT_USER_RECOVER_PASSWORD: 'users/recover',
    API_ENDPOINT_PASSWORDS_VERSIONS: 'lexie/passwords/versions',
    API_ENDPOINT_PASSWORDS_VERSIONS_LATEST: 'lexie/passwords/versions/latest',

    // Which build this is (VITE_BROWSER, set by `npm run build:firefox`; Vite
    // exposes VITE_* env vars) - stored with each
    // saved version so the versions list shows where it was saved from.
    BROWSER: (import.meta.env.VITE_BROWSER === 'firefox' ? 'firefox' : 'chrome') as 'chrome' | 'firefox',
}

export default settings
