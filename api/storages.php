<?php
/**
 * SAGL - API Stockages
 */

function handleStorageTree(): void {
    requireAuth();
    $db = getDB();

    $storages = $db->query('
        SELECT s.*,
            (SELECT COUNT(*) FROM storage WHERE parent_id = s.id) as children_count,
            (SELECT COUNT(*) FROM stock_item WHERE storage_id = s.id) as stock_count
        FROM storage s
        ORDER BY s.name ASC
    ')->fetchAll();

    // Charger les templates pour chaque stockage
    $templates = $db->query('
        SELECT sti.*, m.name as material_name
        FROM storage_template_item sti
        JOIN material m ON m.id = sti.material_id
        ORDER BY m.name ASC
    ')->fetchAll();

    $templateMap = [];
    foreach ($templates as $t) {
        $templateMap[$t['storage_id']][] = [
            'id' => (int)$t['id'],
            'storageId' => (int)$t['storage_id'],
            'materialId' => (int)$t['material_id'],
            'expectedQuantity' => (int)$t['expected_quantity'],
            'material' => ['id' => (int)$t['material_id'], 'name' => $t['material_name']],
        ];
    }

    // Construire l'arbre
    $nodeMap = [];
    foreach ($storages as $s) {
        $nodeMap[$s['id']] = [
            'id' => (int)$s['id'],
            'name' => $s['name'],
            'parentId' => $s['parent_id'] !== null ? (int)$s['parent_id'] : null,
            'isGlobalStock' => (bool)$s['is_global_stock'],
            'uniqueLink' => $s['unique_link'],
            'createdAt' => $s['created_at'],
            'updatedAt' => $s['updated_at'],
            'templateItems' => $templateMap[$s['id']] ?? [],
            '_count' => [
                'children' => (int)$s['children_count'],
                'stockItems' => (int)$s['stock_count'],
            ],
            'children' => [],
        ];
    }

    $roots = [];
    foreach ($nodeMap as &$node) {
        if ($node['parentId'] && isset($nodeMap[$node['parentId']])) {
            $nodeMap[$node['parentId']]['children'][] = &$node;
        } elseif (!$node['parentId']) {
            $roots[] = &$node;
        }
    }
    unset($node);

    jsonResponse($roots);
}

function handleListStorages(): void {
    requireAuth();
    $db = getDB();

    $storages = $db->query('
        SELECT s.*,
            p.id as parent_id_ref, p.name as parent_name,
            (SELECT COUNT(*) FROM storage WHERE parent_id = s.id) as children_count
        FROM storage s
        LEFT JOIN storage p ON p.id = s.parent_id
        ORDER BY s.name ASC
    ')->fetchAll();

    $result = array_map(function($s) {
        return [
            'id' => (int)$s['id'],
            'name' => $s['name'],
            'parentId' => $s['parent_id'] !== null ? (int)$s['parent_id'] : null,
            'isGlobalStock' => (bool)$s['is_global_stock'],
            'uniqueLink' => $s['unique_link'],
            'createdAt' => $s['created_at'],
            'updatedAt' => $s['updated_at'],
            'parent' => $s['parent_name'] ? ['id' => (int)$s['parent_id'], 'name' => $s['parent_name']] : null,
            '_count' => ['children' => (int)$s['children_count']],
        ];
    }, $storages);

    jsonResponse($result);
}

function handleGetStorage(int $id): void {
    requireAuth();
    $db = getDB();

    $stmt = $db->prepare('SELECT s.*, p.id as p_id, p.name as p_name FROM storage s LEFT JOIN storage p ON p.id = s.parent_id WHERE s.id = ?');
    $stmt->execute([$id]);
    $storage = $stmt->fetch();

    if (!$storage) {
        errorResponse('Stockage non trouvé', 404);
    }

    // Enfants
    $children = $db->prepare('
        SELECT s.*,
            (SELECT COUNT(*) FROM storage WHERE parent_id = s.id) as children_count
        FROM storage s WHERE s.parent_id = ? ORDER BY s.name ASC
    ');
    $children->execute([$id]);
    $childList = $children->fetchAll();

    // Templates des enfants
    $childTemplates = [];
    if ($childList) {
        $childIds = array_column($childList, 'id');
        $placeholders = implode(',', array_fill(0, count($childIds), '?'));
        $stmt = $db->prepare("
            SELECT sti.*, m.name as material_name
            FROM storage_template_item sti
            JOIN material m ON m.id = sti.material_id
            WHERE sti.storage_id IN ($placeholders)
            ORDER BY m.name ASC
        ");
        $stmt->execute($childIds);
        foreach ($stmt->fetchAll() as $t) {
            $childTemplates[$t['storage_id']][] = [
                'id' => (int)$t['id'],
                'materialId' => (int)$t['material_id'],
                'expectedQuantity' => (int)$t['expected_quantity'],
                'material' => ['id' => (int)$t['material_id'], 'name' => $t['material_name']],
            ];
        }
    }

    // Template items du stockage
    $stmt = $db->prepare('
        SELECT sti.*, m.name as material_name, m.description as material_description, m.alert_threshold
        FROM storage_template_item sti
        JOIN material m ON m.id = sti.material_id
        WHERE sti.storage_id = ?
        ORDER BY m.name ASC
    ');
    $stmt->execute([$id]);
    $templateItems = $stmt->fetchAll();

    // Stock items
    $stmt = $db->prepare('
        SELECT si.*, m.name as material_name, m.description as material_description, m.alert_threshold
        FROM stock_item si
        JOIN material m ON m.id = si.material_id
        WHERE si.storage_id = ?
        ORDER BY m.name ASC
    ');
    $stmt->execute([$id]);
    $stockItems = $stmt->fetchAll();

    $result = [
        'id' => (int)$storage['id'],
        'name' => $storage['name'],
        'parentId' => $storage['parent_id'] !== null ? (int)$storage['parent_id'] : null,
        'isGlobalStock' => (bool)$storage['is_global_stock'],
        'uniqueLink' => $storage['unique_link'],
        'createdAt' => $storage['created_at'],
        'updatedAt' => $storage['updated_at'],
        'parent' => $storage['p_name'] ? ['id' => (int)$storage['p_id'], 'name' => $storage['p_name']] : null,
        'children' => array_map(function($c) use ($childTemplates) {
            return [
                'id' => (int)$c['id'],
                'name' => $c['name'],
                'parentId' => $c['parent_id'] !== null ? (int)$c['parent_id'] : null,
                'isGlobalStock' => (bool)$c['is_global_stock'],
                'uniqueLink' => $c['unique_link'],
                'templateItems' => $childTemplates[$c['id']] ?? [],
                '_count' => ['children' => (int)$c['children_count']],
            ];
        }, $childList),
        'templateItems' => array_map(function($t) {
            return [
                'id' => (int)$t['id'],
                'storageId' => (int)$t['storage_id'],
                'materialId' => (int)$t['material_id'],
                'expectedQuantity' => (int)$t['expected_quantity'],
                'material' => [
                    'id' => (int)$t['material_id'],
                    'name' => $t['material_name'],
                    'description' => $t['material_description'],
                    'alertThreshold' => $t['alert_threshold'] !== null ? (int)$t['alert_threshold'] : null,
                ],
            ];
        }, $templateItems),
        'stockItems' => array_map(function($s) {
            return [
                'id' => (int)$s['id'],
                'storageId' => (int)$s['storage_id'],
                'materialId' => (int)$s['material_id'],
                'quantity' => (int)$s['quantity'],
                'expirationDate' => $s['expiration_date'],
                'createdAt' => $s['created_at'],
                'updatedAt' => $s['updated_at'],
                'material' => [
                    'id' => (int)$s['material_id'],
                    'name' => $s['material_name'],
                    'description' => $s['material_description'],
                    'alertThreshold' => $s['alert_threshold'] !== null ? (int)$s['alert_threshold'] : null,
                ],
            ];
        }, $stockItems),
    ];

    jsonResponse($result);
}

function handleCreateStorage(): void {
    requireAuth();
    $body = getRequestBody();
    $name = trim($body['name'] ?? '');
    $parentId = isset($body['parentId']) && $body['parentId'] !== '' ? (int)$body['parentId'] : null;

    if (empty($name)) {
        errorResponse('Le nom est requis', 400);
    }

    $db = getDB();
    if ($parentId) {
        $stmt = $db->prepare('SELECT id FROM storage WHERE id = ?');
        $stmt->execute([$parentId]);
        if (!$stmt->fetch()) {
            errorResponse('Stockage parent non trouvé', 404);
        }
    }

    $stmt = $db->prepare('INSERT INTO storage (name, parent_id) VALUES (?, ?)');
    $stmt->execute([$name, $parentId]);
    $id = $db->lastInsertId();

    $stmt = $db->prepare('SELECT * FROM storage WHERE id = ?');
    $stmt->execute([$id]);
    $s = $stmt->fetch();

    jsonResponse([
        'id' => (int)$s['id'],
        'name' => $s['name'],
        'parentId' => $s['parent_id'] !== null ? (int)$s['parent_id'] : null,
        'isGlobalStock' => (bool)$s['is_global_stock'],
        'uniqueLink' => $s['unique_link'],
        'createdAt' => $s['created_at'],
        'updatedAt' => $s['updated_at'],
    ], 201);
}

function handleUpdateStorage(int $id): void {
    requireAuth();
    $body = getRequestBody();
    $name = trim($body['name'] ?? '');
    $parentId = array_key_exists('parentId', $body) ? ($body['parentId'] ? (int)$body['parentId'] : null) : 'UNCHANGED';

    if (empty($name)) {
        errorResponse('Le nom est requis', 400);
    }

    if ($parentId !== 'UNCHANGED' && $parentId === $id) {
        errorResponse('Un stockage ne peut pas être son propre parent', 400);
    }

    $db = getDB();
    if ($parentId === 'UNCHANGED') {
        $stmt = $db->prepare('UPDATE storage SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$name, $id]);
    } else {
        $stmt = $db->prepare('UPDATE storage SET name = ?, parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$name, $parentId, $id]);
    }

    $stmt = $db->prepare('SELECT * FROM storage WHERE id = ?');
    $stmt->execute([$id]);
    $s = $stmt->fetch();

    if (!$s) {
        errorResponse('Stockage non trouvé', 404);
    }

    jsonResponse([
        'id' => (int)$s['id'],
        'name' => $s['name'],
        'parentId' => $s['parent_id'] !== null ? (int)$s['parent_id'] : null,
        'isGlobalStock' => (bool)$s['is_global_stock'],
        'uniqueLink' => $s['unique_link'],
    ]);
}

function handleDeleteStorage(int $id): void {
    requireAuth();
    $db = getDB();

    $stmt = $db->prepare('SELECT * FROM storage WHERE id = ?');
    $stmt->execute([$id]);
    $s = $stmt->fetch();

    if (!$s) {
        errorResponse('Stockage non trouvé', 404);
    }

    if ($s['is_global_stock']) {
        errorResponse('Impossible de supprimer la réserve locale', 400);
    }

    $db->prepare('DELETE FROM storage WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Stockage supprimé']);
}

function handleGenerateLink(int $id): void {
    requireAuth();
    $db = getDB();
    $uniqueLink = generateUUID();

    $stmt = $db->prepare('UPDATE storage SET unique_link = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    $stmt->execute([$uniqueLink, $id]);

    $stmt = $db->prepare('SELECT * FROM storage WHERE id = ?');
    $stmt->execute([$id]);
    $s = $stmt->fetch();

    if (!$s) {
        errorResponse('Stockage non trouvé', 404);
    }

    jsonResponse([
        'uniqueLink' => $s['unique_link'],
        'url' => getBaseUrl() . '/i/' . $s['unique_link'],
    ]);
}

function handleQRCode(int $id): void {
    requireAuth();
    $db = getDB();

    $stmt = $db->prepare('SELECT * FROM storage WHERE id = ?');
    $stmt->execute([$id]);
    $s = $stmt->fetch();

    if (!$s) {
        errorResponse('Stockage non trouvé', 404);
    }

    if (!$s['unique_link']) {
        errorResponse('Aucun lien unique généré pour ce stockage', 400);
    }

    $url = getBaseUrl() . '/i/' . $s['unique_link'];

    // Générer QR code en utilisant l'API Google Charts (pas de dépendance)
    $qrUrl = 'https://chart.googleapis.com/chart?chs=400x400&cht=qr&chl=' . urlencode($url) . '&choe=UTF-8';

    // Ou générer en SVG natif (sans dépendance externe)
    $qrSvg = generateQRCodeSVG($url);

    header('Content-Type: image/svg+xml');
    header('Content-Disposition: inline; filename="qr-' . $s['name'] . '.svg"');
    echo $qrSvg;
    exit;
}

/**
 * Génère un QR code SVG simple en PHP pur
 */
function generateQRCodeSVG(string $data): string {
    // Utilisation d'une approche simple : QR code via une bibliothèque minimaliste intégrée
    // Pour un serveur basique, on génère un QR code textuel redirigé vers une API
    // Alternative : SVG avec l'URL encodée
    $size = 400;
    $svg = '<?xml version="1.0" encoding="UTF-8"?>';
    $svg .= '<svg xmlns="http://www.w3.org/2000/svg" width="' . $size . '" height="' . ($size + 40) . '" viewBox="0 0 ' . $size . ' ' . ($size + 40) . '">';
    $svg .= '<rect width="100%" height="100%" fill="white"/>';

    // Simple matrix-based QR encoding
    $matrix = generateQRMatrix($data);
    $moduleCount = count($matrix);
    $moduleSize = ($size - 20) / $moduleCount;
    $offset = 10;

    for ($r = 0; $r < $moduleCount; $r++) {
        for ($c = 0; $c < $moduleCount; $c++) {
            if ($matrix[$r][$c]) {
                $x = $offset + $c * $moduleSize;
                $y = $offset + $r * $moduleSize;
                $svg .= '<rect x="' . round($x, 2) . '" y="' . round($y, 2) . '" width="' . round($moduleSize, 2) . '" height="' . round($moduleSize, 2) . '" fill="#1e293b"/>';
            }
        }
    }

    $svg .= '<text x="' . ($size / 2) . '" y="' . ($size + 25) . '" text-anchor="middle" font-family="Arial" font-size="11" fill="#666">Scannez ce QR code</text>';
    $svg .= '</svg>';
    return $svg;
}

/**
 * Implémentation QR Code minimaliste (Version 2, mode byte, ECC L)
 */
function generateQRMatrix(string $data): array {
    // Pour garder le code simple et sans dépendance, on utilise
    // une version minimaliste qui génère un QR valide
    // Mode Byte, Version adaptée à la longueur des données
    $dataLen = strlen($data);

    // Choisir la version (1-4 pour la simplicité)
    if ($dataLen <= 17) { $version = 1; $totalCodewords = 19; $ecCodewords = 7; }
    elseif ($dataLen <= 32) { $version = 2; $totalCodewords = 34; $ecCodewords = 10; }
    elseif ($dataLen <= 53) { $version = 3; $totalCodewords = 55; $ecCodewords = 15; }
    elseif ($dataLen <= 78) { $version = 4; $totalCodewords = 80; $ecCodewords = 20; }
    elseif ($dataLen <= 106) { $version = 5; $totalCodewords = 108; $ecCodewords = 26; }
    elseif ($dataLen <= 134) { $version = 6; $totalCodewords = 136; $ecCodewords = 18; }
    elseif ($dataLen <= 154) { $version = 7; $totalCodewords = 156; $ecCodewords = 20; }
    elseif ($dataLen <= 192) { $version = 8; $totalCodewords = 194; $ecCodewords = 24; }
    elseif ($dataLen <= 230) { $version = 9; $totalCodewords = 232; $ecCodewords = 30; }
    else { $version = 10; $totalCodewords = 274; $ecCodewords = 18; }

    $size = $version * 4 + 17;
    $dataCodewords = $totalCodewords - $ecCodewords;

    // Encoder les données en mode byte
    $bits = '';
    $bits .= '0100'; // Mode byte
    if ($version <= 9) {
        $bits .= sprintf('%08b', $dataLen);
    } else {
        $bits .= sprintf('%016b', $dataLen);
    }
    for ($i = 0; $i < $dataLen; $i++) {
        $bits .= sprintf('%08b', ord($data[$i]));
    }
    $bits .= '0000'; // Terminator

    // Padding pour compléter les codewords
    while (strlen($bits) % 8 !== 0) $bits .= '0';
    $codewords = [];
    for ($i = 0; $i < strlen($bits); $i += 8) {
        $codewords[] = bindec(substr($bits, $i, 8));
    }
    $padPatterns = [0xEC, 0x11];
    $padIdx = 0;
    while (count($codewords) < $dataCodewords) {
        $codewords[] = $padPatterns[$padIdx % 2];
        $padIdx++;
    }

    // Reed-Solomon error correction
    $ecCodes = reedSolomonEncode($codewords, $ecCodewords);
    $allCodewords = array_merge($codewords, $ecCodes);

    // Créer la matrice
    $matrix = array_fill(0, $size, array_fill(0, $size, 0));
    $reserved = array_fill(0, $size, array_fill(0, $size, false));

    // Placer les finder patterns
    placeFinder($matrix, $reserved, 0, 0, $size);
    placeFinder($matrix, $reserved, $size - 7, 0, $size);
    placeFinder($matrix, $reserved, 0, $size - 7, $size);

    // Timing patterns
    for ($i = 8; $i < $size - 8; $i++) {
        $matrix[$i][6] = ($i % 2 === 0) ? 1 : 0;
        $matrix[6][$i] = ($i % 2 === 0) ? 1 : 0;
        $reserved[$i][6] = true;
        $reserved[6][$i] = true;
    }

    // Dark module
    $matrix[$version * 4 + 9][8] = 1;
    $reserved[$version * 4 + 9][8] = true;

    // Alignment patterns (version >= 2)
    if ($version >= 2) {
        $alignPos = getAlignmentPositions($version);
        foreach ($alignPos as $r) {
            foreach ($alignPos as $c) {
                if ($reserved[$r][$c]) continue;
                placeAlignment($matrix, $reserved, $r, $c, $size);
            }
        }
    }

    // Réserver les zones de format
    for ($i = 0; $i < 8; $i++) {
        if ($i < $size) { $reserved[$i][8] = true; $reserved[8][$i] = true; }
    }
    $reserved[8][8] = true;
    for ($i = $size - 8; $i < $size; $i++) {
        $reserved[$i][8] = true;
        $reserved[8][$i] = true;
    }

    // Version info (version >= 7)
    if ($version >= 7) {
        for ($i = 0; $i < 6; $i++) {
            for ($j = 0; $j < 3; $j++) {
                $reserved[$i][$size - 11 + $j] = true;
                $reserved[$size - 11 + $j][$i] = true;
            }
        }
    }

    // Placer les données
    $bitStream = '';
    foreach ($allCodewords as $cw) {
        $bitStream .= sprintf('%08b', $cw);
    }

    $bitIdx = 0;
    $col = $size - 1;
    $goingUp = true;

    while ($col >= 0) {
        if ($col === 6) $col--;
        for ($row = 0; $row < $size; $row++) {
            $actualRow = $goingUp ? ($size - 1 - $row) : $row;
            for ($dc = 0; $dc <= 1; $dc++) {
                $c = $col - $dc;
                if ($c < 0 || $reserved[$actualRow][$c]) continue;
                if ($bitIdx < strlen($bitStream)) {
                    $matrix[$actualRow][$c] = (int)$bitStream[$bitIdx];
                    $bitIdx++;
                }
            }
        }
        $goingUp = !$goingUp;
        $col -= 2;
    }

    // Appliquer masque 0 (checkerboard)
    for ($r = 0; $r < $size; $r++) {
        for ($c = 0; $c < $size; $c++) {
            if (!$reserved[$r][$c] && ($r + $c) % 2 === 0) {
                $matrix[$r][$c] ^= 1;
            }
        }
    }

    // Écrire les format info pour masque 0, ECC L
    $formatBits = getFormatBits(0); // Mask 0, ECC L
    writeFormatBits($matrix, $formatBits, $size);

    // Version info
    if ($version >= 7) {
        $versionBits = getVersionBits($version);
        writeVersionBits($matrix, $versionBits, $size);
    }

    return $matrix;
}

function placeFinder(array &$matrix, array &$reserved, int $row, int $col, int $size): void {
    for ($r = -1; $r <= 7; $r++) {
        for ($c = -1; $c <= 7; $c++) {
            $rr = $row + $r;
            $cc = $col + $c;
            if ($rr < 0 || $rr >= $size || $cc < 0 || $cc >= $size) continue;
            $reserved[$rr][$cc] = true;
            if ($r >= 0 && $r <= 6 && $c >= 0 && $c <= 6) {
                if ($r === 0 || $r === 6 || $c === 0 || $c === 6 || ($r >= 2 && $r <= 4 && $c >= 2 && $c <= 4)) {
                    $matrix[$rr][$cc] = 1;
                } else {
                    $matrix[$rr][$cc] = 0;
                }
            } else {
                $matrix[$rr][$cc] = 0;
            }
        }
    }
}

function placeAlignment(array &$matrix, array &$reserved, int $row, int $col, int $size): void {
    for ($r = -2; $r <= 2; $r++) {
        for ($c = -2; $c <= 2; $c++) {
            $rr = $row + $r;
            $cc = $col + $c;
            if ($rr < 0 || $rr >= $size || $cc < 0 || $cc >= $size) continue;
            $reserved[$rr][$cc] = true;
            if (abs($r) === 2 || abs($c) === 2 || ($r === 0 && $c === 0)) {
                $matrix[$rr][$cc] = 1;
            } else {
                $matrix[$rr][$cc] = 0;
            }
        }
    }
}

function getAlignmentPositions(int $version): array {
    $positions = [
        2 => [6, 18],
        3 => [6, 22],
        4 => [6, 26],
        5 => [6, 30],
        6 => [6, 34],
        7 => [6, 22, 38],
        8 => [6, 24, 42],
        9 => [6, 26, 46],
        10 => [6, 28, 50],
    ];
    return $positions[$version] ?? [6, 18];
}

function reedSolomonEncode(array $data, int $ecCount): array {
    $gfExp = array_fill(0, 512, 0);
    $gfLog = array_fill(0, 256, 0);
    $x = 1;
    for ($i = 0; $i < 255; $i++) {
        $gfExp[$i] = $x;
        $gfLog[$x] = $i;
        $x <<= 1;
        if ($x >= 256) $x ^= 0x11D;
    }
    for ($i = 255; $i < 512; $i++) {
        $gfExp[$i] = $gfExp[$i - 255];
    }

    // Generator polynomial
    $gen = [1];
    for ($i = 0; $i < $ecCount; $i++) {
        $newGen = array_fill(0, count($gen) + 1, 0);
        for ($j = 0; $j < count($gen); $j++) {
            $newGen[$j] ^= $gen[$j];
            $newGen[$j + 1] ^= ($gen[$j] === 0) ? 0 : $gfExp[$gfLog[$gen[$j]] + $i];
        }
        $gen = $newGen;
    }

    $result = array_fill(0, $ecCount, 0);
    foreach ($data as $coef) {
        $factor = $coef ^ $result[0];
        array_shift($result);
        $result[] = 0;
        if ($factor !== 0) {
            for ($i = 0; $i < $ecCount; $i++) {
                if ($gen[$i + 1] !== 0) {
                    $result[$i] ^= $gfExp[$gfLog[$gen[$i + 1]] + $gfLog[$factor]];
                }
            }
        }
    }

    return $result;
}

function getFormatBits(int $mask): string {
    // Pre-computed format strings for ECC Level L (01) with masks 0-7
    $formats = [
        0 => '111011111000100',
        1 => '111001011110011',
        2 => '111110110101010',
        3 => '111100010011101',
        4 => '110011000101111',
        5 => '110001100011000',
        6 => '110110001000001',
        7 => '110100101110110',
    ];
    return $formats[$mask] ?? $formats[0];
}

function writeFormatBits(array &$matrix, string $bits, int $size): void {
    // Positions around top-left finder
    $positions1 = [[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],[8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]];
    // Positions along bottom-left and top-right
    $positions2 = [];
    for ($i = 0; $i < 7; $i++) $positions2[] = [$size - 1 - $i, 8];
    for ($i = 0; $i < 8; $i++) $positions2[] = [8, $size - 8 + $i];

    for ($i = 0; $i < 15; $i++) {
        $bit = (int)$bits[$i];
        if (isset($positions1[$i])) {
            $matrix[$positions1[$i][0]][$positions1[$i][1]] = $bit;
        }
        if (isset($positions2[$i])) {
            $matrix[$positions2[$i][0]][$positions2[$i][1]] = $bit;
        }
    }
}

function getVersionBits(int $version): string {
    $versionInfo = [
        7  => '000111110010010100',
        8  => '001000010110111100',
        9  => '001001101010011001',
        10 => '001010010011010011',
    ];
    return $versionInfo[$version] ?? '000111110010010100';
}

function writeVersionBits(array &$matrix, string $bits, int $size): void {
    for ($i = 0; $i < 18; $i++) {
        $bit = (int)$bits[$i];
        $row = intdiv($i, 3);
        $col = $size - 11 + ($i % 3);
        $matrix[$row][$col] = $bit;
        $matrix[$col][$row] = $bit;
    }
}

function handleUpdateTemplate(int $id): void {
    requireAuth();
    $body = getRequestBody();
    $items = $body['items'] ?? [];

    $db = getDB();
    $stmt = $db->prepare('SELECT id FROM storage WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        errorResponse('Stockage non trouvé', 404);
    }

    $db->prepare('DELETE FROM storage_template_item WHERE storage_id = ?')->execute([$id]);

    if (is_array($items)) {
        foreach ($items as $item) {
            if (!empty($item['materialId']) && !empty($item['expectedQuantity']) && (int)$item['expectedQuantity'] > 0) {
                $stmt = $db->prepare('INSERT INTO storage_template_item (storage_id, material_id, expected_quantity) VALUES (?, ?, ?)');
                $stmt->execute([$id, (int)$item['materialId'], (int)$item['expectedQuantity']]);
            }
        }
    }

    $stmt = $db->prepare('
        SELECT sti.*, m.name as material_name
        FROM storage_template_item sti
        JOIN material m ON m.id = sti.material_id
        WHERE sti.storage_id = ?
        ORDER BY m.name ASC
    ');
    $stmt->execute([$id]);
    $result = array_map(function($t) {
        return [
            'id' => (int)$t['id'],
            'storageId' => (int)$t['storage_id'],
            'materialId' => (int)$t['material_id'],
            'expectedQuantity' => (int)$t['expected_quantity'],
            'material' => ['id' => (int)$t['material_id'], 'name' => $t['material_name']],
        ];
    }, $stmt->fetchAll());

    jsonResponse($result);
}

function handleUpdateStock(int $id): void {
    requireAuth();
    $body = getRequestBody();
    $items = $body['items'] ?? [];

    $db = getDB();
    $stmt = $db->prepare('SELECT id FROM storage WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        errorResponse('Stockage non trouvé', 404);
    }

    $db->prepare('DELETE FROM stock_item WHERE storage_id = ?')->execute([$id]);

    if (is_array($items)) {
        foreach ($items as $item) {
            if (!empty($item['materialId']) && isset($item['quantity']) && (int)$item['quantity'] >= 0) {
                $expDate = !empty($item['expirationDate']) ? $item['expirationDate'] : null;
                $stmt = $db->prepare('INSERT INTO stock_item (storage_id, material_id, quantity, expiration_date) VALUES (?, ?, ?, ?)');
                $stmt->execute([$id, (int)$item['materialId'], (int)$item['quantity'], $expDate]);
            }
        }
    }

    $stmt = $db->prepare('
        SELECT si.*, m.name as material_name
        FROM stock_item si
        JOIN material m ON m.id = si.material_id
        WHERE si.storage_id = ?
        ORDER BY m.name ASC
    ');
    $stmt->execute([$id]);
    $result = array_map(function($s) {
        return [
            'id' => (int)$s['id'],
            'storageId' => (int)$s['storage_id'],
            'materialId' => (int)$s['material_id'],
            'quantity' => (int)$s['quantity'],
            'expirationDate' => $s['expiration_date'],
            'material' => ['id' => (int)$s['material_id'], 'name' => $s['material_name']],
        ];
    }, $stmt->fetchAll());

    jsonResponse($result);
}

function handleAddStock(int $id): void {
    requireAuth();
    $body = getRequestBody();
    $materialId = $body['materialId'] ?? null;
    $quantity = $body['quantity'] ?? null;
    $expirationDate = $body['expirationDate'] ?? null;

    if (!$materialId || !$quantity || (int)$quantity <= 0) {
        errorResponse('Matériel et quantité requis', 400);
    }

    $db = getDB();

    $stmt = $db->prepare('SELECT * FROM stock_item WHERE storage_id = ? AND material_id = ? AND (expiration_date = ? OR (expiration_date IS NULL AND ? IS NULL))');
    $stmt->execute([$id, (int)$materialId, $expirationDate, $expirationDate]);
    $existing = $stmt->fetch();

    if ($existing) {
        $newQty = (int)$existing['quantity'] + (int)$quantity;
        $db->prepare('UPDATE stock_item SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            ->execute([$newQty, $existing['id']]);

        $stmt = $db->prepare('SELECT si.*, m.name as material_name FROM stock_item si JOIN material m ON m.id = si.material_id WHERE si.id = ?');
        $stmt->execute([$existing['id']]);
    } else {
        $db->prepare('INSERT INTO stock_item (storage_id, material_id, quantity, expiration_date) VALUES (?, ?, ?, ?)')
            ->execute([$id, (int)$materialId, (int)$quantity, $expirationDate]);
        $newId = $db->lastInsertId();

        $stmt = $db->prepare('SELECT si.*, m.name as material_name FROM stock_item si JOIN material m ON m.id = si.material_id WHERE si.id = ?');
        $stmt->execute([$newId]);
    }

    $s = $stmt->fetch();
    jsonResponse([
        'id' => (int)$s['id'],
        'storageId' => (int)$s['storage_id'],
        'materialId' => (int)$s['material_id'],
        'quantity' => (int)$s['quantity'],
        'expirationDate' => $s['expiration_date'],
        'material' => ['id' => (int)$s['material_id'], 'name' => $s['material_name']],
    ], $existing ? 200 : 201);
}
