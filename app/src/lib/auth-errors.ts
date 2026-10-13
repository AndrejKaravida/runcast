const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: 'errors.invalidCredentials',
  user_already_exists: 'errors.userExists',
  email_not_confirmed: 'errors.emailNotConfirmed',
  weak_password: 'errors.weakPassword',
  over_email_send_rate_limit: 'errors.tooManyAttempts',
  same_password: 'errors.passwordUnchanged',
  signup_disabled: 'errors.signupsDisabled',
  otp_expired: 'errors.linkInvalid',
  session_not_found: 'errors.sessionExpired',
  session_expired: 'errors.sessionExpired',
};

export function authErrorMessage(message: string, code?: string | null): string {
  if (code) {
    const mapped = CODE_MESSAGES[code];
    if (mapped) return mapped;
  }
  if (message.includes('Invalid login credentials')) return 'errors.invalidCredentials';
  if (message.includes('Email not confirmed')) return 'errors.emailNotConfirmed';
  if (message.includes('User already registered')) return 'errors.userExists';
  if (message.includes('Password should be at least')) return 'errors.passwordTooShort';
  if (
    message.includes('For security purposes') ||
    message.includes('rate limit') ||
    message.includes('Too many requests')
  ) {
    return 'errors.tooManyAttempts';
  }
  if (message.includes('New password should be different')) return 'errors.passwordUnchanged';
  if (message.includes('Signups not allowed')) return 'errors.signupsDisabled';
  if (message.includes('Password is too weak') || message.includes('weak password')) return 'errors.weakPassword';
  if (message.includes('expired') || message.includes('invalid') || message.includes('Invalid')) {
    return 'errors.linkInvalid';
  }
  if (message.includes('Auth session missing')) return 'errors.sessionExpired';
  return 'errors.unknown';
}
