<?php
/**
 * SAGL - Fonctions utilitaires
 */

require_once __DIR__ . '/config.php';

// --- JSON Response ---

function jsonResponse($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function errorResponse(string $message, int $status = 400): void {
    jsonResponse(['error' => $message], $status);
}

// --- JWT ---

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

function generateToken(int $adminId): string {
    $header = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64UrlEncode(json_encode([
        'adminId' => $adminId,
        'iat' => time(),
        'exp' => time() + JWT_EXPIRY,
    ]));
    $signature = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

function verifyToken(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $signature] = $parts;

    $expectedSig = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expectedSig, $signature)) return null;

    $data = json_decode(base64UrlDecode($payload), true);
    if (!$data) return null;

    if (isset($data['exp']) && $data['exp'] < time()) return null;

    return $data;
}

/**
 * Vérifie l'authentification et retourne l'adminId ou envoie une erreur 401
 */
function requireAuth(): int {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
        errorResponse('Token manquant', 401);
    }

    $token = substr($authHeader, 7);
    $data = verifyToken($token);

    if (!$data || !isset($data['adminId'])) {
        errorResponse('Token invalide', 401);
    }

    return (int) $data['adminId'];
}

// --- Request helpers ---

function getRequestBody(): array {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}

function getMethod(): string {
    return $_SERVER['REQUEST_METHOD'];
}

// --- Greeting ---

function getGreeting(string $type): string {
    $hour = (int) date('G');

    if ($hour >= 5 && $hour < 10) {
        switch ($type) {
            case 'START': return 'Bonne matinée et bon début de mission !';
            case 'END': return "Bonne matinée ! On espère que tout s'est bien passé.";
            default: return 'Bonne matinée !';
        }
    }
    if ($hour >= 10 && $hour < 14) {
        switch ($type) {
            case 'START': return 'Bonne journée et bon courage pour cette mission !';
            case 'END': return "Bonne fin de matinée ! On espère que la mission s'est bien déroulée.";
            default: return 'Bonne journée !';
        }
    }
    if ($hour >= 14 && $hour < 18) {
        switch ($type) {
            case 'START': return "Bon après-midi et bon début de mission !";
            case 'END': return "Bon après-midi ! On espère que tout s'est bien passé.";
            default: return "Bon après-midi !";
        }
    }
    if ($hour >= 18 && $hour < 21) {
        switch ($type) {
            case 'START': return 'Bonne soirée et bon courage pour cette mission !';
            case 'END': return "Bonne soirée ! On espère que la mission s'est bien déroulée.";
            default: return 'Bonne soirée !';
        }
    }
    // 21h - 5h
    switch ($type) {
        case 'START': return 'Bonne nuit et bon courage pour cette mission !';
        case 'END': return "Bonne nuit ! On espère que tout s'est bien passé.";
        default: return 'Bonne nuit !';
    }
}

// --- UUID ---

function generateUUID(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

// --- CORS ---

function handleCors(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
