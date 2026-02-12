/**
 * SAGL - Client API
 */

const API_BASE = (() => {
    // Déterminer le chemin de base dynamiquement
    const path = window.location.pathname;
    // Chercher /admin/ ou /i/ dans le path pour déterminer la racine
    const adminIdx = path.indexOf('/admin');
    const invIdx = path.indexOf('/i/');
    let base = '';
    if (adminIdx !== -1) {
        base = path.substring(0, adminIdx);
    } else if (invIdx !== -1) {
        base = path.substring(0, invIdx);
    } else {
        // Fallback: chercher index.php ou racine
        const parts = path.split('/');
        parts.pop(); // Remove filename
        base = parts.join('/');
    }
    return base + '/api/index.php';
})();

function getToken() {
    return localStorage.getItem('sagl_token');
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    const response = await fetch(API_BASE + endpoint, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        localStorage.removeItem('sagl_token');
        if (window.location.pathname.includes('/admin')) {
            window.location.href = getBasePath() + '/admin/login.html';
        }
        throw new Error('Non autorisé');
    }

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur ' + response.status);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
        return response.blob();
    }

    return response.json();
}

function getBasePath() {
    const path = window.location.pathname;
    const adminIdx = path.indexOf('/admin');
    const invIdx = path.indexOf('/i/');
    if (adminIdx !== -1) return path.substring(0, adminIdx);
    if (invIdx !== -1) return path.substring(0, invIdx);
    return '';
}

// --- Auth ---
const auth = {
    login: (username, password) =>
        request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),
    me: () => request('/auth/me'),
    changePassword: (currentPassword, newPassword) =>
        request('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        }),
};

// --- Matériels ---
const materials = {
    list: () => request('/admin/materials'),
    create: (data) =>
        request('/admin/materials', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id, data) =>
        request('/admin/materials/' + id, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    delete: (id) =>
        request('/admin/materials/' + id, { method: 'DELETE' }),
};

// --- Stockages ---
const storages = {
    tree: () => request('/admin/storages/tree'),
    list: () => request('/admin/storages'),
    get: (id) => request('/admin/storages/' + id),
    create: (data) =>
        request('/admin/storages', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id, data) =>
        request('/admin/storages/' + id, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    delete: (id) =>
        request('/admin/storages/' + id, { method: 'DELETE' }),
    generateLink: (id) =>
        request('/admin/storages/' + id + '/generate-link', {
            method: 'POST',
        }),
    getQRCode: (id) =>
        request('/admin/storages/' + id + '/qrcode'),
    updateTemplate: (id, items) =>
        request('/admin/storages/' + id + '/template', {
            method: 'PUT',
            body: JSON.stringify({ items }),
        }),
    updateStock: (id, items) =>
        request('/admin/storages/' + id + '/stock', {
            method: 'PUT',
            body: JSON.stringify({ items }),
        }),
    addStock: (id, data) =>
        request('/admin/storages/' + id + '/stock/add', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// --- Inventaires (admin) ---
const inventories = {
    list: (params) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return request('/admin/inventories' + query);
    },
    get: (id) => request('/admin/inventories/' + id),
};

// --- Notifications ---
const notifications = {
    get: () => request('/admin/notifications'),
};

// --- Statistiques ---
const stats = {
    get: (params) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return request('/admin/stats' + query);
    },
};

// --- Exports ---
const exports_ = {
    csv: (storageId) => {
        const query = storageId ? '?storageId=' + storageId : '';
        return request('/admin/exports/csv' + query);
    },
    pdf: (storageId) => {
        const query = storageId ? '?storageId=' + storageId : '';
        return request('/admin/exports/pdf' + query);
    },
};

// --- Inventaire public ---
const publicInventory = {
    get: (uniqueLink) => request('/inventory/' + uniqueLink),
    submit: (uniqueLink, data) =>
        request('/inventory/' + uniqueLink, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};
