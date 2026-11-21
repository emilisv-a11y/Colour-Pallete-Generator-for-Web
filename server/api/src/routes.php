<?php
declare(strict_types=1);

/* ============================================================================
   Routes. Each handler receives the regex captures and returns data to send.
   ========================================================================== */

/* ---------- auth ---------- */

function auth_login(): array
{
    require_app_header();
    $b = body();
    $email = mb_strtolower(str_field($b, 'email', 190, true));
    $password = is_string($b['password'] ?? null) ? $b['password'] : '';
    rate_limit('login-ip:' . client_ip(), 20, 900);
    rate_limit('login-email:' . $email, 10, 900);
    $u = q('SELECT * FROM d5_users WHERE email = ?', [$email])->fetch();
    // verify even when the user doesn't exist, so timing doesn't reveal which emails are registered
    $ok = password_verify($password, $u['password_hash'] ?? '$2y$10$CvXQVQ.e.D4IBZQstPLodOD6.7jwxeQ7cE11SXM15Tdh86fQFJy/S');
    if (!$u || !$ok) fail(401, 'Wrong email or password');
    if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
        q('UPDATE d5_users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $u['id']]);
    }
    q('UPDATE d5_users SET last_login = NOW() WHERE id = ?', [$u['id']]);
    issue_token((int) $u['id']);
    return ['user' => public_user($u)];
}

function auth_logout(): array
{
    require_app_header();
    $token = $_COOKIE[AUTH_COOKIE] ?? '';
    if (is_string($token) && $token !== '') q('DELETE FROM d5_tokens WHERE token_hash = ?', [hash('sha256', $token)]);
    setcookie(AUTH_COOKIE, '', cookie_params(time() - 3600));
    return ['ok' => true];
}

function auth_logout_all(): array
{
    require_app_header();
    $u = require_user();
    q('DELETE FROM d5_tokens WHERE user_id = ?', [$u['id']]);
    setcookie(AUTH_COOKIE, '', cookie_params(time() - 3600));
    return ['ok' => true];
}

function auth_me(): array
{
    $u = current_user();
    return ['user' => $u ? public_user($u) : null];
}

function auth_password(): array
{
    require_app_header();
    $u = require_user();
    $b = body();
    $current = is_string($b['current'] ?? null) ? $b['current'] : '';
    $new = is_string($b['password'] ?? null) ? $b['password'] : '';
    rate_limit('pw:' . $u['id'], 10, 900);
    $row = q('SELECT password_hash FROM d5_users WHERE id = ?', [$u['id']])->fetch();
    if (!password_verify($current, $row['password_hash'])) fail(400, 'Current password is wrong');
    valid_password($new);
    q('UPDATE d5_users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [password_hash($new, PASSWORD_DEFAULT), $u['id']]);
    // sign out other devices, keep this one
    $token = $_COOKIE[AUTH_COOKIE] ?? '';
    q('DELETE FROM d5_tokens WHERE user_id = ? AND token_hash <> ?', [$u['id'], hash('sha256', (string) $token)]);
    return ['ok' => true];
}

/* ---------- team ---------- */

function users_list(): array
{
    require_user();
    $rows = q('SELECT id, email, name, role, must_change_password, created_at, last_login FROM d5_users ORDER BY role = \'owner\' DESC, created_at')->fetchAll();
    return ['users' => array_map(fn ($r) => public_user($r) + ['createdAt' => $r['created_at'], 'lastLogin' => $r['last_login']], $rows)];
}

function users_create(): array
{
    require_app_header();
    require_owner();
    $b = body();
    $email = mb_strtolower(str_field($b, 'email', 190, true));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail(400, 'Invalid email address');
    $name = str_field($b, 'name', 120);
    $password = is_string($b['password'] ?? null) ? $b['password'] : '';
    valid_password($password);
    if (q('SELECT id FROM d5_users WHERE email = ?', [$email])->fetch()) fail(409, 'That email already has an account');
    q('INSERT INTO d5_users (email, name, password_hash, role, must_change_password) VALUES (?, ?, ?, \'member\', 1)', [$email, $name, password_hash($password, PASSWORD_DEFAULT)]);
    return users_list();
}

function users_delete(array $m): array
{
    require_app_header();
    $me = require_owner();
    $id = (int) $m[1];
    if ($id === (int) $me['id']) fail(400, "You can't remove your own account");
    q('DELETE FROM d5_users WHERE id = ? AND role <> \'owner\'', [$id]);
    return users_list();
}

function users_reset(array $m): array
{
    require_app_header();
    require_owner();
    $b = body();
    $password = is_string($b['password'] ?? null) ? $b['password'] : '';
    valid_password($password);
    q('UPDATE d5_users SET password_hash = ?, must_change_password = 1 WHERE id = ? AND role <> \'owner\'', [password_hash($password, PASSWORD_DEFAULT), (int) $m[1]]);
    q('DELETE FROM d5_tokens WHERE user_id = ?', [(int) $m[1]]);
    return ['ok' => true];
}

/* ---------- sync ---------- */

const SYNC_KINDS = ['project', 'palette', 'session', 'settings'];

/**
 * Push changed items and pull everything newer than `since` (a server sequence number).
 * Conflicts resolve per item: the newer `updatedAt` (client clock, milliseconds) wins.
 */
function sync(): array
{
    require_app_header();
    $u = require_user();
    $b = body();
    $since = max(0, (int) ($b['since'] ?? 0));
    $items = $b['items'] ?? [];
    if (!is_array($items) || count($items) > 2000) fail(400, 'Invalid items');

    $accepted = 0;
    $rejected = [];
    db()->beginTransaction();
    try {
        foreach ($items as $it) {
            $kind = $it['kind'] ?? '';
            $id = $it['id'] ?? '';
            $updated = $it['updatedAt'] ?? null;
            if (!in_array($kind, SYNC_KINDS, true) || !is_string($id) || !preg_match('/^[A-Za-z0-9_.:-]{1,64}$/', $id) || !is_int($updated)) {
                $rejected[] = ['kind' => $kind, 'id' => $id, 'reason' => 'invalid'];
                continue;
            }
            $deleted = !empty($it['deleted']);
            $data = $deleted ? null : json_encode($it['data'] ?? null, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $cur = q('SELECT updated_at FROM d5_items WHERE kind = ? AND id = ? FOR UPDATE', [$kind, $id])->fetch();
            if ($cur && (int) $cur['updated_at'] >= $updated) {
                $rejected[] = ['kind' => $kind, 'id' => $id, 'reason' => 'older'];
                continue;
            }
            q(
                'INSERT INTO d5_items (kind, id, data, updated_at, deleted, seq, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at), deleted = VALUES(deleted), seq = VALUES(seq), updated_by = VALUES(updated_by)',
                [$kind, $id, $data, $updated, $deleted ? 1 : 0, next_seq(), $u['id']]
            );
            $accepted++;
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    $rows = q('SELECT kind, id, data, updated_at, deleted, seq FROM d5_items WHERE seq > ? ORDER BY seq LIMIT 5000', [$since])->fetchAll();
    $out = array_map(fn ($r) => [
        'kind' => $r['kind'],
        'id' => $r['id'],
        'updatedAt' => (int) $r['updated_at'],
        'deleted' => (bool) $r['deleted'],
        'seq' => (int) $r['seq'],
        'data' => $r['deleted'] ? null : json_decode((string) $r['data'], true),
    ], $rows);
    $max = (int) q('SELECT COALESCE(MAX(seq), 0) FROM d5_items')->fetchColumn();
    return ['accepted' => $accepted, 'rejected' => $rejected, 'items' => $out, 'seq' => $max];
}

/* ---------- reviews (owner side) ---------- */

function review_row(array $r): array
{
    $counts = q('SELECT kind, COUNT(*) n FROM d5_review_events WHERE review_id = ? AND from_owner = 0 GROUP BY kind', [$r['id']])->fetchAll();
    $c = ['comment' => 0, 'choice' => 0, 'approve' => 0];
    foreach ($counts as $x) $c[$x['kind']] = (int) $x['n'];
    $approval = q('SELECT author, created_at FROM d5_review_events WHERE review_id = ? AND kind = \'approve\' ORDER BY id DESC LIMIT 1', [$r['id']])->fetch();
    return [
        'id' => (int) $r['id'],
        'token' => $r['token'],
        'projectId' => $r['project_id'],
        'title' => $r['title'],
        'lang' => $r['lang'],
        'hasPin' => $r['pin_hash'] !== null,
        'expiresAt' => $r['expires_at'],
        'active' => (bool) $r['active'],
        'createdAt' => $r['created_at'],
        'updatedAt' => $r['updated_at'],
        'views' => (int) $r['views'],
        'lastViewed' => $r['last_viewed'],
        'counts' => $c,
        'approval' => $approval ? ['author' => $approval['author'], 'at' => $approval['created_at']] : null,
    ];
}

function review_input(array $b, bool $creating): array
{
    $out = [];
    if ($creating || array_key_exists('title', $b)) $out['title'] = str_field($b, 'title', 190);
    if ($creating || array_key_exists('lang', $b)) {
        $lang = $b['lang'] ?? 'en';
        if (!in_array($lang, ['en', 'lt'], true)) fail(400, 'Invalid language');
        $out['lang'] = $lang;
    }
    if ($creating || array_key_exists('snapshot', $b)) {
        if (!is_array($b['snapshot'] ?? null)) fail(400, 'Missing snapshot');
        $out['snapshot'] = json_encode($b['snapshot'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    if (array_key_exists('pin', $b)) {
        $pin = $b['pin'];
        if ($pin === null || $pin === '') $out['pin_hash'] = null;
        else {
            if (!is_string($pin) || !preg_match('/^[0-9A-Za-z]{4,12}$/', $pin)) fail(400, 'PIN must be 4–12 letters or digits');
            $out['pin_hash'] = password_hash($pin, PASSWORD_DEFAULT);
        }
    }
    if (array_key_exists('expiresAt', $b)) {
        $e = $b['expiresAt'];
        if ($e === null || $e === '') $out['expires_at'] = null;
        else {
            if (!is_string($e) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $e)) fail(400, 'Invalid expiry date');
            $out['expires_at'] = $e . ' 23:59:59';
        }
    }
    if (array_key_exists('active', $b)) $out['active'] = $b['active'] ? 1 : 0;
    return $out;
}

function reviews_list(): array
{
    require_user();
    $project = is_string($_GET['project'] ?? null) ? $_GET['project'] : '';
    $rows = $project !== ''
        ? q('SELECT * FROM d5_reviews WHERE project_id = ? ORDER BY created_at DESC', [(string) $project])->fetchAll()
        : q('SELECT * FROM d5_reviews ORDER BY created_at DESC LIMIT 200')->fetchAll();
    return ['reviews' => array_map('review_row', $rows)];
}

function reviews_create(): array
{
    require_app_header();
    $u = require_user();
    $b = body();
    $projectId = str_field($b, 'projectId', 64, true);
    $in = review_input($b, true);
    $token = random_token(24);
    q(
        'INSERT INTO d5_reviews (token, project_id, title, lang, snapshot, pin_hash, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [$token, $projectId, $in['title'], $in['lang'], $in['snapshot'], $in['pin_hash'] ?? null, $in['expires_at'] ?? null, $u['id']]
    );
    return ['review' => review_row(q('SELECT * FROM d5_reviews WHERE token = ?', [$token])->fetch())];
}

function reviews_update(array $m): array
{
    require_app_header();
    require_user();
    $in = review_input(body(), false);
    if ($in) {
        $sets = implode(', ', array_map(fn ($k) => "$k = ?", array_keys($in)));
        q("UPDATE d5_reviews SET $sets, updated_at = NOW() WHERE id = ?", [...array_values($in), (int) $m[1]]);
    }
    $r = q('SELECT * FROM d5_reviews WHERE id = ?', [(int) $m[1]])->fetch();
    if (!$r) fail(404, 'Review link not found');
    return ['review' => review_row($r)];
}

function reviews_delete(array $m): array
{
    require_app_header();
    require_user();
    q('DELETE FROM d5_reviews WHERE id = ?', [(int) $m[1]]);
    return ['ok' => true];
}

function events_of(int $reviewId): array
{
    return array_map(fn ($e) => [
        'id' => (int) $e['id'],
        'kind' => $e['kind'],
        'item' => $e['item'],
        'author' => $e['author'],
        'fromOwner' => (bool) $e['from_owner'],
        'body' => $e['body'],
        'at' => $e['created_at'],
    ], q('SELECT * FROM d5_review_events WHERE review_id = ? ORDER BY id', [$reviewId])->fetchAll());
}

function reviews_events(array $m): array
{
    require_user();
    return ['events' => events_of((int) $m[1])];
}

function reviews_reply(array $m): array
{
    require_app_header();
    $u = require_user();
    $b = body();
    $body = str_field($b, 'body', 4000, true);
    $item = str_field($b, 'item', 64) ?: 'general';
    if (!q('SELECT id FROM d5_reviews WHERE id = ?', [(int) $m[1]])->fetch()) fail(404, 'Review link not found');
    q('INSERT INTO d5_review_events (review_id, kind, item, author, from_owner, body) VALUES (?, \'comment\', ?, ?, 1, ?)', [(int) $m[1], $item, $u['name'] ?: $u['email'], $body]);
    return ['events' => events_of((int) $m[1])];
}

/* ---------- reviews (public, by token) ---------- */

function public_review(string $token): array
{
    if (!preg_match('/^[A-Za-z0-9_-]{16,64}$/', $token)) fail(404, 'This review link does not exist');
    $r = q('SELECT * FROM d5_reviews WHERE token = ?', [$token])->fetch();
    if (!$r || !$r['active']) fail(404, 'This review link does not exist or has been switched off');
    if ($r['expires_at'] !== null && strtotime($r['expires_at']) < time()) fail(410, 'This review link has expired');
    if ($r['pin_hash'] !== null) {
        rate_limit('pin:' . client_ip() . ':' . $token, 15, 900);
        $pin = $_SERVER['HTTP_X_REVIEW_PIN'] ?? '';
        if ($pin === '' || !password_verify((string) $pin, $r['pin_hash'])) fail(401, 'PIN required', ['pin' => true, 'lang' => $r['lang']]);
    }
    return $r;
}

function review_view(array $m): array
{
    $r = public_review($m[1]);
    q('UPDATE d5_reviews SET views = views + 1, last_viewed = NOW() WHERE id = ?', [$r['id']]);
    $row = review_row($r);
    return [
        'title' => $r['title'],
        'lang' => $r['lang'],
        'snapshot' => json_decode($r['snapshot'], true),
        'events' => events_of((int) $r['id']),
        'approval' => $row['approval'],
    ];
}

function review_post(array $m): array
{
    require_app_header();
    $r = public_review($m[1]);
    rate_limit('review-post:' . client_ip() . ':' . $r['id'], 40, 600);
    $b = body();
    $kind = $b['kind'] ?? '';
    if (!in_array($kind, ['comment', 'choice', 'approve'], true)) fail(400, 'Invalid feedback type');
    $author = str_field($b, 'author', 120, true);
    $item = str_field($b, 'item', 64) ?: 'general';
    $body = str_field($b, 'body', 4000, $kind === 'comment');
    if (!preg_match('/^[A-Za-z0-9_.:-]{1,64}$/', $item)) fail(400, 'Invalid item');
    q('INSERT INTO d5_review_events (review_id, kind, item, author, body) VALUES (?, ?, ?, ?, ?)', [$r['id'], $kind, $item, $author, $body]);
    $row = review_row($r);
    return ['events' => events_of((int) $r['id']), 'approval' => $row['approval']];
}

/* ---------- route table ---------- */

const ROUTES = [
    ['GET', '#^/health$#', 'health'],
    ['POST', '#^/auth/login$#', 'auth_login'],
    ['POST', '#^/auth/logout$#', 'auth_logout'],
    ['POST', '#^/auth/logout-all$#', 'auth_logout_all'],
    ['GET', '#^/auth/me$#', 'auth_me'],
    ['POST', '#^/auth/password$#', 'auth_password'],
    ['GET', '#^/users$#', 'users_list'],
    ['POST', '#^/users$#', 'users_create'],
    ['DELETE', '#^/users/(\d+)$#', 'users_delete'],
    ['POST', '#^/users/(\d+)/password$#', 'users_reset'],
    ['POST', '#^/sync$#', 'sync'],
    ['GET', '#^/reviews$#', 'reviews_list'],
    ['POST', '#^/reviews$#', 'reviews_create'],
    ['PATCH', '#^/reviews/(\d+)$#', 'reviews_update'],
    ['DELETE', '#^/reviews/(\d+)$#', 'reviews_delete'],
    ['GET', '#^/reviews/(\d+)/events$#', 'reviews_events'],
    ['POST', '#^/reviews/(\d+)/events$#', 'reviews_reply'],
    ['GET', '#^/r/([A-Za-z0-9_-]+)$#', 'review_view'],
    ['POST', '#^/r/([A-Za-z0-9_-]+)/events$#', 'review_post'],
];

function health(): array
{
    $users = (int) q('SELECT COUNT(*) FROM d5_users')->fetchColumn();
    return ['ok' => true, 'app' => 'd5-webtool', 'ready' => $users > 0, 'version' => 1];
}
