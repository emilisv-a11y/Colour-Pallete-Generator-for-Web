<?php
declare(strict_types=1);

/* ---------- config & database ---------- */

function config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $file = dirname(__DIR__) . '/config.php';
        $cfg = is_file($file) ? require $file : [];
    }
    return $cfg;
}

function is_configured(): bool
{
    return isset(config()['db_name']);
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config();
        $pdo = new PDO(
            sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $c['db_host'] ?? 'localhost', $c['db_name']),
            $c['db_user'] ?? '',
            $c['db_pass'] ?? '',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]
        );
    }
    return $pdo;
}

function q(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

/* ---------- HTTP ---------- */

final class HttpError extends Exception
{
    public function __construct(public int $status, string $message, public array $extra = [])
    {
        parent::__construct($message);
    }
}

function fail(int $status, string $message, array $extra = []): never
{
    throw new HttpError($status, $message, $extra);
}

function send(int $status, $data): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

const MAX_BODY = 8 * 1024 * 1024;

function body(): array
{
    $raw = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
    if ($raw === false || $raw === '') return [];
    if (strlen($raw) > MAX_BODY) fail(413, 'Request too large');
    $data = json_decode($raw, true);
    if (!is_array($data)) fail(400, 'Invalid JSON');
    return $data;
}

function str_field(array $b, string $key, int $max, bool $required = false): string
{
    $v = $b[$key] ?? '';
    if (!is_string($v)) fail(400, "Invalid $key");
    $v = trim($v);
    if ($required && $v === '') fail(400, "Missing $key");
    if (mb_strlen($v) > $max) fail(400, "$key is too long");
    return $v;
}

/** State-changing requests must carry a custom header, which cross-site forms cannot send (CSRF protection). */
function require_app_header(): void
{
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'd5wt') fail(403, 'Missing request header');
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/* ---------- rate limiting ---------- */

/** Allow at most $max events per $seconds for a bucket; throws 429 when exceeded. */
function rate_limit(string $bucket, int $max, int $seconds): void
{
    $bucket = substr(hash('sha256', $bucket), 0, 40);
    q('DELETE FROM d5_rate WHERE at < (NOW() - INTERVAL 1 DAY)');
    $n = (int) q('SELECT COUNT(*) FROM d5_rate WHERE bucket = ? AND at > (NOW() - INTERVAL ? SECOND)', [$bucket, $seconds])->fetchColumn();
    if ($n >= $max) fail(429, 'Too many attempts. Please wait a few minutes and try again.');
    q('INSERT INTO d5_rate (bucket) VALUES (?)', [$bucket]);
}

/* ---------- auth ---------- */

const AUTH_COOKIE = 'd5wt_auth';
const AUTH_DAYS = 30;

function cookie_params(int $expires): array
{
    return [
        'expires' => $expires,
        'path' => '/',
        'secure' => (bool) (config()['secure_cookies'] ?? true),
        'httponly' => true,
        'samesite' => 'Lax',
    ];
}

function issue_token(int $userId): void
{
    $token = bin2hex(random_bytes(32));
    q('DELETE FROM d5_tokens WHERE expires_at < NOW()');
    q('INSERT INTO d5_tokens (token_hash, user_id, expires_at) VALUES (?, ?, NOW() + INTERVAL ? DAY)', [hash('sha256', $token), $userId, AUTH_DAYS]);
    setcookie(AUTH_COOKIE, $token, cookie_params(time() + AUTH_DAYS * 86400));
}

function current_user(): ?array
{
    static $user = false;
    if ($user !== false) return $user;
    $token = $_COOKIE[AUTH_COOKIE] ?? '';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) return $user = null;
    $row = q(
        'SELECT u.id, u.email, u.name, u.role, u.must_change_password FROM d5_tokens t JOIN d5_users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.expires_at > NOW()',
        [hash('sha256', $token)]
    )->fetch();
    return $user = ($row ?: null);
}

function require_user(): array
{
    $u = current_user();
    if (!$u) fail(401, 'Please sign in');
    return $u;
}

function require_owner(): array
{
    $u = require_user();
    if ($u['role'] !== 'owner') fail(403, 'Only the owner can do this');
    return $u;
}

function public_user(array $u): array
{
    return ['id' => (int) $u['id'], 'email' => $u['email'], 'name' => $u['name'], 'role' => $u['role'], 'mustChangePassword' => (bool) $u['must_change_password']];
}

function valid_password(string $p): void
{
    if (mb_strlen($p) < 10) fail(400, 'Use at least 10 characters for the password');
    if (mb_strlen($p) > 200) fail(400, 'Password is too long');
}

/* ---------- misc ---------- */

function next_seq(): int
{
    // atomic counter for sync ordering (no clock skew between devices)
    q("INSERT INTO d5_counter (name, value) VALUES ('items', 1) ON DUPLICATE KEY UPDATE value = LAST_INSERT_ID(value + 1)");
    $id = (int) db()->lastInsertId();
    return $id > 0 ? $id : (int) q("SELECT value FROM d5_counter WHERE name = 'items'")->fetchColumn();
}

function random_token(int $bytes = 24): string
{
    return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
}
