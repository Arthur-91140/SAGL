<?php
/**
 * SAGL - API Statistiques
 */

function handleStats(): void {
    requireAuth();
    $db = getDB();

    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;

    // Statistiques générales
    $totalMaterials = (int)$db->query('SELECT COUNT(*) FROM material')->fetchColumn();
    $totalStorages = (int)$db->query('SELECT COUNT(*) FROM storage')->fetchColumn();
    $totalInventories = (int)$db->query('SELECT COUNT(*) FROM inventory')->fetchColumn();

    $stmt = $db->prepare("SELECT COUNT(*) FROM inventory WHERE created_at >= datetime('now', '-30 days')");
    $stmt->execute();
    $recentInventories = (int)$stmt->fetchColumn();

    // Inventaires par type
    $dateFilter = '';
    $dateParams = [];
    if ($from) { $dateFilter .= ' AND created_at >= ?'; $dateParams[] = $from; }
    if ($to) { $dateFilter .= ' AND created_at <= ?'; $dateParams[] = $to; }

    $stmt = $db->prepare("SELECT type, COUNT(*) as count FROM inventory WHERE 1=1 $dateFilter GROUP BY type");
    $stmt->execute($dateParams);
    $inventoriesByType = array_map(function($r) {
        return ['type' => $r['type'], 'count' => (int)$r['count']];
    }, $stmt->fetchAll());

    // Top 10 matériels les plus consommés
    $itemDateFilter = '';
    $itemDateParams = [];
    if ($from) { $itemDateFilter .= ' AND ii.created_at >= ?'; $itemDateParams[] = $from; }
    if ($to) { $itemDateFilter .= ' AND ii.created_at <= ?'; $itemDateParams[] = $to; }

    $stmt = $db->prepare("
        SELECT m.name, SUM(ii.quantity_added) as total
        FROM inventory_item ii
        JOIN material m ON m.id = ii.material_id
        WHERE ii.quantity_added > 0 $itemDateFilter
        GROUP BY ii.material_id
        ORDER BY total DESC
        LIMIT 10
    ");
    $stmt->execute($itemDateParams);
    $topConsumed = array_map(function($r) {
        return ['name' => $r['name'], 'total' => (int)$r['total']];
    }, $stmt->fetchAll());

    // Top 10 matériels les plus souvent manquants
    $stmt = $db->prepare("
        SELECT m.name, ii.material_id,
            SUM(CASE WHEN ii.quantity_found < ii.expected THEN 1 ELSE 0 END) as missing_count,
            COUNT(*) as total_checks
        FROM inventory_item ii
        JOIN material m ON m.id = ii.material_id
        WHERE 1=1 $itemDateFilter
        GROUP BY ii.material_id
        HAVING missing_count > 0
        ORDER BY missing_count DESC
        LIMIT 10
    ");
    $stmt->execute($itemDateParams);
    $topMissing = array_map(function($r) {
        return [
            'name' => $r['name'],
            'missingCount' => (int)$r['missing_count'],
            'totalChecks' => (int)$r['total_checks'],
        ];
    }, $stmt->fetchAll());

    // Inventaires par jour (30 derniers jours)
    $stmt = $db->prepare("
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM inventory
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ");
    $stmt->execute();
    $inventoriesPerDay = array_map(function($r) {
        return ['date' => $r['date'], 'count' => (int)$r['count']];
    }, $stmt->fetchAll());

    // État du stock global
    $stockStatus = [];
    $globalStock = $db->query('SELECT * FROM storage WHERE is_global_stock = 1 LIMIT 1')->fetch();
    if ($globalStock) {
        $stmt = $db->prepare('
            SELECT m.name, m.alert_threshold, SUM(si.quantity) as total_quantity
            FROM stock_item si
            JOIN material m ON m.id = si.material_id
            WHERE si.storage_id = ?
            GROUP BY si.material_id
            ORDER BY m.name ASC
        ');
        $stmt->execute([$globalStock['id']]);
        $stockStatus = array_map(function($r) {
            return [
                'name' => $r['name'],
                'quantity' => (int)$r['total_quantity'],
                'threshold' => $r['alert_threshold'] !== null ? (int)$r['alert_threshold'] : null,
            ];
        }, $stmt->fetchAll());
    }

    jsonResponse([
        'overview' => [
            'totalMaterials' => $totalMaterials,
            'totalStorages' => $totalStorages,
            'totalInventories' => $totalInventories,
            'recentInventories' => $recentInventories,
        ],
        'inventoriesByType' => $inventoriesByType,
        'topConsumed' => $topConsumed,
        'topMissing' => $topMissing,
        'inventoriesPerDay' => $inventoriesPerDay,
        'stockStatus' => $stockStatus,
    ]);
}
