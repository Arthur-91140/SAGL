<?php
/**
 * SAGL - API Auth
 */

function handleLogin(): void {
    $body = getRequestBody();
    $username = $body['username'] ?? '';
    $password = $body['password'] ?? '';

    if (empty($username) || empty($password)) {
        errorResponse('Identifiant et mot de passe requis', 400);
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT id, username, password FROM admin WHERE username = ?');
    $stmt->execute([$username]);
    $admin = $stmt->fetch();

    if (!$admin || !password_verify($password, $admin['password'])) {
        errorResponse('Identifiants incorrects', 401);
    }

    $token = generateToken($admin['id']);
    jsonResponse(['token' => $token, 'username' => $admin['username']]);
}

function handleMe(): void {
    $adminId = requireAuth();
    $db = getDB();
    $stmt = $db->prepare('SELECT id, username FROM admin WHERE id = ?');
    $stmt->execute([$adminId]);
    $admin = $stmt->fetch();

    if (!$admin) {
        errorResponse('Admin non trouvé', 404);
    }

    jsonResponse($admin);
}

function handleChangePassword(): void {
    $adminId = requireAuth();
    $body = getRequestBody();
    $currentPassword = $body['currentPassword'] ?? '';
    $newPassword = $body['newPassword'] ?? '';

    if (empty($currentPassword) || empty($newPassword)) {
        errorResponse('Mot de passe actuel et nouveau mot de passe requis', 400);
    }

    if (strlen($newPassword) < 4) {
        errorResponse('Le nouveau mot de passe doit faire au moins 4 caractères', 400);
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT id, password FROM admin WHERE id = ?');
    $stmt->execute([$adminId]);
    $admin = $stmt->fetch();

    if (!$admin) {
        errorResponse('Admin non trouvé', 404);
    }

    if (!password_verify($currentPassword, $admin['password'])) {
        errorResponse('Mot de passe actuel incorrect', 401);
    }

    $hash = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt = $db->prepare('UPDATE admin SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    $stmt->execute([$hash, $adminId]);

    jsonResponse(['message' => 'Mot de passe modifié avec succès']);
}
