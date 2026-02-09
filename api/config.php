<?php
/**
 * SAGL - Configuration et connexion base de données
 */

define('DB_PATH', __DIR__ . '/../data/sagl.db');
define('JWT_SECRET', 'changez-moi-en-production-sagl-2026');
define('JWT_EXPIRY', 86400); // 24 heures
define('BASE_URL', ''); // Laisser vide pour auto-détection

/**
 * Obtenir une connexion PDO à la base SQLite
 */
function getDB(): PDO {
    static $db = null;
    if ($db === null) {
        $db = new PDO('sqlite:' . DB_PATH);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $db->exec('PRAGMA journal_mode=WAL');
        $db->exec('PRAGMA foreign_keys=ON');
    }
    return $db;
}

/**
 * Obtenir l'URL de base du site
 */
function getBaseUrl(): string {
    if (BASE_URL !== '') {
        return rtrim(BASE_URL, '/');
    }
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    // Déterminer le sous-dossier
    $scriptDir = dirname($_SERVER['SCRIPT_NAME']);
    $apiPos = strpos($scriptDir, '/api');
    if ($apiPos !== false) {
        $base = substr($scriptDir, 0, $apiPos);
    } else {
        $base = $scriptDir;
    }
    $base = rtrim($base, '/');
    return $protocol . '://' . $host . $base;
}
