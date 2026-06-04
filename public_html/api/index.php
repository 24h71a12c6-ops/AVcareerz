<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/mailers.php';

// Production settings: keep errors out of the response and log them instead.
@ini_set('display_errors', '0');
@ini_set('display_startup_errors', '0');
@ini_set('log_errors', '1');
@ini_set('error_log', __DIR__ . '/../../includes/php_errors.log');
@error_reporting(E_ALL);

$requestOrigin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$frontendUrl = trim((string) getenv('FRONTEND_URL'));
$allowedOrigins = array_filter(array_unique([
    $frontendUrl,
    'https://avcareerz.com',
    'http://127.0.0.1:5504',
    'http://localhost:5504',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
]));

if ($requestOrigin !== '' && in_array($requestOrigin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
    header('Access-Control-Max-Age: 86400');
} elseif (!empty($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

function respond_json(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function respond_text(string $text, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: text/plain; charset=utf-8');
    echo $text;
    exit;
}

function request_payload(): array
{
    static $payload = null;
    if ($payload !== null) {
        return $payload;
    }

    $payload = array_merge($_GET, $_POST);
    $raw = file_get_contents('php://input');
    if ($raw !== false && trim($raw) !== '') {
        $trimmedRaw = ltrim($raw);
        $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''));
        if (str_contains($contentType, 'application/json')) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $payload = array_merge($payload, $decoded);
            }
        } elseif ($trimmedRaw !== '' && in_array($trimmedRaw[0] ?? '', ['{', '['], true)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $payload = array_merge($payload, $decoded);
            }
        } elseif (str_contains($contentType, 'application/x-www-form-urlencoded')) {
            parse_str($raw, $decoded);
            if (is_array($decoded)) {
                $payload = array_merge($payload, $decoded);
            }
        }
    }

    return $payload;
}

function input_value(array $data, array $keys, mixed $default = null): mixed
{
    foreach ($keys as $key) {
        if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '') {
            return $data[$key];
        }
    }

    return $default;
}

function normalize_email(?string $email): string
{
    return strtolower(trim((string) $email));
}

function now_iso(): string
{
    return gmdate('c');
}

function client_context(): array
{
    return [
        'ip_address' => (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
        'user_agent' => (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''),
        'source' => (string) ($_SERVER['HTTP_REFERER'] ?? 'Website'),
    ];
}

function file_metadata(array $file): array
{
    return [
        'original_name' => (string) ($file['name'] ?? ''),
        'mime_type' => (string) ($file['type'] ?? ''),
        'size_bytes' => (int) ($file['size'] ?? 0),
        'tmp_name' => (string) ($file['tmp_name'] ?? ''),
        'error' => (int) ($file['error'] ?? 0),
    ];
}

function uploaded_files_payload(array $files): array
{
    $payload = [];
    foreach ($files as $name => $file) {
        if (!is_array($file) || empty($file['name'])) {
            continue;
        }
        $payload[$name] = file_metadata($file);
    }

    return $payload;
}

function first_document_by_email(string $collection, string $email): ?array
{
    $email = normalize_email($email);
    if ($email === '') {
        return null;
    }

    $matches = firestore_query($collection, [[
        'field' => 'email_lc',
        'op' => 'EQUAL',
        'value' => $email,
    ]], 1);

    if ($matches === []) {
        $matches = firestore_query($collection, [[
            'field' => 'email',
            'op' => 'EQUAL',
            'value' => $email,
        ]], 1);
    }

    return $matches[0] ?? null;
}

function first_document_by_code(string $email, string $code): ?array
{
    $email = normalize_email($email);
    if ($email === '' || $code === '') {
        return null;
    }

    $matches = firestore_query('password_reset_codes', [[
        'field' => 'email_lc',
        'op' => 'EQUAL',
        'value' => $email,
    ]], 1);

    foreach ($matches as $match) {
        if ((string) ($match['code'] ?? '') === $code) {
            return $match;
        }
    }

    return null;
}

function upsert_registration(array $data, bool $isUpdate = false): array
{
    $email = normalize_email((string) ($data['email'] ?? ''));
    $record = [
        'full_name' => (string) ($data['fullName'] ?? $data['full_name'] ?? ''),
        'email' => (string) ($data['email'] ?? ''),
        'email_lc' => $email,
        'phone' => (string) ($data['phone'] ?? ''),
        'password' => (string) ($data['password'] ?? ''),
        'service' => (string) ($data['service'] ?? $data['preferredCountry'] ?? ''),
        'preferred_country' => (string) ($data['preferredCountry'] ?? $data['preferred_country'] ?? ''),
        'source' => (string) ($data['source'] ?? 'Website'),
        'registration_status' => (string) ($data['registration_status'] ?? 'step1_completed'),
        'updated_at' => now_iso(),
        'created_at' => (string) ($data['created_at'] ?? now_iso()),
    ];

    $documentId = '';
    if ($isUpdate && !empty($data['userId'])) {
        $documentId = trim((string) $data['userId']);
    }

    if ($documentId === '') {
        $documentId = $email;
    }

    if ($documentId === '') {
        $documentId = bin2hex(random_bytes(8));
    }

    return firestore_set_document('registrations', $documentId, $record);
}

function update_matching_registration(string $email, array $fields): ?array
{
    $doc = first_document_by_email('registrations', $email);
    if ($doc === null || empty($doc['id'])) {
        return null;
    }

    $merged = array_merge(firestore_document_payload($doc), $fields, [
        'email' => (string) ($doc['email'] ?? $email),
        'email_lc' => normalize_email((string) ($doc['email'] ?? $email)),
        'updated_at' => now_iso(),
    ]);

    return firestore_set_document('registrations', (string) $doc['id'], $merged);
}

function registration_display_name(array $data): string
{
    return trim((string) ($data['fullName'] ?? $data['full_name'] ?? ''));
}

function flatten_firestore_payload(array $data): array
{
    $flattened = [];

    foreach ($data as $key => $value) {
        if (is_array($value)) {
            $flattened[(string) $key] = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            continue;
        }

        $flattened[(string) $key] = $value;
    }

    return $flattened;
}

function firestore_document_payload(array $data): array
{
    $clean = [];

    foreach ($data as $key => $value) {
        $key = (string) $key;
        if ($key === 'id' || $key === '__name__' || str_starts_with($key, '__')) {
            continue;
        }

        $clean[$key] = $value;
    }

    return $clean;
}

function handle_register(array $data, bool $isUpdate = false): void
{
    $fullName = trim((string) input_value($data, ['fullName', 'full_name'], ''));
    $email = trim((string) input_value($data, ['email'], ''));
    $phone = trim((string) input_value($data, ['phone', 'phoneNumber', 'mobile'], ''));
    $password = (string) input_value($data, ['password'], '');

    if ($fullName === '' || $email === '' || $phone === '' || $password === '') {
        respond_json(['success' => false, 'error' => 'Missing required fields.'], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond_json(['success' => false, 'error' => 'Please enter a valid email address.'], 400);
    }

    if (!preg_match('/^[0-9]{10}$/', preg_replace('/\D+/', '', $phone))) {
        respond_json(['success' => false, 'error' => 'Please enter a valid 10-digit phone number.'], 400);
    }

    if (!$isUpdate) {
        $existingRegistration = first_document_by_email('registrations', $email);
        if ($existingRegistration !== null) {
            $existingApplication = first_document_by_email('next_form', $email);

            respond_json([
                'success' => false,
                'alreadyRegistered' => true,
                'applicationCompleted' => $existingApplication !== null || (($existingRegistration['registration_status'] ?? '') === 'fully_registered'),
                'error' => 'You have already signed in. Please log in instead.'
            ], 409);
        }
    }

    $context = client_context();
    $record = upsert_registration(array_merge($data, $context, [
        'fullName' => $fullName,
        'email' => $email,
        'phone' => $phone,
        'password' => $password,
    ]), $isUpdate);

    if (!$isUpdate) {
        try {
            send_admin_email([
                'fullName' => $fullName,
                'email' => $email,
                'phone' => $phone,
                'service' => (string) input_value($data, ['service', 'preferredCountry'], ''),
                'source' => $context['source'],
            ], null, '1');
        } catch (Throwable $e) {
            error_log('Admin registration email failed: ' . $e->getMessage());
        }

        try {
            send_confirmation_email($email, $fullName, 'Your registration has been successfully completed!', [
                'preferredCountry' => (string) input_value($data, ['preferredCountry'], ''),
                'desiredCourse' => (string) input_value($data, ['desiredCourse', 'preferredCourse'], ''),
            ]);
        } catch (Throwable $e) {
            error_log('User registration email failed: ' . $e->getMessage());
        }
    }

    $existingPayload = firestore_document_payload($record);
    $mergedPayload = array_merge($existingPayload, [
        'full_name' => (string) ($record['full_name'] ?? $fullName),
        'email' => $email,
        'email_lc' => normalize_email($email),
        'phone' => $phone,
        'password' => $password,
        'service' => (string) ($record['service'] ?? input_value($data, ['service', 'preferredCountry'], '')),
        'preferred_country' => (string) ($record['preferred_country'] ?? input_value($data, ['preferredCountry'], '')),
        'source' => (string) ($record['source'] ?? $context['source']),
        'registration_status' => (string) ($record['registration_status'] ?? 'step1_completed'),
        'updated_at' => now_iso(),
        'created_at' => (string) ($record['created_at'] ?? now_iso()),
    ]);

    if ($isUpdate) {
        $mergedPayload = array_merge($existingPayload, $mergedPayload);
    }

    respond_json([
        'success' => true,
        'message' => $isUpdate ? 'Details updated successfully!' : 'Registration successful!',
        'userId' => (string) ($record['id'] ?? ''),
    ]);
}

function handle_login(array $data): void
{
    $email = trim((string) input_value($data, ['loginEmail', 'email'], ''));
    $password = (string) input_value($data, ['loginPassword', 'password'], '');

    if ($email === '' || $password === '') {
        respond_json(['success' => false, 'error' => 'Email and password are required.'], 400);
    }

    $registration = first_document_by_email('registrations', $email);
    if ($registration === null) {
        respond_json(['success' => false, 'error' => 'Invalid email or password.'], 401);
    }

    $storedPassword = (string) ($registration['password'] ?? '');
    $passwordMatches = $storedPassword !== '' && (
        hash_equals($storedPassword, $password) ||
        password_verify($password, $storedPassword)
    );

    if (!$passwordMatches) {
        respond_json(['success' => false, 'error' => 'Invalid email or password.'], 401);
    }

    $context = client_context();
    try {
        firestore_add_document('login_details', [
            'full_name' => (string) ($registration['full_name'] ?? $registration['fullName'] ?? ''),
            'email' => (string) ($registration['email'] ?? $email),
            'email_lc' => normalize_email((string) ($registration['email'] ?? $email)),
            'phone' => (string) ($registration['phone'] ?? ''),
            'login_time' => now_iso(),
            'ip_address' => $context['ip_address'],
            'user_agent' => $context['user_agent'],
            'source' => 'login',
        ]);
    } catch (Throwable $e) {
        error_log('Login details save failed: ' . $e->getMessage());
    }

    try {
        send_admin_email([
            'full_name' => (string) ($registration['full_name'] ?? ''),
            'phone' => (string) ($registration['phone'] ?? ''),
            'email' => (string) ($registration['email'] ?? $email),
            'source' => 'Login',
            'ip_address' => (string) ($context['ip_address'] ?? ''),
            'user_agent' => (string) ($context['user_agent'] ?? ''),
            'login_time' => now_iso(),
        ], 'User Login Notification', 'login');
    } catch (Throwable $e) {
        error_log('Login admin email failed: ' . $e->getMessage());
    }

    try {
        send_confirmation_email($email, (string) ($registration['full_name'] ?? 'Student'), 'You have successfully logged in to your AVcareerz account.');
    } catch (Throwable $e) {
        error_log('Login confirmation email failed: ' . $e->getMessage());
    }

    $application = first_document_by_email('next_form', $email);
    $isApplicationCompleted = $application !== null;

    respond_json([
        'success' => true,
        'message' => 'Login successful',
        'userId' => (string) ($registration['id'] ?? ''),
        'user' => [
            'fullName' => (string) ($registration['full_name'] ?? ''),
            'email' => (string) ($registration['email'] ?? $email),
            'phone' => (string) ($registration['phone'] ?? ''),
        ],
        'isApplicationCompleted' => $isApplicationCompleted,
    ]);
}

function handle_google_signin(array $data): void
{
    $fullName = trim((string) input_value($data, ['fullName', 'name'], ''));
    $email = trim((string) input_value($data, ['email'], ''));
    $picture = (string) input_value($data, ['picture', 'photoURL'], '');
    $provider = (string) input_value($data, ['provider', 'providerId'], 'Google');

    if ($fullName === '' || $email === '') {
        respond_json(['success' => false, 'error' => 'Missing Google profile details.'], 400);
    }

    $emailLc = normalize_email($email);
    $context = client_context();
    $profile = [
        'full_name' => $fullName,
        'email' => $email,
        'email_lc' => $emailLc,
        'picture' => $picture,
        'provider' => $provider,
        'source' => $context['source'],
        'signed_in_at' => now_iso(),
        'updated_at' => now_iso(),
    ];

    try {
        firestore_set_document('users', $emailLc, $profile);
        firestore_set_document('sign_in_with_google', $emailLc, $profile);
    } catch (Throwable $e) {
        error_log('Google sign-in profile save failed: ' . $e->getMessage());
        respond_json(['success' => false, 'error' => 'Unable to save Google sign-in details.'], 500);
    }

    try {
        send_admin_email([
            'fullName' => $fullName,
            'email' => $email,
            'provider' => $provider,
            'source' => 'Google Sign-In',
            'signed_in_at' => $profile['signed_in_at'],
        ], 'User Google Login Notification', 'login');
    } catch (Throwable $e) {
        error_log('Google admin email failed: ' . $e->getMessage());
    }

    try {
        send_google_sign_in_success_email($email, $fullName, [
            'provider' => $provider,
            'signedInAt' => $profile['signed_in_at'],
            'nextStep' => 'Please complete the application form to continue your study abroad journey.',
        ]);
    } catch (Throwable $e) {
        error_log('Google user email failed: ' . $e->getMessage());
    }

    $application = first_document_by_email('next_form', $email);

    respond_json([
        'success' => true,
        'message' => 'Google sign-in successful',
        'userId' => $emailLc,
        'isApplicationCompleted' => $application !== null,
    ]);
}

function handle_register_step2(array $data): void
{
    $fullName = trim((string) input_value($data, ['fullName'], ''));
    $email = trim((string) input_value($data, ['email'], ''));
    $phone = trim((string) input_value($data, ['phone'], ''));

    if ($fullName === '' || $email === '' || $phone === '') {
        respond_json(['success' => false, 'error' => 'Full name, email and phone are required.'], 400);
    }

    $emailLc = normalize_email($email);
    $context = client_context();
    $files = uploaded_files_payload($_FILES);

    $application = [
        'full_name' => $fullName,
        'email' => $email,
        'email_lc' => $emailLc,
        'phone' => $phone,
        'dob' => (string) input_value($data, ['dob'], ''),
        'gender' => (string) input_value($data, ['gender'], ''),
        'nationality' => (string) input_value($data, ['nationality'], ''),
        'city' => (string) input_value($data, ['city'], ''),
        'passportStatus' => (string) input_value($data, ['passportStatus'], ''),
        'passport_id' => (string) input_value($data, ['passport_id'], ''),
        'highestQualification' => (string) input_value($data, ['highestQualification'], ''),
        'currentCourse' => (string) input_value($data, ['currentCourse'], ''),
        'specialization' => (string) input_value($data, ['specialization'], ''),
        'collegeName' => (string) input_value($data, ['collegeName'], ''),
        'yearOfPassing' => (string) input_value($data, ['yearOfPassing'], ''),
        'cgpa' => (string) input_value($data, ['cgpa'], ''),
        'preferredCountry' => (string) input_value($data, ['preferredCountry'], ''),
        'preferredUniversity' => (string) input_value($data, ['preferredUniversity', 'preferredUniversityCustom'], ''),
        'preferredCourse' => (string) input_value($data, ['preferredCourse', 'preferredCourseCustom'], ''),
        'visaStatus' => (string) input_value($data, ['visaStatus'], ''),
        'visaType' => (string) input_value($data, ['visaType'], ''),
        'visaNumber' => (string) input_value($data, ['visaNumber'], ''),
        'levelOfStudy' => (string) input_value($data, ['levelOfStudy'], ''),
        'coaching' => (string) input_value($data, ['coaching'], ''),
        'preferredIntake' => (string) input_value($data, ['preferredIntake'], ''),
        'budgetRange' => (string) input_value($data, ['budgetRange'], ''),
        'fundingSource' => (string) input_value($data, ['fundingSource'], ''),
        'loanStatus' => (string) input_value($data, ['loanStatus'], ''),
        'declaration' => !empty($data['declaration']),
        'source' => (string) input_value($data, ['source'], $context['source']),
        'uploaded_files' => $files,
        'registration_status' => 'fully_registered',
        'submitted_at' => now_iso(),
        'updated_at' => now_iso(),
        'ip_address' => $context['ip_address'],
        'user_agent' => $context['user_agent'],
    ];

    $firestorePayload = flatten_firestore_payload($application);

    $existingApplication = first_document_by_email('next_form', $email);
    if ($existingApplication !== null && !empty($existingApplication['id'])) {
        $application['created_at'] = (string) ($existingApplication['created_at'] ?? now_iso());
            $merged = array_merge(firestore_document_payload($existingApplication), $application);
        firestore_set_document('next_form', (string) $existingApplication['id'], flatten_firestore_payload($merged));
    } else {
        $application['created_at'] = now_iso();
        firestore_add_document('next_form', $firestorePayload);
    }

    if ($registration = first_document_by_email('registrations', $email)) {
        try {
                firestore_set_document('registrations', (string) $registration['id'], array_merge(firestore_document_payload($registration), [
                'registration_status' => 'fully_registered',
                'updated_at' => now_iso(),
                'full_name' => $fullName,
                'email' => $email,
                'email_lc' => $emailLc,
                'phone' => $phone,
            ]));
        } catch (Throwable $e) {
            error_log('Registration status update failed: ' . $e->getMessage());
        }
    }

    try {
        send_admin_email($application, 'Step 2 Application Received: ' . $fullName, '2');
    } catch (Throwable $e) {
        error_log('Step 2 admin email failed: ' . $e->getMessage());
    }

    try {
        send_step2_completion_email($email, $fullName, [
            'preferredCountry' => $application['preferredCountry'],
            'preferredUniversity' => $application['preferredUniversity'],
            'preferredCourse' => $application['preferredCourse'],
        ]);
    } catch (Throwable $e) {
        error_log('Step 2 user email failed: ' . $e->getMessage());
    }

    respond_json([
        'success' => true,
        'message' => 'Step 2 completed successfully.',
    ]);
}

function handle_check_user_status(array $data): void
{
    $email = trim((string) input_value($data, ['email'], ''));
    if ($email === '') {
        respond_json(['success' => false, 'error' => 'Email is required.'], 400);
    }

    $registration = first_document_by_email('registrations', $email);
    $user = first_document_by_email('users', $email);
    $googleUser = first_document_by_email('sign_in_with_google', $email);
    $application = first_document_by_email('next_form', $email);

    respond_json([
        'success' => true,
        'loggedIn' => $registration !== null || $user !== null || $googleUser !== null,
        'registerCompleted' => $registration !== null,
        'applicationCompleted' => $application !== null || (($registration['registration_status'] ?? '') === 'fully_registered'),
        'registrationStatus' => (string) ($registration['registration_status'] ?? ''),
    ]);
}

function handle_check_application_status(array $data): void
{
    $email = trim((string) input_value($data, ['email'], ''));
    if ($email === '') {
        respond_json(['success' => false, 'error' => 'Email is required.'], 400);
    }

    $application = first_document_by_email('next_form', $email);

    respond_json([
        'success' => true,
        'completed' => $application !== null,
        'applicationCompleted' => $application !== null,
    ]);
}

function handle_partial_lead(array $data): void
{
    $payload = [
        'fullName' => (string) input_value($data, ['fullName', 'name'], ''),
        'phone' => (string) input_value($data, ['phone'], ''),
        'email' => (string) input_value($data, ['email'], ''),
        'source' => (string) input_value($data, ['source'], 'Website'),
        'url' => (string) input_value($data, ['url'], ''),
        'created_at' => now_iso(),
        'ip_address' => (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
        'user_agent' => (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ];

    try {
        firestore_add_document('partial_leads', [
            'full_name' => $payload['fullName'],
            'email' => $payload['email'],
            'email_lc' => normalize_email($payload['email']),
            'phone' => $payload['phone'],
            'source' => $payload['source'],
            'url' => $payload['url'],
            'created_at' => $payload['created_at'],
            'ip_address' => $payload['ip_address'],
            'user_agent' => $payload['user_agent'],
        ]);
    } catch (Throwable $e) {
        error_log('Partial lead save failed: ' . $e->getMessage());
    }

    try {
        send_instant_alert('partial', $payload);
    } catch (Throwable $e) {
        error_log('Partial lead alert failed: ' . $e->getMessage());
    }

    respond_text('OK');
}

function handle_forgot_password(array $data): void
{
    $email = trim((string) input_value($data, ['email'], ''));
    if ($email === '') {
        respond_json(['success' => false, 'error' => 'Email is required.'], 400);
    }

    $registration = first_document_by_email('registrations', $email);
    $user = first_document_by_email('users', $email);
    if ($registration === null && $user === null) {
        respond_json(['success' => false, 'error' => 'Email not found.'], 404);
    }

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $emailLc = normalize_email($email);

    firestore_set_document('password_reset_codes', $emailLc, [
        'email' => $email,
        'email_lc' => $emailLc,
        'code' => $code,
        'created_at' => now_iso(),
        'expires_at' => gmdate('c', time() + 300),
        'verified' => false,
        'used' => false,
    ]);

    try {
        send_login_code_email($email, $code);
    } catch (Throwable $e) {
        error_log('Reset code email failed: ' . $e->getMessage());
        respond_json(['success' => false, 'error' => 'Unable to send code.'], 500);
    }

    respond_json(['success' => true, 'message' => 'Code sent successfully.']);
}

function handle_verify_reset_code(array $data): void
{
    $email = trim((string) input_value($data, ['email'], ''));
    $code = trim((string) input_value($data, ['code'], ''));

    if ($email === '' || $code === '') {
        respond_json(['success' => false, 'error' => 'Email and code are required.'], 400);
    }

    // Debug logging: capture incoming payload for troubleshooting
    try {
        error_log('verify-reset-code payload: ' . json_encode(['email' => $email, 'code' => $code]));
    } catch (Throwable $_) {
        // ignore logging errors
    }

    $record = first_document_by_code($email, $code);
    try {
        error_log('verify-reset-code lookup: ' . json_encode($record));
    } catch (Throwable $_) {
        // ignore logging errors
    }
    if ($record === null) {
        respond_json(['success' => false, 'error' => 'Invalid or expired code.'], 400);
    }

    $expiresAt = strtotime((string) ($record['expires_at'] ?? ''));
    if ($expiresAt !== false && $expiresAt < time()) {
        respond_json(['success' => false, 'error' => 'Invalid or expired code.'], 400);
    }

    // Mark as verified and extend expiry so user has time to reset password
    firestore_set_document('password_reset_codes', (string) $record['id'], array_merge(firestore_document_payload($record), [
        'verified' => true,
        'verified_at' => now_iso(),
        'expires_at' => gmdate('c', time() + 300),
    ]));

    respond_json(['success' => true, 'message' => 'Code verified successfully.']);
}

function handle_reset_password(array $data): void
{
    $email = trim((string) input_value($data, ['email'], ''));
    $code = trim((string) input_value($data, ['code'], ''));
    $newPassword = (string) input_value($data, ['newPassword'], '');

    if ($email === '' || $code === '' || $newPassword === '') {
        respond_json(['success' => false, 'error' => 'Email, code and new password are required.'], 400);
    }

    // Debug logging: capture reset payload (excluding password) for troubleshooting
    try {
        error_log('reset-password payload: ' . json_encode(['email' => $email, 'code' => $code]));
    } catch (Throwable $_) {
        // ignore logging errors
    }

    $record = first_document_by_code($email, $code);
    try {
        error_log('reset-password lookup: ' . json_encode($record));
    } catch (Throwable $_) {
        // ignore logging errors
    }
    if ($record === null) {
        respond_json(['success' => false, 'error' => 'Invalid or expired code.'], 400);
    }

    $expiresAt = strtotime((string) ($record['expires_at'] ?? ''));
    if ($expiresAt !== false && $expiresAt < time()) {
        respond_json(['success' => false, 'error' => 'Invalid or expired code.'], 400);
    }

    $emailLc = normalize_email($email);
    $registration = first_document_by_email('registrations', $email);
    if ($registration !== null && !empty($registration['id'])) {
            firestore_set_document('registrations', (string) $registration['id'], array_merge(firestore_document_payload($registration), [
            'password' => $newPassword,
            'updated_at' => now_iso(),
            'password_reset_at' => now_iso(),
        ]));
    }

    $user = first_document_by_email('users', $email);
    if ($user !== null && !empty($user['id'])) {
            firestore_set_document('users', (string) $user['id'], array_merge(firestore_document_payload($user), [
            'updated_at' => now_iso(),
            'password_reset_at' => now_iso(),
        ]));
    }

    firestore_set_document('password_reset_codes', (string) $record['id'], array_merge(firestore_document_payload($record), [
        'used' => true,
        'used_at' => now_iso(),
    ]));

    try {
        send_confirmation_email($email, (string) ($registration['full_name'] ?? $user['full_name'] ?? 'Student'), 'Your password has been reset successfully.');
    } catch (Throwable $e) {
        error_log('Password reset confirmation email failed: ' . $e->getMessage());
    }

    respond_json(['success' => true, 'message' => 'Password updated successfully.']);
}

function route_request(string $method, string $path, array $data): void
{
    if ($method === 'GET' && $path === '/check-user-status') {
        handle_check_user_status($data);
    }

    if ($method === 'GET' && $path === '/check-application-status') {
        handle_check_application_status($data);
    }

    if ($method === 'POST' && $path === '/register') {
        handle_register($data, false);
    }

    if ($method === 'PUT' && $path === '/update-registration') {
        handle_register($data, true);
    }

    if ($method === 'POST' && $path === '/login') {
        handle_login($data);
    }

    if ($method === 'POST' && $path === '/google-signin') {
        handle_google_signin($data);
    }

    if ($method === 'POST' && $path === '/register-step2') {
        handle_register_step2($data);
    }

    if ($method === 'POST' && $path === '/partial-lead') {
        handle_partial_lead($data);
    }

    if ($method === 'POST' && $path === '/forgot-password') {
        handle_forgot_password($data);
    }

    if ($method === 'POST' && $path === '/verify-reset-code') {
        handle_verify_reset_code($data);
    }

    if ($method === 'POST' && $path === '/reset-password') {
        handle_reset_password($data);
    }

    respond_json(['success' => false, 'error' => 'Route not found.'], 404);
}

$uriPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
$uriPath = preg_replace('#^/api(?:/index\.php)?#', '', $uriPath) ?? $uriPath;
$uriPath = '/' . ltrim($uriPath, '/');
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

try {
    route_request($method, $uriPath, request_payload());
} catch (Throwable $e) {
    // Log concise message to PHP error log
    error_log('API error: ' . $e->getMessage());

    // Detailed debug log (appends to includes/api_errors.log) for troubleshooting
    try {
        $logPath = __DIR__ . '/../includes/api_errors.log';
        $rawInput = @file_get_contents('php://input');
        $details = [];
        $details[] = '[' . date('c') . '] API Exception: ' . $e->getMessage();
        $details[] = 'Location: ' . $e->getFile() . ':' . $e->getLine();
        $details[] = 'Trace: ' . $e->getTraceAsString();
        $details[] = 'REQUEST_URI: ' . ($_SERVER['REQUEST_URI'] ?? '');
        $details[] = 'METHOD: ' . ($_SERVER['REQUEST_METHOD'] ?? '');
        $details[] = 'RAW_INPUT: ' . ($rawInput === false ? '<unavailable>' : $rawInput);
        $details[] = '_REQUEST: ' . json_encode($_REQUEST);
        $details[] = '_FILES: ' . json_encode(array_keys($_FILES ?? []));
        $details[] = str_repeat('-', 80);
        @file_put_contents($logPath, implode("\n", $details) . "\n", FILE_APPEND | LOCK_EX);
    } catch (Throwable $_) {
        // ignore logging errors
    }

    respond_json(['success' => false, 'error' => $e->getMessage()], 500);
}
