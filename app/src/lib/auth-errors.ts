export function authErrorMessage(message: string): string {
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
