<?php
/**
 * SAGL - API Matériels
 */

function handleListMaterials(): void {
    requireAuth();
    $db = getDB();
    $materials = $db->query('
        SELECT m.*,
            (SELECT COUNT(*) FROM stock_item WHERE material_id = m.id) as stock_count,
            (SELECT COUNT(*) FROM storage_template_item WHERE material_id = m.id) as template_count
        FROM material m
        ORDER BY m.name ASC
    ')->fetchAll();

    // Formatter pour compatibilité frontend
    $result = array_map(function($m) {
        return [
            'id' => (int)$m['id'],
            'name' => $m['name'],
            'description' => $m['description'],
            'alertThreshold' => $m['alert_threshold'] !== null ? (int)$m['alert_threshold'] : null,
            'createdAt' => $m['created_at'],
            'updatedAt' => $m['updated_at'],
            '_count' => [
                'stockItems' => (int)$m['stock_count'],
                'templateItems' => (int)$m['template_count'],
            ],
        ];
    }, $materials);

    jsonResponse($result);
}

function handleCreateMaterial(): void {
    requireAuth();
    $body = getRequestBody();
    $name = trim($body['name'] ?? '');
    $description = isset($body['description']) ? trim($body['description']) : null;
    $alertThreshold = isset($body['alertThreshold']) && $body['alertThreshold'] !== '' ? (int)$body['alertThreshold'] : null;

    if (empty($name)) {
        errorResponse('Le nom est requis', 400);
    }

    $db = getDB();
    try {
        $stmt = $db->prepare('INSERT INTO material (name, description, alert_threshold) VALUES (?, ?, ?)');
        $stmt->execute([$name, $description ?: null, $alertThreshold]);
        $id = $db->lastInsertId();

        $stmt = $db->prepare('SELECT * FROM material WHERE id = ?');
        $stmt->execute([$id]);
        $mat = $stmt->fetch();

        jsonResponse([
            'id' => (int)$mat['id'],
            'name' => $mat['name'],
            'description' => $mat['description'],
            'alertThreshold' => $mat['alert_threshold'] !== null ? (int)$mat['alert_threshold'] : null,
            'createdAt' => $mat['created_at'],
            'updatedAt' => $mat['updated_at'],
        ], 201);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'UNIQUE') !== false) {
            errorResponse('Un matériel avec ce nom existe déjà', 409);
        }
        throw $e;
    }
}

function handleUpdateMaterial(int $id): void {
    requireAuth();
    $body = getRequestBody();
    $name = trim($body['name'] ?? '');
    $description = isset($body['description']) ? trim($body['description']) : null;
    $alertThreshold = null;
    if (isset($body['alertThreshold']) && $body['alertThreshold'] !== '' && $body['alertThreshold'] !== null) {
        $alertThreshold = (int)$body['alertThreshold'];
    }

    if (empty($name)) {
        errorResponse('Le nom est requis', 400);
    }

    $db = getDB();
    try {
        $stmt = $db->prepare('UPDATE material SET name = ?, description = ?, alert_threshold = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$name, $description ?: null, $alertThreshold, $id]);

        if ($stmt->rowCount() === 0) {
            // Vérifier si le matériel existe
            $check = $db->prepare('SELECT id FROM material WHERE id = ?');
            $check->execute([$id]);
            if (!$check->fetch()) {
                errorResponse('Matériel non trouvé', 404);
            }
        }

        $stmt = $db->prepare('SELECT * FROM material WHERE id = ?');
        $stmt->execute([$id]);
        $mat = $stmt->fetch();

        jsonResponse([
            'id' => (int)$mat['id'],
            'name' => $mat['name'],
            'description' => $mat['description'],
            'alertThreshold' => $mat['alert_threshold'] !== null ? (int)$mat['alert_threshold'] : null,
            'createdAt' => $mat['created_at'],
            'updatedAt' => $mat['updated_at'],
        ]);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'UNIQUE') !== false) {
            errorResponse('Un matériel avec ce nom existe déjà', 409);
        }
        throw $e;
    }
}

function handleDeleteMaterial(int $id): void {
    requireAuth();
    $db = getDB();

    $stmt = $db->prepare('SELECT id FROM material WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        errorResponse('Matériel non trouvé', 404);
    }

    $db->prepare('DELETE FROM material WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Matériel supprimé']);
}
