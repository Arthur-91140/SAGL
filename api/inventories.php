<?php
/**
 * SAGL - API Inventaires (admin)
 */

function handleListInventories(): void {
    requireAuth();
    $db = getDB();

    $storageId = $_GET['storageId'] ?? null;
    $type = $_GET['type'] ?? null;
    $rescuerName = $_GET['rescuerName'] ?? null;
    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $where = [];
    $params = [];

    if ($storageId) {
        $where[] = 'i.storage_id = ?';
        $params[] = (int)$storageId;
    }
    if ($type) {
        $where[] = 'i.type = ?';
        $params[] = $type;
    }
    if ($rescuerName) {
        $where[] = 'i.rescuer_name LIKE ?';
        $params[] = '%' . $rescuerName . '%';
    }
    if ($from) {
        $where[] = 'i.created_at >= ?';
        $params[] = $from;
    }
    if ($to) {
        $where[] = 'i.created_at <= ?';
        $params[] = $to;
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Count total
    $countStmt = $db->prepare("SELECT COUNT(*) FROM inventory i $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Fetch page
    $stmt = $db->prepare("
        SELECT i.*, s.name as storage_name,
            (SELECT COUNT(*) FROM inventory_item WHERE inventory_id = i.id) as items_count
        FROM inventory i
        LEFT JOIN storage s ON s.id = i.storage_id
        $whereClause
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $allParams = array_merge($params, [$limit, $offset]);
    $stmt->execute($allParams);
    $inventories = $stmt->fetchAll();

    $result = array_map(function($inv) {
        return [
            'id' => (int)$inv['id'],
            'storageId' => (int)$inv['storage_id'],
            'rescuerName' => $inv['rescuer_name'],
            'postName' => $inv['post_name'],
            'postNumber' => $inv['post_number'],
            'type' => $inv['type'],
            'greeting' => $inv['greeting'],
            'createdAt' => $inv['created_at'],
            'storage' => ['id' => (int)$inv['storage_id'], 'name' => $inv['storage_name']],
            '_count' => ['items' => (int)$inv['items_count']],
        ];
    }, $inventories);

    jsonResponse([
        'inventories' => $result,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'totalPages' => max(1, (int)ceil($total / $limit)),
        ],
    ]);
}

function handleGetInventory(int $id): void {
    requireAuth();
    $db = getDB();

    $stmt = $db->prepare('
        SELECT i.*, s.name as storage_name
        FROM inventory i
        LEFT JOIN storage s ON s.id = i.storage_id
        WHERE i.id = ?
    ');
    $stmt->execute([$id]);
    $inv = $stmt->fetch();

    if (!$inv) {
        errorResponse('Inventaire non trouvé', 404);
    }

    // Fetch items
    $stmt = $db->prepare('
        SELECT ii.*, m.name as material_name, s.name as item_storage_name
        FROM inventory_item ii
        JOIN material m ON m.id = ii.material_id
        JOIN storage s ON s.id = ii.storage_id
        WHERE ii.inventory_id = ?
        ORDER BY s.name ASC, m.name ASC
    ');
    $stmt->execute([$id]);
    $items = $stmt->fetchAll();

    jsonResponse([
        'id' => (int)$inv['id'],
        'storageId' => (int)$inv['storage_id'],
        'rescuerName' => $inv['rescuer_name'],
        'postName' => $inv['post_name'],
        'postNumber' => $inv['post_number'],
        'type' => $inv['type'],
        'greeting' => $inv['greeting'],
        'createdAt' => $inv['created_at'],
        'storage' => ['id' => (int)$inv['storage_id'], 'name' => $inv['storage_name']],
        'items' => array_map(function($item) {
            return [
                'id' => (int)$item['id'],
                'inventoryId' => (int)$item['inventory_id'],
                'storageId' => (int)$item['storage_id'],
                'materialId' => (int)$item['material_id'],
                'expected' => (int)$item['expected'],
                'quantityFound' => (int)$item['quantity_found'],
                'quantityAdded' => (int)$item['quantity_added'],
                'material' => ['id' => (int)$item['material_id'], 'name' => $item['material_name']],
                'storage' => ['id' => (int)$item['storage_id'], 'name' => $item['item_storage_name']],
            ];
        }, $items),
    ]);
}
