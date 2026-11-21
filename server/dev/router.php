<?php
// Local development router for `php -S`: mimics the .htaccess rules used on Hostinger.
//   php -S 127.0.0.1:8080 -t <folder with index.html and api/> server/dev/router.php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$root = $_SERVER['DOCUMENT_ROOT'];
if (preg_match('#/api/(config\.php|config\.example\.php|schema\.sql|src/|\.htaccess)#', $uri)) {
    http_response_code(403);
    echo 'Forbidden';
    return true;
}
if (preg_match('#^(.*)/api/setup\.php$#', $uri)) return false;
if (preg_match('#^(.*/api)(/.*)?$#', $uri, $m)) {
    $_SERVER['SCRIPT_NAME'] = $m[1] . '/index.php';
    require $root . $m[1] . '/index.php';
    return true;
}
return false;
