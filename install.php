<?php
/**
 * SAGL - Script d'installation
 * Crée la base de données SQLite et le compte admin par défaut
 */

$dbPath = __DIR__ . '/data/sagl.db';
$defaultPassword = 'admin';

if (php_sapi_name() !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
}

echo "=== SAGL - Installation ===\n\n";

// Vérifier que le dossier data existe et est accessible en écriture
if (!is_dir(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
    echo "[OK] Dossier data/ créé\n";
}

try {
    $db = new PDO('sqlite:' . $dbPath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA journal_mode=WAL');
    $db->exec('PRAGMA foreign_keys=ON');

    // Créer les tables
    $db->exec('
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ');
    echo "[OK] Table admin créée\n";

    $db->exec('
        CREATE TABLE IF NOT EXISTS material (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            alert_threshold INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ');
    echo "[OK] Table material créée\n";

    $db->exec('
        CREATE TABLE IF NOT EXISTS storage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            parent_id INTEGER,
            is_global_stock INTEGER DEFAULT 0,
            unique_link TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES storage(id) ON DELETE CASCADE
        )
    ');
    echo "[OK] Table storage créée\n";

    $db->exec('
        CREATE TABLE IF NOT EXISTS storage_template_item (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            storage_id INTEGER NOT NULL,
            material_id INTEGER NOT NULL,
            expected_quantity INTEGER NOT NULL,
            FOREIGN KEY (storage_id) REFERENCES storage(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE CASCADE,
            UNIQUE(storage_id, material_id)
        )
    ');
    echo "[OK] Table storage_template_item créée\n";

    $db->exec('
        CREATE TABLE IF NOT EXISTS stock_item (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            storage_id INTEGER NOT NULL,
            material_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 0,
            expiration_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (storage_id) REFERENCES storage(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE CASCADE
        )
    ');
    echo "[OK] Table stock_item créée\n";

    $db->exec('
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            storage_id INTEGER NOT NULL,
            rescuer_name TEXT NOT NULL,
            post_name TEXT,
            post_number TEXT,
            type TEXT NOT NULL,
            greeting TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (storage_id) REFERENCES storage(id)
        )
    ');
    echo "[OK] Table inventory créée\n";

    $db->exec('
        CREATE TABLE IF NOT EXISTS inventory_item (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inventory_id INTEGER NOT NULL,
            storage_id INTEGER NOT NULL,
            material_id INTEGER NOT NULL,
            expected INTEGER NOT NULL,
            quantity_found INTEGER NOT NULL,
            quantity_added INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
            FOREIGN KEY (storage_id) REFERENCES storage(id),
            FOREIGN KEY (material_id) REFERENCES material(id)
        )
    ');
    echo "[OK] Table inventory_item créée\n";

    // Créer l'admin par défaut
    $stmt = $db->prepare('SELECT id FROM admin WHERE username = ?');
    $stmt->execute(['admin']);
    if (!$stmt->fetch()) {
        $hash = password_hash($defaultPassword, PASSWORD_BCRYPT);
        $stmt = $db->prepare('INSERT INTO admin (username, password) VALUES (?, ?)');
        $stmt->execute(['admin', $hash]);
        echo "[OK] Admin par défaut créé (identifiant: admin / mot de passe: admin)\n";
    } else {
        echo "[OK] Admin par défaut existe déjà\n";
    }

    // Créer la réserve locale
    $stmt = $db->prepare('SELECT id FROM storage WHERE is_global_stock = 1');
    $stmt->execute();
    if (!$stmt->fetch()) {
        $stmt = $db->prepare('INSERT INTO storage (name, is_global_stock) VALUES (?, 1)');
        $stmt->execute(['Réserve locale']);
        echo "[OK] Réserve locale créée\n";
    } else {
        echo "[OK] Réserve locale existe déjà\n";
    }

    echo "\n=== Installation terminée avec succès ===\n";
    echo "Vous pouvez maintenant accéder à l'application.\n";
    echo "Identifiants par défaut : admin / admin\n";

} catch (PDOException $e) {
    echo "[ERREUR] " . $e->getMessage() . "\n";
    exit(1);
}
