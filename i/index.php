<?php
/**
 * SAGL - Routeur pour les pages d'inventaire public
 * Gère les URLs de type /i/{uniqueLink}, /i/{uniqueLink}/form, /i/{uniqueLink}/complete
 */

$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);

// Extraire le chemin relatif après /i/
$basePath = dirname($_SERVER['SCRIPT_NAME']);
$relativePath = substr($path, strlen($basePath));
$relativePath = '/' . trim($relativePath, '/');

// Déterminer la page à afficher
if (preg_match('#^/([a-f0-9-]+)/complete$#', $relativePath)) {
    include __DIR__ . '/complete.html';
} elseif (preg_match('#^/([a-f0-9-]+)/form$#', $relativePath)) {
    include __DIR__ . '/form.html';
} elseif (preg_match('#^/([a-f0-9-]+)$#', $relativePath)) {
    include __DIR__ . '/start.html';
} else {
    http_response_code(404);
    echo '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Page non trouvée</title></head><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif"><div style="text-align:center"><h1>404</h1><p>Lien d\'inventaire invalide</p></div></body></html>';
}
