<?php
/**
 * SAGL - API Notifications
 */

function handleNotifications(): void {
    requireAuth();
    $db = getDB();
    $notifications = [];

    // 1. Matériels avec seuil d'alerte dans la réserve locale
    $globalStock = $db->query('SELECT * FROM storage WHERE is_global_stock = 1 LIMIT 1')->fetch();

    if ($globalStock) {
        $materials = $db->query('SELECT * FROM material WHERE alert_threshold IS NOT NULL')->fetchAll();

        foreach ($materials as $mat) {
            $stmt = $db->prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM stock_item WHERE storage_id = ? AND material_id = ?');
            $stmt->execute([$globalStock['id'], $mat['id']]);
            $totalQty = (int)$stmt->fetchColumn();

            if ($totalQty === 0) {
                $notifications[] = [
                    'type' => 'missing',
                    'severity' => 'error',
                    'materialId' => (int)$mat['id'],
                    'materialName' => $mat['name'],
                    'storageId' => (int)$globalStock['id'],
                    'storageName' => $globalStock['name'],
                    'currentQuantity' => 0,
                    'threshold' => (int)$mat['alert_threshold'],
                    'message' => $mat['name'] . ' : stock épuisé dans ' . $globalStock['name'],
                ];
            } elseif ($totalQty <= (int)$mat['alert_threshold']) {
                $notifications[] = [
                    'type' => 'low',
                    'severity' => 'warning',
                    'materialId' => (int)$mat['id'],
                    'materialName' => $mat['name'],
                    'storageId' => (int)$globalStock['id'],
                    'storageName' => $globalStock['name'],
                    'currentQuantity' => $totalQty,
                    'threshold' => (int)$mat['alert_threshold'],
                    'message' => $mat['name'] . ' : stock faible (' . $totalQty . '/' . $mat['alert_threshold'] . ') dans ' . $globalStock['name'],
                ];
            }
        }
    }

    // 2. Matériels périmés
    $expired = $db->query("
        SELECT si.*, m.name as material_name, s.name as storage_name
        FROM stock_item si
        JOIN material m ON m.id = si.material_id
        JOIN storage s ON s.id = si.storage_id
        WHERE si.expiration_date IS NOT NULL
            AND si.expiration_date <= datetime('now')
            AND si.quantity > 0
    ")->fetchAll();

    foreach ($expired as $item) {
        $expDate = date('d/m/Y', strtotime($item['expiration_date']));
        $notifications[] = [
            'type' => 'expired',
            'severity' => 'error',
            'materialId' => (int)$item['material_id'],
            'materialName' => $item['material_name'],
            'storageId' => (int)$item['storage_id'],
            'storageName' => $item['storage_name'],
            'currentQuantity' => (int)$item['quantity'],
            'expirationDate' => $item['expiration_date'],
            'message' => $item['material_name'] . ' : périmé depuis le ' . $expDate . ' dans ' . $item['storage_name'],
        ];
    }

    // 3. Matériels bientôt périmés (30 jours)
    $soonExpired = $db->query("
        SELECT si.*, m.name as material_name, s.name as storage_name
        FROM stock_item si
        JOIN material m ON m.id = si.material_id
        JOIN storage s ON s.id = si.storage_id
        WHERE si.expiration_date IS NOT NULL
            AND si.expiration_date > datetime('now')
            AND si.expiration_date <= datetime('now', '+30 days')
            AND si.quantity > 0
    ")->fetchAll();

    foreach ($soonExpired as $item) {
        $expDate = date('d/m/Y', strtotime($item['expiration_date']));
        $notifications[] = [
            'type' => 'expiring_soon',
            'severity' => 'warning',
            'materialId' => (int)$item['material_id'],
            'materialName' => $item['material_name'],
            'storageId' => (int)$item['storage_id'],
            'storageName' => $item['storage_name'],
            'currentQuantity' => (int)$item['quantity'],
            'expirationDate' => $item['expiration_date'],
            'message' => $item['material_name'] . ' : péremption prochaine (' . $expDate . ') dans ' . $item['storage_name'],
        ];
    }

    // Trier : erreurs d'abord
    usort($notifications, function($a, $b) {
        if ($a['severity'] === 'error' && $b['severity'] !== 'error') return -1;
        if ($a['severity'] !== 'error' && $b['severity'] === 'error') return 1;
        return 0;
    });

    jsonResponse(['notifications' => $notifications, 'count' => count($notifications)]);
}
