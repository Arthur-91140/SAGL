<?php
/**
 * SAGL - Routeur API principal
 *
 * Routes:
 *   /api/auth/login          POST
 *   /api/auth/me             GET
 *   /api/auth/change-password PUT
 *   /api/admin/materials      GET, POST
 *   /api/admin/materials/:id  PUT, DELETE
 *   /api/admin/storages/tree  GET
 *   /api/admin/storages       GET, POST
 *   /api/admin/storages/:id   GET, PUT, DELETE
 *   /api/admin/storages/:id/generate-link  POST
 *   /api/admin/storages/:id/qrcode         GET
 *   /api/admin/storages/:id/template       PUT
 *   /api/admin/storages/:id/stock          PUT
 *   /api/admin/storages/:id/stock/add      POST
 *   /api/admin/inventories    GET
 *   /api/admin/inventories/:id GET
 *   /api/admin/notifications  GET
 *   /api/admin/stats          GET
 *   /api/admin/exports/csv    GET
 *   /api/admin/exports/pdf    GET
 *   /api/inventory/:uniqueLink GET, POST
 */

require_once __DIR__ . '/helpers.php';

handleCors();

// Déterminer la route
$requestUri = $_SERVER['REQUEST_URI'];
$scriptDir = dirname($_SERVER['SCRIPT_NAME']);

// Supprimer le préfixe du répertoire et les query strings
$path = parse_url($requestUri, PHP_URL_PATH);
if ($scriptDir !== '/' && str_starts_with($path, $scriptDir)) {
    $path = substr($path, strlen($scriptDir));
}

// Supprimer le préfixe /api si présent (car on est dans /api/index.php)
$path = preg_replace('#^/api#', '', $path);
$path = '/' . ltrim($path, '/');

$method = getMethod();

// --- Routing ---

// Auth
if ($path === '/auth/login' && $method === 'POST') {
    require __DIR__ . '/auth.php';
    handleLogin();
}
if ($path === '/auth/me' && $method === 'GET') {
    require __DIR__ . '/auth.php';
    handleMe();
}
if ($path === '/auth/change-password' && $method === 'PUT') {
    require __DIR__ . '/auth.php';
    handleChangePassword();
}

// Materials
if ($path === '/admin/materials' && $method === 'GET') {
    require __DIR__ . '/materials.php';
    handleListMaterials();
}
if ($path === '/admin/materials' && $method === 'POST') {
    require __DIR__ . '/materials.php';
    handleCreateMaterial();
}
if (preg_match('#^/admin/materials/(\d+)$#', $path, $m) && $method === 'PUT') {
    require __DIR__ . '/materials.php';
    handleUpdateMaterial((int)$m[1]);
}
if (preg_match('#^/admin/materials/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require __DIR__ . '/materials.php';
    handleDeleteMaterial((int)$m[1]);
}

// Storages
if ($path === '/admin/storages/tree' && $method === 'GET') {
    require __DIR__ . '/storages.php';
    handleStorageTree();
}
if ($path === '/admin/storages' && $method === 'GET') {
    require __DIR__ . '/storages.php';
    handleListStorages();
}
if ($path === '/admin/storages' && $method === 'POST') {
    require __DIR__ . '/storages.php';
    handleCreateStorage();
}
if (preg_match('#^/admin/storages/(\d+)/generate-link$#', $path, $m) && $method === 'POST') {
    require __DIR__ . '/storages.php';
    handleGenerateLink((int)$m[1]);
}
if (preg_match('#^/admin/storages/(\d+)/qrcode$#', $path, $m) && $method === 'GET') {
    require __DIR__ . '/storages.php';
    handleQRCode((int)$m[1]);
}
if (preg_match('#^/admin/storages/(\d+)/template$#', $path, $m) && $method === 'PUT') {
    require __DIR__ . '/storages.php';
    handleUpdateTemplate((int)$m[1]);
}
if (preg_match('#^/admin/storages/(\d+)/stock/add$#', $path, $m) && $method === 'POST') {
    require __DIR__ . '/storages.php';
    handleAddStock((int)$m[1]);
}
if (preg_match('#^/admin/storages/(\d+)/stock$#', $path, $m) && $method === 'PUT') {
    require __DIR__ . '/storages.php';
    handleUpdateStock((int)$m[1]);
}
if (preg_match('#^/admin/storages/(\d+)$#', $path, $m) && $method === 'GET') {
    require __DIR__ . '/storages.php';
    handleGetStorage((int)$m[1]);
}
if (preg_match('#^/admin/storages/(\d+)$#', $path, $m) && $method === 'PUT') {
    require __DIR__ . '/storages.php';
    handleUpdateStorage((int)$m[1]);
}
if (preg_match('#^/admin/storages/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require __DIR__ . '/storages.php';
    handleDeleteStorage((int)$m[1]);
}

// Inventories
if ($path === '/admin/inventories' && $method === 'GET') {
    require __DIR__ . '/inventories.php';
    handleListInventories();
}
if (preg_match('#^/admin/inventories/(\d+)$#', $path, $m) && $method === 'GET') {
    require __DIR__ . '/inventories.php';
    handleGetInventory((int)$m[1]);
}

// Notifications
if ($path === '/admin/notifications' && $method === 'GET') {
    require __DIR__ . '/notifications.php';
    handleNotifications();
}

// Stats
if ($path === '/admin/stats' && $method === 'GET') {
    require __DIR__ . '/stats.php';
    handleStats();
}

// Exports
if ($path === '/admin/exports/csv' && $method === 'GET') {
    require __DIR__ . '/exports.php';
    handleExportCSV();
}
if ($path === '/admin/exports/pdf' && $method === 'GET') {
    require __DIR__ . '/exports.php';
    handleExportPDF();
}

// Public inventory
if (preg_match('#^/inventory/([a-f0-9-]+)$#', $path, $m) && $method === 'GET') {
    require __DIR__ . '/inventory-public.php';
    handleGetPublicInventory($m[1]);
}
if (preg_match('#^/inventory/([a-f0-9-]+)$#', $path, $m) && $method === 'POST') {
    require __DIR__ . '/inventory-public.php';
    handleSubmitInventory($m[1]);
}

// Route non trouvée
errorResponse('Route non trouvée', 404);
