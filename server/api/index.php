<?php
declare(strict_types=1);

/* D5 WebTool API front controller. All /api/* requests are rewritten here by .htaccess. */

require __DIR__ . '/src/core.php';
require __DIR__ . '/src/routes.php';

set_exception_handler(function (Throwable $e) {
    if ($e instanceof HttpError) send($e->status, ['error' => $e->getMessage()] + $e->extra);
    error_log('[d5wt] ' . $e->getMessage());
    send(500, ['error' => 'Server error']);
});

if (!is_configured()) send(503, ['error' => 'Not set up yet. Open setup.php to finish the installation.', 'setup' => true]);

// path after the /api folder, e.g. /auth/login
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php')), '/');
$path = '/' . ltrim(substr($uri, strlen($base)), '/');
if ($path === '/index.php') $path = '/';
$path = rtrim($path, '/') ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

foreach (ROUTES as [$m, $pattern, $handler]) {
    if (preg_match($pattern, $path, $matches)) {
        if ($m !== $method) continue;
        send(200, $handler($matches));
    }
}
send(404, ['error' => 'Not found']);
