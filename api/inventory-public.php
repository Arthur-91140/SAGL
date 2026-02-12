<?php
/**
 * SAGL - API Inventaire public (secouriste)
 */

function handleGetPublicInventory(string $uniqueLink): void {
    $db = getDB();

    $stmt = $db->prepare('SELECT * FROM storage WHERE unique_link = ?');
    $stmt->execute([$uniqueLink]);
    $storage = $stmt->fetch();

    if (!$storage) {
        errorResponse('Stockage non trouvé', 404);
    }

    // Charger l'arbre avec templates (jusqu'à 3 niveaux de profondeur)
    $result = buildStorageTree($db, $storage);
    jsonResponse($result);
}

function buildStorageTree(PDO $db, array $storage): array {
    // Templates de ce stockage
    $stmt = $db->prepare('
        SELECT sti.*, m.name as material_name, m.id as mid
        FROM storage_template_item sti
        JOIN material m ON m.id = sti.material_id
        WHERE sti.storage_id = ?
        ORDER BY m.name ASC
    ');
    $stmt->execute([$storage['id']]);
    $templates = array_map(function($t) {
        return [
            'id' => (int)$t['id'],
            'storageId' => (int)$t['storage_id'],
            'materialId' => (int)$t['mid'],
            'expectedQuantity' => (int)$t['expected_quantity'],
            'material' => ['id' => (int)$t['mid'], 'name' => $t['material_name']],
        ];
    }, $stmt->fetchAll());

    // Enfants
    $stmt = $db->prepare('SELECT * FROM storage WHERE parent_id = ? ORDER BY name ASC');
    $stmt->execute([$storage['id']]);
    $children = $stmt->fetchAll();

    $childNodes = [];
    foreach ($children as $child) {
        $childNodes[] = buildStorageTree($db, $child);
    }

    return [
        'id' => (int)$storage['id'],
        'name' => $storage['name'],
        'parentId' => $storage['parent_id'] !== null ? (int)$storage['parent_id'] : null,
        'isGlobalStock' => (bool)$storage['is_global_stock'],
        'uniqueLink' => $storage['unique_link'],
        'templateItems' => $templates,
        'children' => $childNodes,
    ];
}

function handleSubmitInventory(string $uniqueLink): void {
    $body = getRequestBody();
    $rescuerName = trim($body['rescuerName'] ?? '');
    $postName = trim($body['postName'] ?? '');
    $postNumber = trim($body['postNumber'] ?? '');
    $type = $body['type'] ?? '';
    $items = $body['items'] ?? [];

    if (empty($rescuerName)) {
        errorResponse('Le nom du secouriste est requis', 400);
    }
    if (empty($postName) && empty($postNumber)) {
        errorResponse('Le nom ou le numéro du poste est requis', 400);
    }
    if (!in_array($type, ['START', 'END', 'OTHER'])) {
        errorResponse("Le type d'inventaire est requis (START, END, OTHER)", 400);
    }
    if (!is_array($items) || empty($items)) {
        errorResponse("Les éléments de l'inventaire sont requis", 400);
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM storage WHERE unique_link = ?');
    $stmt->execute([$uniqueLink]);
    $storage = $stmt->fetch();

    if (!$storage) {
        errorResponse('Stockage non trouvé', 404);
    }

    $greeting = getGreeting($type);

    // Trouver la réserve locale
    $globalStock = $db->query('SELECT * FROM storage WHERE is_global_stock = 1 LIMIT 1')->fetch();

    try {
        $db->beginTransaction();

        // Créer l'inventaire
        $stmt = $db->prepare('
            INSERT INTO inventory (storage_id, rescuer_name, post_name, post_number, type, greeting)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $storage['id'],
            $rescuerName,
            $postName ?: null,
            $postNumber ?: null,
            $type,
            $greeting,
        ]);
        $inventoryId = $db->lastInsertId();

        // Créer les items
        foreach ($items as $item) {
            $stmt = $db->prepare('
                INSERT INTO inventory_item (inventory_id, storage_id, material_id, expected, quantity_found, quantity_added)
                VALUES (?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $inventoryId,
                (int)$item['storageId'],
                (int)$item['materialId'],
                (int)$item['expected'],
                (int)$item['quantityFound'],
                (int)($item['quantityAdded'] ?? 0),
            ]);

            // Déduire du stock global
            $added = (int)($item['quantityAdded'] ?? 0);
            if ($added > 0 && $globalStock) {
                $stmt = $db->prepare('SELECT * FROM stock_item WHERE storage_id = ? AND material_id = ? LIMIT 1');
                $stmt->execute([$globalStock['id'], (int)$item['materialId']]);
                $stockItem = $stmt->fetch();

                if ($stockItem) {
                    $newQty = max(0, (int)$stockItem['quantity'] - $added);
                    $db->prepare('UPDATE stock_item SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                        ->execute([$newQty, $stockItem['id']]);
                }
            }
        }

        $db->commit();

        // Charger l'inventaire créé
        $stmt = $db->prepare('
            SELECT ii.*, m.name as material_name, s.name as storage_name
            FROM inventory_item ii
            JOIN material m ON m.id = ii.material_id
            JOIN storage s ON s.id = ii.storage_id
            WHERE ii.inventory_id = ?
        ');
        $stmt->execute([$inventoryId]);
        $createdItems = $stmt->fetchAll();

        jsonResponse([
            'inventory' => [
                'id' => (int)$inventoryId,
                'storageId' => (int)$storage['id'],
                'rescuerName' => $rescuerName,
                'type' => $type,
                'greeting' => $greeting,
                'items' => array_map(function($i) {
                    return [
                        'id' => (int)$i['id'],
                        'materialId' => (int)$i['material_id'],
                        'expected' => (int)$i['expected'],
                        'quantityFound' => (int)$i['quantity_found'],
                        'quantityAdded' => (int)$i['quantity_added'],
                        'material' => ['id' => (int)$i['material_id'], 'name' => $i['material_name']],
                        'storage' => ['id' => (int)$i['storage_id'], 'name' => $i['storage_name']],
                    ];
                }, $createdItems),
            ],
            'greeting' => $greeting,
        ], 201);
    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Erreur serveur', 500);
    }
}
