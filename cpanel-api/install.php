<?php
declare(strict_types=1);

const CONFIG_FILE = __DIR__ . '/private/config.local.php';
const SCHEMA_FILE = __DIR__ . '/database/schema.sql';
const SETUP_KEY_FILE = __DIR__ . '/private/setup.key';

if (is_file(CONFIG_FILE)) {
    http_response_code(410);
    exit('SiteGuard API is already configured. Delete private/config.local.php manually only if you intentionally want to reinstall it.');
}

$error = '';
$success = null;
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $setupKey = trim((string)($_POST['setup_key'] ?? ''));
    $expectedSetupKey = is_file(SETUP_KEY_FILE) ? trim((string)file_get_contents(SETUP_KEY_FILE)) : '';
    $host = trim((string)($_POST['db_host'] ?? 'localhost'));
    $port = max(1, (int)($_POST['db_port'] ?? 3306));
    $name = trim((string)($_POST['db_name'] ?? ''));
    $user = trim((string)($_POST['db_user'] ?? ''));
    $pass = (string)($_POST['db_password'] ?? '');
    $installSchema = isset($_POST['install_schema']);

    if ($expectedSetupKey === '' || $setupKey === '' || !hash_equals($expectedSetupKey, $setupKey)) {
        $error = 'Invalid setup key.';
    } elseif ($host === '' || $name === '' || $user === '') {
        $error = 'Database host, database name and database user are required.';
    } else {
        try {
            $pdo = new PDO(
                "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
                $user,
                $pass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
            );
            if ($installSchema) {
                $sql = file_get_contents(SCHEMA_FILE);
                if ($sql === false) throw new RuntimeException('Could not read schema.sql');
                foreach (preg_split('/;\s*(?:\r?\n|$)/', $sql) as $statement) {
                    $statement = trim($statement);
                    if ($statement !== '') $pdo->exec($statement);
                }
            }

            $apiSecret = rtrim(strtr(base64_encode(random_bytes(36)), '+/', '-_'), '=');
            $sessionSecret = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
            $encryptionKey = bin2hex(random_bytes(32));
            $config = [
                'db_host' => $host,
                'db_port' => $port,
                'db_name' => $name,
                'db_user' => $user,
                'db_password' => $pass,
                'api_secret_hash' => hash('sha256', $apiSecret),
                'encryption_key' => $encryptionKey,
            ];
            $contents = "<?php\nreturn " . var_export($config, true) . ";\n";
            if (!is_dir(dirname(CONFIG_FILE))) mkdir(dirname(CONFIG_FILE), 0700, true);
            if (file_put_contents(CONFIG_FILE, $contents, LOCK_EX) === false) {
                throw new RuntimeException('Could not write private/config.local.php');
            }
            @chmod(CONFIG_FILE, 0600);

            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $hostHeader = $_SERVER['HTTP_HOST'] ?? '';
            $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
            $apiUrl = $scheme . '://' . $hostHeader . ($dir ? $dir : '') . '/index.php';
            @unlink(SETUP_KEY_FILE);
            $success = ['url' => $apiUrl, 'secret' => $apiSecret, 'session' => $sessionSecret];
        } catch (Throwable $e) {
            $error = $e->getMessage();
        }
    }
}
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SiteGuard API Setup</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#0b0d10;color:#f4f5f6}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:32px}.card{width:min(720px,100%);background:#12161b;border:1px solid #252b33;border-radius:20px;padding:28px;box-shadow:0 18px 60px rgba(0,0,0,.35)}h1{margin:0 0 8px;font-size:28px}p{color:#aeb7c2;line-height:1.6}.grid{display:grid;grid-template-columns:1fr 140px;gap:14px}.field{margin:14px 0}.field label{display:block;font-size:13px;color:#c8d0d8;margin-bottom:7px}input{width:100%;box-sizing:border-box;background:#0b0e12;color:#fff;border:1px solid #303844;border-radius:11px;padding:12px 13px;font:inherit}button{border:0;border-radius:12px;padding:13px 18px;font:700 14px inherit;cursor:pointer;background:#f4f5f6;color:#111}.notice{padding:14px 16px;border-radius:12px;margin:18px 0;background:#171d24;border:1px solid #303944}.error{border-color:#68373b;color:#ffc0c4}.success{border-color:#315d49}.code{background:#080a0d;border:1px solid #28303a;border-radius:12px;padding:14px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:#dce6ef}.check{display:flex;gap:10px;align-items:flex-start;margin:18px 0}.check input{width:auto;margin-top:4px}.muted{font-size:13px;color:#8e98a4}
</style>
</head>
<body><main class="card">
<h1>SiteGuard API Setup</h1>
<p>This creates the local MariaDB connection, installs the SiteGuard schema if selected, and generates the server secret used by Vercel. The encryption key remains only on this cPanel server.</p>
<?php if ($error): ?><div class="notice error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
<?php if ($success): ?>
<div class="notice success"><strong>Setup complete.</strong> Save these three Vercel environment variables now. The API secret is shown only on this screen.</div>
<div class="code">SITEGUARD_API_URL=<?= htmlspecialchars($success['url']) ?>
SITEGUARD_API_SECRET=<?= htmlspecialchars($success['secret']) ?>
SESSION_SECRET=<?= htmlspecialchars($success['session']) ?></div>
<p class="muted">Add all three values to Vercel. Reloading install.php will be blocked after setup.</p>
<?php else: ?>
<form method="post" autocomplete="off">
<div class="field"><label>Setup key from private/setup.key</label><input name="setup_key" type="password" required></div>
<div class="grid"><div class="field"><label>MariaDB host</label><input name="db_host" value="localhost" required></div><div class="field"><label>Port</label><input name="db_port" inputmode="numeric" value="3306" required></div></div>
<div class="field"><label>Database name</label><input name="db_name" required></div>
<div class="field"><label>Database user</label><input name="db_user" required></div>
<div class="field"><label>Database password</label><input name="db_password" type="password"></div>
<label class="check"><input type="checkbox" name="install_schema" checked><span>Install the SiteGuard tables automatically. Leave this enabled for a new database. You can alternatively import <strong>database/schema.sql</strong> through phpMyAdmin.</span></label>
<button type="submit">Configure API</button>
</form>
<?php endif; ?>
</main></body></html>
