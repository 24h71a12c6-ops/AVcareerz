<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

load_local_env(__DIR__ . '/.env');
load_local_env(dirname(__DIR__) . '/.env');

function php_escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function brevo_sender_email(): string
{
    return env_value('BREVO_SENDER_EMAIL', env_value('EMAIL_USER', 'info@avcareerz.com'));
}

function brevo_sender_name(): string
{
    return env_value('BREVO_SENDER_NAME', 'AVcareerz');
}

function admin_email_list(): array
{
    $emails = [];

    $primary = trim((string) env_value('ADMIN_EMAIL', ''));
    if ($primary !== '') {
        $emails[] = $primary;
    }

    $csvList = env_value('ADMIN_EMAILS', '');
    if ($csvList !== '') {
        foreach (explode(',', $csvList) as $email) {
            $email = trim($email);
            if ($email !== '') {
                $emails[] = $email;
            }
        }
    }

    $fallback = trim((string) env_value('EMAIL_USER', 'info@avcareerz.com'));
    if ($fallback !== '') {
        $emails[] = $fallback;
    }

    return array_values(array_unique($emails));
}

function send_brevo_mail(array|string $to, string $subject, string $html): bool
{
    $apiKey = env_value('BREVO_API_KEY');
    $senderEmail = brevo_sender_email();
    $senderName = brevo_sender_name();

  // Dry-run mode: do not call Brevo, just log the outgoing mail payload.
  $dryRun = trim((string) (getenv('EMAIL_DRY_RUN') ?? '')) === '1';
  if ($dryRun) {
    $recipients = is_array($to) ? implode(',', array_filter(array_map('trim', $to))) : trim((string) $to);
    $logEntry = '[' . date('c') . "] DRY_RUN to: " . $recipients . " subject: " . $subject . "\n" . $html . "\n\n";
    @file_put_contents(__DIR__ . '/email_dry_run.log', $logEntry, FILE_APPEND | LOCK_EX);
    return true;
  }

  if ($apiKey === '') {
    throw new RuntimeException('BREVO_API_KEY is missing.');
  }

    $recipients = is_array($to) ? array_values(array_filter(array_map('trim', $to))) : [trim($to)];
    if ($recipients === [] || $recipients === ['']) {
        throw new RuntimeException('Recipient email is required.');
    }

    $payload = [
        'sender' => ['email' => $senderEmail, 'name' => $senderName],
        'to' => array_map(static fn ($email) => ['email' => $email], $recipients),
        'subject' => $subject,
        'htmlContent' => $html,
    ];

    $context = stream_context_create([
      'http' => [
        'method' => 'POST',
        'header' => implode("\r\n", [
          'api-key: ' . $apiKey,
          'Content-Type: application/json',
          'Accept: application/json',
        ]),
        'content' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ignore_errors' => true,
        'timeout' => 20,
      ],
      'ssl' => [
        'verify_peer' => true,
        'verify_peer_name' => true,
      ],
    ]);

    $lastError = null;
    set_error_handler(static function (int $severity, string $message) use (&$lastError): bool {
      $lastError = $message;
      return true;
    });
    $response = file_get_contents('https://api.brevo.com/v3/smtp/email', false, $context);
    restore_error_handler();
    $status = 0;
    foreach (($http_response_header ?? []) as $headerLine) {
      if (preg_match('/^HTTP\/\d(?:\.\d)?\s+(\d{3})/', $headerLine, $matches)) {
        $status = (int) $matches[1];
        break;
      }
    }

    

    if ($response === false) {
      throw new RuntimeException('Brevo send error: ' . ($lastError ?? ('HTTP ' . ($status > 0 ? (string) $status : 'unknown'))));
    }

    if ($status >= 400) {
        throw new RuntimeException('Brevo send error (' . $status . '): ' . $response);
    }

    return true;
}

function send_html_mail(string $to, string $subject, string $html, string $fromEmail = '', string $fromName = ''): bool
{
    return send_brevo_mail($to, $subject, $html);
}

function send_admin_email(array $user, ?string $customSubject = null, string $step = '1'): bool
{
    $rows = '';
    foreach ($user as $key => $value) {
        if ($value === null || $value === '') {
            continue;
        }

        $label = (string) preg_replace('/(?<!^)([A-Z])/', ' $1', (string) $key);
        $label = ucwords(str_replace(['_', '-'], ' ', $label));
        if (stripos($label, 'Password') !== false) {
            continue;
        }

        $rows .= sprintf(
            '<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-weight:600;color:#4a5568;width:40%%;vertical-align:top;">%s</td><td style="padding:12px 16px;color:#1a202c;vertical-align:top;">%s</td></tr>',
            php_escape($label),
            php_escape(is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES))
        );
    }

    if ($step === '2') {
        $stepLabel = 'Step 2 - Complete Application';
        $stepColor = '#1e40af';
    } elseif ($step === 'login') {
        $stepLabel = 'User Login Notification';
        $stepColor = '#0f766e';
    } else {
        $stepLabel = 'Step 1 - Initial Registration';
        $stepColor = '#0D4B75';
    }

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f7fafc;margin:0;padding:20px;">
  <div style="max-width:650px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
    <div style="background:{$stepColor};color:#ffffff;padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:22px;font-weight:700;">New Student Submission - {$stepLabel}</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="margin-top:0;margin-bottom:20px;color:#4a5568;font-size:16px;line-height:1.5;">A new student has submitted their information. Below are the details of the submission:</p>
      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;text-align:left;">
          <tbody>
            {$rows}
          </tbody>
        </table>
      </div>
      <p style="margin-top:24px;margin-bottom:0;font-size:14px;color:#718096;text-align:center;">Please follow up with this student as soon as possible.</p>
    </div>
  </div>
</body>
</html>
HTML;

    $subject = $customSubject ?? ($step === '2'
        ? 'New Step 2 Application: Complete Details'
        : ($step === 'login' ? 'User Login Notification' : 'New Step 1 Registration'));
    $adminRecipients = admin_email_list();
    @file_put_contents(__DIR__ . '/admin_email_log.txt', '[' . date('c') . '] admin recipients: ' . implode(', ', $adminRecipients) . ' subject: ' . $subject . "\n", FILE_APPEND | LOCK_EX);
    return send_brevo_mail($adminRecipients, $subject, $html);
}

function send_confirmation_email(string $userEmail, string $userName, string $customMessage = '', array $extra = []): bool
{
    if (in_array(trim($userEmail), admin_email_list(), true)) {
        return true;
    }

    $safeName = php_escape($userName ?: 'Student');
    $safeMessage = $customMessage !== '' ? php_escape($customMessage) : 'Your registration has been successfully completed!';
    $safePreferredCountry = !empty($extra['preferredCountry']) ? php_escape((string) $extra['preferredCountry']) : '';
    $safeDesiredCourse = !empty($extra['desiredCourse']) ? php_escape((string) $extra['desiredCourse']) : '';
    $logoUrl = env_value('EMAIL_LOGO_URL', 'https://avcareerz.com/images/logonew.png');

    $destinationBlock = $safePreferredCountry !== '' ? '<p><strong>Dream destination:</strong> ' . $safePreferredCountry . '</p>' : '';
    $courseBlock = $safeDesiredCourse !== '' ? '<p><strong>Desired course:</strong> ' . $safeDesiredCourse . '</p>' : '';

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f7;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:20px;">
    <div style="text-align:center;padding-bottom:20px;"><img src="{$logoUrl}" alt="AVcareerz" style="max-width:150px;" /></div>
    <div style="color:#333333;line-height:1.6;">
      <h2>Hello {$safeName},</h2>
      <p>Thank you for registering with <strong>AVcareerz</strong>.</p>
      <p>{$safeMessage}</p>
      {$destinationBlock}
      {$courseBlock}
      <p>Our team will review your details and get back to you shortly with next steps.</p>
      <p>Best regards,<br><strong>AVcareerz Team</strong></p>
    </div>
  </div>
</body>
</html>
HTML;

  // Lightweight local logging of outgoing user confirmation attempts for local testing.
  // This avoids exposing mail provider responses while giving a record that an attempt occurred.
  try {
    $logLine = '[' . date('c') . '] to: ' . trim((string) $userEmail) . ' subject: AVcareerz - Registration Successful' . "\n";
    @file_put_contents(__DIR__ . '/user_email_log.txt', $logLine, FILE_APPEND | LOCK_EX);
  } catch (Throwable $e) {
    // ignore logging failures
  }

  return send_brevo_mail($userEmail, 'AVcareerz - Registration Successful', $html);
}

function send_google_sign_in_success_email(string $userEmail, string $userName, array $extra = []): bool
{
    if (in_array(trim($userEmail), admin_email_list(), true)) {
        return true;
    }

    $safeName = php_escape($userName ?: 'Student');
    $safeEmail = php_escape($userEmail);
    $safeSignedInAt = !empty($extra['signedInAt']) ? php_escape((string) $extra['signedInAt']) : '';
    $safeProvider = php_escape((string) ($extra['provider'] ?? 'Google'));
    $safeNextStep = php_escape((string) ($extra['nextStep'] ?? 'Please complete the application form to continue your study abroad journey.'));
    $logoUrl = env_value('EMAIL_LOGO_URL', 'https://avcareerz.com/images/logonew.png');
    $signedInLine = $safeSignedInAt !== '' ? '<p><strong>Signed in at:</strong> ' . $safeSignedInAt . '</p>' : '';

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f7;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:20px;">
    <div style="text-align:center;padding-bottom:20px;"><img src="{$logoUrl}" alt="AVcareerz" style="max-width:150px;" /></div>
    <div style="color:#333333;line-height:1.6;">
      <h2>Welcome {$safeName},</h2>
      <p>You have successfully signed in with <strong>{$safeProvider}</strong> at <strong>AVcareerz</strong>.</p>
      <p><strong>Email:</strong> {$safeEmail}</p>
      {$signedInLine}
      <p>{$safeNextStep}</p>
      <p>Once you complete the form, our team will review your application and guide you through the next steps.</p>
      <p>Best regards,<br><strong>AVcareerz Team</strong></p>
    </div>
  </div>
</body>
</html>
HTML;

    return send_brevo_mail($userEmail, 'Google Sign-In Successful - AVcareerz', $html);
}

function send_instant_alert(string $type, array $payload = []): bool
{
    $adminTo = admin_email_list();
    $statusText = 'Notification';
    $emoji = '🔔';
    $headerColor = '#0D4B75';
    $description = 'An alert has been triggered from the system. Details are provided below.';

    if ($type === 'partial') {
        $statusText = 'PARTIAL LEAD (Exit)';
        $emoji = '⚠️';
        $headerColor = '#eab308';
        $description = '<span style="color:#d97706;font-weight:700;font-size:16px;display:block;margin-bottom:8px;">⚠️ Note to Counselor:</span>This student started filling in their details on the registration form but exited or closed the page without clicking the final submit button. Please follow up with them on WhatsApp or call to help them complete their application.';
    } elseif ($type === 'login') {
        $statusText = 'USER LOGIN';
        $emoji = '🔑';
        $description = 'An existing student has logged back into their account.';
    } elseif ($type === 'signup') {
        $statusText = 'NEW REGISTRATION (Success)';
        $emoji = '🚀';
        $description = 'A new student has completed the registration form.';
    }

    $fullName = php_escape((string) ($payload['fullName'] ?? $payload['name'] ?? 'N/A'));
    $phone = php_escape((string) ($payload['phone'] ?? 'N/A'));
    $email = php_escape((string) ($payload['email'] ?? 'N/A'));
    $source = php_escape((string) ($payload['source'] ?? 'Website'));

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f7fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
    <div style="background:{$headerColor};color:#ffffff;padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.5px;">{$emoji} {$statusText}</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="margin-top:0;color:#4a5568;font-size:15px;line-height:1.6;">{$description}</p>
      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;text-align:left;">
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-weight:600;color:#4a5568;width:35%;">Name</td><td style="padding:12px 16px;color:#1a202c;">{$fullName}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-weight:600;color:#4a5568;width:35%;">Phone</td><td style="padding:12px 16px;color:#1a202c;">{$phone}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 16px;font-weight:600;color:#4a5568;width:35%;">Email</td><td style="padding:12px 16px;color:#1a202c;">{$email}</td></tr>
            <tr><td style="padding:12px 16px;font-weight:600;color:#4a5568;width:35%;">Source</td><td style="padding:12px 16px;color:#1a202c;">{$source}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
HTML;

    return send_brevo_mail($adminTo, $statusText . ': ' . ($payload['fullName'] ?? 'User'), $html);
}

function send_login_code_email(string $userEmail, string $code): bool
{
    $html = '<h2>Your login code is ' . php_escape($code) . '</h2><p>This code expires in 10 minutes.</p>';
    return send_brevo_mail($userEmail, 'Your Login Verification Code', $html);
}

function send_step2_completion_email(string $userEmail, string $userName, array $applicationData = []): bool
{
    if (in_array(trim($userEmail), admin_email_list(), true)) {
        return true;
    }

    $safeName = php_escape($userName ?: 'Student');
    $safeCountry = php_escape((string) ($applicationData['preferredCountry'] ?? ''));
    $safeUniversity = php_escape((string) ($applicationData['preferredUniversity'] ?? ''));
    $safeCourse = php_escape((string) ($applicationData['preferredCourse'] ?? ''));
    $logoUrl = env_value('EMAIL_LOGO_URL', 'https://avcareerz.com/images/logonew.png');

    $countryBlock = $safeCountry ? '<p><strong>Dream Destination:</strong> ' . $safeCountry . '</p>' : '';
    $universityBlock = $safeUniversity ? '<p><strong>Preferred University:</strong> ' . $safeUniversity . '</p>' : '';
    $courseBlock = $safeCourse ? '<p><strong>Desired Course:</strong> ' . $safeCourse . '</p>' : '';

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f7;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:20px;border-radius:8px;">
    <div style="text-align:center;padding-bottom:20px;"><img src="{$logoUrl}" alt="AVcareerz" style="max-width:150px;" /></div>
    <div style="color:#333333;line-height:1.6;">
      <h2>Hello {$safeName},</h2>
      <p>Thank you for submitting your detailed application information!</p>
      <p style="color:#666;font-weight:600;padding:12px;background:#f0f4f8;border-left:4px solid #1e40af;border-radius:4px;">✅ Your application has been successfully completed.</p>
      
      {$countryBlock}
      {$universityBlock}
      {$courseBlock}
      
      <h3 style="color:#1e40af;margin-top:24px;">Next Steps:</h3>
      <ol style="color:#555;">
        <li>Our counselors will contact you on WhatsApp to discuss your application</li>
        <li>We'll schedule a free consultation call with our study abroad experts</li>
        <li>You'll receive personalized guidance for your study abroad journey</li>
      </ol>
      
      <p style="margin-top:24px;color:#666;font-size:14px;">
        <strong>Need Help?</strong> Feel free to reach out to us anytime. Our team is here to support you!
      </p>
      
      <p style="margin-top:32px;color:#666;">Best regards,<br><strong style="color:#1e40af;">AVcareerz Team</strong></p>
      <p style="margin-top:24px;padding-top:20px;border-top:1px solid #e0e0e0;font-size:12px;color:#999;">
        Guiding Futures Beyond Borders • Abroad Vision Careerz System
      </p>
    </div>
  </div>
</body>
</html>
HTML;

    return send_brevo_mail($userEmail, 'AVcareerz - Application Complete! 🎓', $html);
}
