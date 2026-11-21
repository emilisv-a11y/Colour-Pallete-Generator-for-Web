<?php
declare(strict_types=1);

/* One-time installer: connects to the database, creates the tables, writes config.php and the owner account.
   It refuses to run again once an owner exists. */

require __DIR__ . '/src/core.php';

header('Content-Type: text/html; charset=utf-8');
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');

$configFile = __DIR__ . '/config.php';
$error = '';
$done = false;

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function owner_exists(): bool
{
    try {
        return (int) q("SELECT COUNT(*) FROM d5_users WHERE role = 'owner'")->fetchColumn() > 0;
    } catch (Throwable $e) {
        return false;
    }
}

$configured = is_configured();
if ($configured && owner_exists()) {
    http_response_code(403);
    $locked = true;
} else {
    $locked = false;
}

if (!$locked && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    try {
        // same-origin form only
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== ($_SERVER['HTTP_HOST'] ?? '')) throw new RuntimeException('Invalid request origin.');

        if (!$configured) {
            $host = trim((string) ($_POST['db_host'] ?? 'localhost'));
            // only local databases: prevents someone pointing a fresh install at their own server
            if (!in_array($host, ['localhost', '127.0.0.1'], true)) throw new RuntimeException('Database host must be "localhost" (as on Hostinger).');
            $cfg = [
                'db_host' => $host,
                'db_name' => trim((string) ($_POST['db_name'] ?? '')),
                'db_user' => trim((string) ($_POST['db_user'] ?? '')),
                'db_pass' => (string) ($_POST['db_pass'] ?? ''),
                'secure_cookies' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            ];
            if ($cfg['db_name'] === '' || $cfg['db_user'] === '') throw new RuntimeException('Fill in the database name and user.');
            $pdo = new PDO(sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $cfg['db_host'], $cfg['db_name']), $cfg['db_user'], $cfg['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            // drop comment lines first (they may contain ';'), then run each CREATE statement
            $sql = preg_replace('/^\s*--.*$/m', '', (string) file_get_contents(__DIR__ . '/schema.sql'));
            foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
                if (stripos($stmt, 'CREATE') === 0) $pdo->exec($stmt);
            }
            $php = "<?php\n// Written by setup.php. Keep this file private; never commit it.\nreturn " . var_export($cfg, true) . ";\n";
            if (file_put_contents($configFile, $php, LOCK_EX) === false) throw new RuntimeException('Could not write config.php. Check that the api folder is writable.');
            @chmod($configFile, 0600);
        }

        // owner account (config now exists)
        $c = require $configFile;
        $pdo = new PDO(sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $c['db_host'], $c['db_name']), $c['db_user'], $c['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $count = (int) $pdo->query("SELECT COUNT(*) FROM d5_users WHERE role = 'owner'")->fetchColumn();
        if ($count > 0) throw new RuntimeException('An owner account already exists.');
        $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
        $name = trim((string) ($_POST['name'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Enter a valid email address.');
        if (mb_strlen($password) < 10) throw new RuntimeException('Use at least 10 characters for the password.');
        $st = $pdo->prepare("INSERT INTO d5_users (email, name, password_hash, role) VALUES (?, ?, ?, 'owner')");
        $st->execute([$email, $name, password_hash($password, PASSWORD_DEFAULT)]);
        $done = true;
    } catch (Throwable $e) {
        $error = $e instanceof PDOException ? (str_contains($e->getMessage(), '1045') || str_contains($e->getMessage(), '2002') ? 'Could not connect to the database: ' : 'Database error: ') . $e->getMessage() : $e->getMessage();
    }
}
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>D5 WebTool setup</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;background:#f6f5f2;color:#16181d;margin:0}
main{max-width:520px;margin:40px auto;padding:0 16px}
form,.box{background:#fff;border:1px solid #e2dfd8;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px}
label{display:flex;flex-direction:column;gap:4px;font-weight:600;font-size:.9rem}
input{font:inherit;padding:9px 11px;border:1px solid #cfcac0;border-radius:8px}
button{font:inherit;font-weight:700;padding:11px;border:0;border-radius:8px;background:#ff5a36;color:#fff;cursor:pointer}
fieldset{border:1px solid #e2dfd8;border-radius:8px;display:flex;flex-direction:column;gap:10px}
legend{font-weight:700;padding:0 6px}.err{background:#fde4e2;color:#a5231f;padding:10px 12px;border-radius:8px}
.ok{background:#ddf5ea;color:#0f6b48;padding:10px 12px;border-radius:8px}.muted{color:#5d6170;font-size:.88rem}
</style>
</head>
<body>
<main>
<h1>D5 WebTool setup</h1>
<?php if ($done): ?>
  <div class="ok"><strong>All set.</strong> Your account is ready and this setup page is now locked.</div>
  <p><a href="../">Open D5 WebTool</a> and sign in with the email and password you just chose.</p>
<?php elseif ($locked): ?>
  <div class="box"><strong>Setup is already complete.</strong><span class="muted">This page is locked. Sign in from the app.</span></div>
<?php else: ?>
  <p class="muted">This runs once. It creates the database tables, saves the connection details in <code>api/config.php</code> and creates your owner account.</p>
  <?php if ($error): ?><div class="err"><?= h($error) ?></div><?php endif; ?>
  <form method="post" autocomplete="off">
    <?php if (!$configured): ?>
    <fieldset>
      <legend>Database (from hPanel → Databases → MySQL Databases)</legend>
      <label>Host <input name="db_host" value="localhost" required></label>
      <label>Database name <input name="db_name" placeholder="u123456789_d5webtool" value="<?= h((string) ($_POST['db_name'] ?? '')) ?>" required></label>
      <label>Database user <input name="db_user" placeholder="u123456789_d5" value="<?= h((string) ($_POST['db_user'] ?? '')) ?>" required></label>
      <label>Database password <input name="db_pass" type="password" required></label>
    </fieldset>
    <?php endif; ?>
    <fieldset>
      <legend>Your owner account</legend>
      <label>Name <input name="name" value="<?= h((string) ($_POST['name'] ?? '')) ?>"></label>
      <label>Email <input name="email" type="email" value="<?= h((string) ($_POST['email'] ?? '')) ?>" required></label>
      <label>Password (at least 10 characters) <input name="password" type="password" minlength="10" required></label>
    </fieldset>
    <button type="submit">Finish setup</button>
  </form>
<?php endif; ?>
</main>
</body>
</html>
