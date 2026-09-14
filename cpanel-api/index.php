<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

const CONFIG_FILE = __DIR__ . '/private/config.local.php';

function json_out(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_file(CONFIG_FILE)) {
    json_out(503, ['error' => 'SiteGuard API is not configured. Open install.php first.']);
}

$config = require CONFIG_FILE;
if (!is_array($config)) {
    json_out(500, ['error' => 'Invalid API configuration']);
}

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $match)) {
    json_out(401, ['error' => 'Missing API authorization']);
}
$presentedSecret = trim($match[1]);
$expectedHash = (string)($config['api_secret_hash'] ?? '');
if ($expectedHash === '' || !hash_equals($expectedHash, hash('sha256', $presentedSecret))) {
    json_out(403, ['error' => 'Invalid API authorization']);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(405, ['error' => 'POST required']);
}

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body)) {
    json_out(400, ['error' => 'Invalid JSON body']);
}

try {
    $pdo = new PDO(
        'mysql:host=' . $config['db_host'] . ';port=' . (int)$config['db_port'] . ';dbname=' . $config['db_name'] . ';charset=utf8mb4',
        $config['db_user'],
        $config['db_password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    $action = (string)($body['action'] ?? '');
    if ($action === 'health') {
        $pdo->query('SELECT 1');
        json_out(200, ['ok' => true, 'database' => 'connected']);
    }
    if ($action === 'rpc') {
        handle_rpc($body, $config);
    }
    if ($action !== 'query') {
        json_out(400, ['error' => 'Unsupported action']);
    }
    handle_query($pdo, $body['query'] ?? null);
} catch (Throwable $e) {
    error_log('[SiteGuard API] ' . $e->getMessage());
    json_out(500, ['error' => 'Database API request failed']);
}

function schema_map(): array {
    return [
        'app_settings' => ['key','value','updated_at'],
        'websites' => [
            'id','category','name','url','url_key','importance','importance_score','status','hosting_provider','server_label','website_type','address','associated_email','ppc_enabled','notes','notes_from_laraib','date_added','last_reviewed_date','next_review_date','last_check_status','uses_wordpress','wordpress_login_url','wordpress_admin_email','wordpress_version','wp_users','wordpress_auto_updates','xml_rpc_disabled','php_version','theme_plugins_status','theme_plugins_status_other','theme_plugins_checked_at','security_plugin','security_plugin_other','comments_pings','comments_pings_other','firewall','firewall_other','caching_plugin','caching_plugin_other','image_compression','image_compression_other','gdpr_banner','gdpr_banner_other','external_link_security','external_link_security_other','captcha_protection','captcha_protection_other','obsolete_plugins','obsolete_plugins_other','obsolete_plugins_checked_at','seo_plugin','seo_plugin_other','publish_dates_removed','publish_dates_removed_other','search_console_status','search_console_checked_at','misc_links_nofollow','misc_links_nofollow_other','social_links_nofollow','social_links_nofollow_other','amazon_links_nofollow','amazon_links_nofollow_other','extra_fields','import_notes','created_at','updated_at'
        ],
        'credentials' => ['id','website_id','kind','label','login_url','username','password_encrypted','phone','recovery_email','two_factor','notes','extra','created_at','updated_at'],
        'general_credentials' => ['id','section','site','url','username','password_encrypted','backup_username','backup_password_encrypted','notes','extra','created_at','updated_at'],
        'premium_domains' => ['id','name','url','notes','active','cpanel_login_url','cpanel_username','cpanel_password_encrypted','cpanel_access_state','created_at'],
        'spreadsheets' => ['id','name','description','url','notes','created_at'],
        'audit_log' => ['id','action','website_id','credential_id','summary','meta','ip','created_at'],
        'reminders' => ['id','website_id','kind','label','due_date','frequency_days','completed_at','notes','created_at'],
        'custom_fields' => ['id','name','section','description','field_type','options','required','reminder_frequency_days','color_rules','display_order','scope','archived','created_at'],
        'custom_field_values' => ['id','custom_field_id','website_id','value','checked_at','updated_at'],
    ];
}

function json_columns(): array {
    return [
        'app_settings' => ['value'],
        'websites' => ['extra_fields'],
        'credentials' => ['extra'],
        'general_credentials' => ['extra'],
        'audit_log' => ['meta'],
        'custom_fields' => ['options','color_rules'],
        'custom_field_values' => ['value'],
    ];
}

function bool_columns(): array {
    return [
        'websites' => ['uses_wordpress'],
        'premium_domains' => ['active'],
        'custom_fields' => ['required','archived'],
    ];
}

function primary_key_for(string $table): string {
    return $table === 'app_settings' ? 'key' : 'id';
}

function q_ident(string $identifier): string {
    return '`' . str_replace('`', '``', $identifier) . '`';
}

function assert_table(string $table): array {
    $map = schema_map();
    if (!isset($map[$table])) {
        json_out(400, ['error' => 'Table is not allowed']);
    }
    return $map[$table];
}

function assert_column(string $table, string $column): string {
    $allowed = assert_table($table);
    if (!in_array($column, $allowed, true)) {
        json_out(400, ['error' => 'Column is not allowed']);
    }
    return $column;
}

function selected_columns(string $table, string $select): array {
    $allowed = assert_table($table);
    if (trim($select) === '*' || trim($select) === '') return $allowed;
    $columns = array_values(array_filter(array_map('trim', explode(',', $select))));
    foreach ($columns as $column) assert_column($table, $column);
    return $columns;
}

function normalise_write_value(string $table, string $column, mixed $value): mixed {
    if (in_array($column, json_columns()[$table] ?? [], true)) {
        if ($value === null) return null;
        return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    if (in_array($column, bool_columns()[$table] ?? [], true)) {
        return $value ? 1 : 0;
    }
    return $value;
}

function normalise_row(string $table, array $row): array {
    foreach (json_columns()[$table] ?? [] as $column) {
        if (array_key_exists($column, $row) && $row[$column] !== null) {
            $decoded = json_decode((string)$row[$column], true);
            $row[$column] = json_last_error() === JSON_ERROR_NONE ? $decoded : $row[$column];
        }
    }
    foreach (bool_columns()[$table] ?? [] as $column) {
        if (array_key_exists($column, $row) && $row[$column] !== null) {
            $row[$column] = (bool)$row[$column];
        }
    }
    return $row;
}

function uuid_v4(): string {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function build_where(string $table, array $filters, array &$params): string {
    if (!$filters) return '';
    $parts = [];
    foreach ($filters as $index => $filter) {
        if (!is_array($filter)) json_out(400, ['error' => 'Invalid filter']);
        $column = assert_column($table, (string)($filter['column'] ?? ''));
        $op = (string)($filter['op'] ?? '');
        $value = $filter['value'] ?? null;
        if ($op === 'eq' || $op === 'neq') {
            if ($value === null) {
                $parts[] = q_ident($column) . ($op === 'eq' ? ' IS NULL' : ' IS NOT NULL');
            } else {
                $name = ':f' . $index;
                $parts[] = q_ident($column) . ($op === 'eq' ? ' = ' : ' <> ') . $name;
                $params[$name] = normalise_write_value($table, $column, $value);
            }
        } elseif ($op === 'in') {
            $values = is_array($value) ? array_values($value) : [];
            if (!$values) {
                $parts[] = '1 = 0';
                continue;
            }
            $holders = [];
            foreach ($values as $valueIndex => $item) {
                $name = ':f' . $index . '_' . $valueIndex;
                $holders[] = $name;
                $params[$name] = normalise_write_value($table, $column, $item);
            }
            $parts[] = q_ident($column) . ' IN (' . implode(',', $holders) . ')';
        } else {
            json_out(400, ['error' => 'Filter operation is not allowed']);
        }
    }
    return ' WHERE ' . implode(' AND ', $parts);
}

function execute_select(PDO $pdo, string $table, array $query): array {
    $columns = selected_columns($table, (string)($query['select'] ?? '*'));
    $params = [];
    $where = build_where($table, is_array($query['filters'] ?? null) ? $query['filters'] : [], $params);

    $count = null;
    if (($query['count'] ?? null) === 'exact') {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . q_ident($table) . $where);
        $stmt->execute($params);
        $count = (int)$stmt->fetchColumn();
        if (!empty($query['head'])) return ['data' => [], 'count' => $count];
    }

    $sql = 'SELECT ' . implode(', ', array_map('q_ident', $columns)) . ' FROM ' . q_ident($table) . $where;
    $orders = is_array($query['orders'] ?? null) ? $query['orders'] : [];
    if ($orders) {
        $orderParts = [];
        foreach ($orders as $order) {
            if (!is_array($order)) continue;
            $column = assert_column($table, (string)($order['column'] ?? ''));
            $orderParts[] = q_ident($column) . (!empty($order['ascending']) ? ' ASC' : ' DESC');
        }
        if ($orderParts) $sql .= ' ORDER BY ' . implode(', ', $orderParts);
    }
    if (isset($query['limit'])) {
        $limit = max(0, min(1000, (int)$query['limit']));
        $sql .= ' LIMIT ' . $limit;
    }
    if (in_array(($query['single'] ?? null), ['single','maybe'], true) && !isset($query['limit'])) {
        $sql .= ' LIMIT 2';
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = array_map(fn(array $row) => normalise_row($table, $row), $stmt->fetchAll());

    if (($query['single'] ?? null) === 'single') {
        if (count($rows) !== 1) json_out(409, ['error' => 'Expected exactly one row']);
        return ['data' => $rows[0], 'count' => $count];
    }
    if (($query['single'] ?? null) === 'maybe') {
        if (count($rows) > 1) json_out(409, ['error' => 'Expected zero or one row']);
        return ['data' => $rows[0] ?? null, 'count' => $count];
    }
    return ['data' => $rows, 'count' => $count];
}

function handle_query(PDO $pdo, mixed $rawQuery): never {
    if (!is_array($rawQuery)) json_out(400, ['error' => 'Invalid query']);
    $operation = (string)($rawQuery['operation'] ?? 'select');
    $table = (string)($rawQuery['table'] ?? '');
    assert_table($table);

    if ($operation === 'select') {
        json_out(200, execute_select($pdo, $table, $rawQuery));
    }

    if ($operation === 'delete') {
        $filters = is_array($rawQuery['filters'] ?? null) ? $rawQuery['filters'] : [];
        if (!$filters) json_out(400, ['error' => 'Delete requires a filter']);
        $params = [];
        $where = build_where($table, $filters, $params);
        $stmt = $pdo->prepare('DELETE FROM ' . q_ident($table) . $where);
        $stmt->execute($params);
        json_out(200, ['data' => null]);
    }

    if (!in_array($operation, ['insert','update','upsert'], true)) {
        json_out(400, ['error' => 'Query operation is not allowed']);
    }

    $data = $rawQuery['data'] ?? null;
    if (!is_array($data) || array_is_list($data)) json_out(400, ['error' => 'Mutation data must be an object']);
    $allowed = assert_table($table);
    $row = [];
    foreach ($data as $column => $value) {
        if (!is_string($column) || !in_array($column, $allowed, true)) json_out(400, ['error' => 'Mutation column is not allowed']);
        $row[$column] = normalise_write_value($table, $column, $value);
    }

    if ($operation === 'insert' || $operation === 'upsert') {
        $pk = primary_key_for($table);
        if ($pk === 'id' && (!isset($row['id']) || !$row['id'])) $row['id'] = uuid_v4();
        if (!$row) json_out(400, ['error' => 'Insert requires values']);
        $columns = array_keys($row);
        $holders = array_map(fn($column) => ':i_' . $column, $columns);
        $params = [];
        foreach ($row as $column => $value) $params[':i_' . $column] = $value;
        $sql = 'INSERT INTO ' . q_ident($table) . ' (' . implode(', ', array_map('q_ident', $columns)) . ') VALUES (' . implode(', ', $holders) . ')';
        if ($operation === 'upsert') {
            $updates = array_values(array_filter($columns, fn($column) => $column !== $pk));
            if ($updates) {
                $sql .= ' ON DUPLICATE KEY UPDATE ' . implode(', ', array_map(fn($column) => q_ident($column) . ' = VALUES(' . q_ident($column) . ')', $updates));
            }
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        if (($rawQuery['select'] ?? '*') !== '' && ($rawQuery['single'] ?? null)) {
            $rawQuery['filters'] = [['op' => 'eq', 'column' => $pk, 'value' => $row[$pk] ?? null]];
            json_out(200, execute_select($pdo, $table, $rawQuery));
        }
        json_out(200, ['data' => null]);
    }

    $filters = is_array($rawQuery['filters'] ?? null) ? $rawQuery['filters'] : [];
    if (!$filters) json_out(400, ['error' => 'Update requires a filter']);
    if (!$row) json_out(200, ['data' => null]);
    $sets = [];
    $params = [];
    foreach ($row as $column => $value) {
        $name = ':u_' . $column;
        $sets[] = q_ident($column) . ' = ' . $name;
        $params[$name] = $value;
    }
    $where = build_where($table, $filters, $params);
    $stmt = $pdo->prepare('UPDATE ' . q_ident($table) . ' SET ' . implode(', ', $sets) . $where);
    $stmt->execute($params);

    if (($rawQuery['single'] ?? null)) {
        json_out(200, execute_select($pdo, $table, $rawQuery));
    }
    json_out(200, ['data' => null]);
}

function encryption_key(array $config): string {
    $hex = (string)($config['encryption_key'] ?? '');
    $key = ctype_xdigit($hex) ? hex2bin($hex) : false;
    if ($key === false || strlen($key) !== 32) {
        json_out(500, ['error' => 'Credential encryption is not configured']);
    }
    return $key;
}

function encrypt_value(string $plaintext, array $config): string {
    $key = encryption_key($config);
    $iv = random_bytes(12);
    $tag = '';
    $ciphertext = openssl_encrypt($plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($ciphertext === false) throw new RuntimeException('Encryption failed');
    return 'v1:' . base64_encode($iv . $tag . $ciphertext);
}

function decrypt_value(string $stored, array $config): string {
    if (!str_starts_with($stored, 'v1:')) throw new RuntimeException('Unsupported encrypted value');
    $raw = base64_decode(substr($stored, 3), true);
    if ($raw === false || strlen($raw) < 29) throw new RuntimeException('Invalid encrypted value');
    $iv = substr($raw, 0, 12);
    $tag = substr($raw, 12, 16);
    $ciphertext = substr($raw, 28);
    $plaintext = openssl_decrypt($ciphertext, 'aes-256-gcm', encryption_key($config), OPENSSL_RAW_DATA, $iv, $tag);
    if ($plaintext === false) throw new RuntimeException('Decryption failed');
    return $plaintext;
}

function handle_rpc(array $body, array $config): never {
    $name = (string)($body['name'] ?? '');
    $args = is_array($body['args'] ?? null) ? $body['args'] : [];
    if ($name === 'enc_credential_secure') {
        $plaintext = (string)($args['plaintext'] ?? '');
        json_out(200, ['data' => $plaintext === '' ? null : encrypt_value($plaintext, $config)]);
    }
    if ($name === 'dec_credential_secure') {
        $ciphertext = (string)($args['ciphertext'] ?? '');
        json_out(200, ['data' => $ciphertext === '' ? null : decrypt_value($ciphertext, $config)]);
    }
    json_out(400, ['error' => 'RPC is not allowed']);
}
