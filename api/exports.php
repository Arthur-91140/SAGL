<?php
/**
 * SAGL - API Exports (CSV/PDF)
 */

function handleExportCSV(): void {
    requireAuth();
    $db = getDB();
    $storageId = $_GET['storageId'] ?? null;

    $where = '';
    $params = [];
    if ($storageId) {
        $where = 'WHERE si.storage_id = ?';
        $params[] = (int)$storageId;
    }

    $stmt = $db->prepare("
        SELECT si.*, m.name as material_name, s.name as storage_name
        FROM stock_item si
        JOIN material m ON m.id = si.material_id
        JOIN storage s ON s.id = si.storage_id
        $where
        ORDER BY s.name ASC, m.name ASC
    ");
    $stmt->execute($params);
    $items = $stmt->fetchAll();

    $csv = "\xEF\xBB\xBF"; // BOM UTF-8
    $csv .= "Stockage;Matériel;Quantité;Date de péremption\n";

    foreach ($items as $item) {
        $expDate = $item['expiration_date'] ? date('d/m/Y', strtotime($item['expiration_date'])) : '';
        $csv .= '"' . str_replace('"', '""', $item['storage_name']) . '";"' .
                str_replace('"', '""', $item['material_name']) . '";' .
                $item['quantity'] . ';"' . $expDate . "\"\n";
    }

    $filename = 'stock-sagl-' . date('Y-m-d') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    echo $csv;
    exit;
}

function handleExportPDF(): void {
    requireAuth();
    $db = getDB();
    $storageId = $_GET['storageId'] ?? null;

    if ($storageId) {
        $stmt = $db->prepare('
            SELECT s.name as storage_name, si.quantity, m.name as material_name, si.expiration_date
            FROM stock_item si
            JOIN material m ON m.id = si.material_id
            JOIN storage s ON s.id = si.storage_id
            WHERE si.storage_id = ?
            ORDER BY m.name ASC
        ');
        $stmt->execute([(int)$storageId]);
        $items = $stmt->fetchAll();
        $storages = [];
        if ($items) {
            $storages[$items[0]['storage_name']] = $items;
        }
    } else {
        $allItems = $db->query('
            SELECT s.name as storage_name, si.quantity, m.name as material_name, si.expiration_date
            FROM stock_item si
            JOIN material m ON m.id = si.material_id
            JOIN storage s ON s.id = si.storage_id
            ORDER BY s.name ASC, m.name ASC
        ')->fetchAll();

        $storages = [];
        foreach ($allItems as $item) {
            $storages[$item['storage_name']][] = $item;
        }
    }

    // Générer un PDF simple en HTML -> navigateur le convertira
    // Pour un serveur basique sans dépendances, on génère un HTML formaté pour l'impression
    $filename = 'stock-sagl-' . date('Y-m-d') . '.pdf';

    // Comme on ne peut pas utiliser pdfkit (Node), on génère un document HTML
    // que le navigateur peut imprimer en PDF via window.print()
    // Alternative : générer un vrai PDF minimal

    header('Content-Type: text/html; charset=utf-8');
    header('Content-Disposition: inline; filename="' . $filename . '"');

    $date = date('d/m/Y');
    $time = date('H:i:s');

    echo '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">';
    echo '<title>SAGL - État des stocks</title>';
    echo '<style>';
    echo 'body{font-family:Arial,sans-serif;margin:40px;color:#333}';
    echo 'h1{text-align:center;font-size:22px;margin-bottom:5px}';
    echo '.date{text-align:center;color:#666;font-size:12px;margin-bottom:30px}';
    echo 'h2{font-size:16px;border-bottom:2px solid #333;padding-bottom:5px;margin-top:25px}';
    echo 'ul{list-style:none;padding:0}';
    echo 'li{padding:4px 0;font-size:13px;border-bottom:1px solid #eee}';
    echo 'li span{color:#666;font-size:11px}';
    echo '.empty{text-align:center;color:#999;font-style:italic;margin-top:40px}';
    echo '@media print{body{margin:20px}button{display:none}}';
    echo '</style></head><body>';
    echo '<button onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:8px 16px;background:#1e40af;color:white;border:none;border-radius:6px;cursor:pointer">Imprimer / PDF</button>';
    echo '<h1>SAGL - État des stocks</h1>';
    echo '<p class="date">Généré le ' . $date . ' à ' . $time . '</p>';

    $hasContent = false;
    foreach ($storages as $storageName => $items) {
        if (empty($items)) continue;
        $hasContent = true;
        echo '<h2>' . htmlspecialchars($storageName) . '</h2><ul>';
        foreach ($items as $item) {
            $exp = $item['expiration_date'] ? ' <span>(péremption: ' . date('d/m/Y', strtotime($item['expiration_date'])) . ')</span>' : '';
            echo '<li>&bull; ' . htmlspecialchars($item['material_name']) . ': ' . $item['quantity'] . $exp . '</li>';
        }
        echo '</ul>';
    }

    if (!$hasContent) {
        echo '<p class="empty">Aucun stock à afficher.</p>';
    }

    echo '</body></html>';
    exit;
}
