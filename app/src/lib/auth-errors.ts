export function authErrorMessage(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Pogrešan email ili lozinka';
  if (message.includes('Email not confirmed')) return 'Email još nije potvrđen — proveri sanduče';
  if (message.includes('User already registered')) return 'Nalog sa tim emailom već postoji';
  if (message.includes('Password should be at least')) return 'Lozinka je prekratka';
  if (
    message.includes('For security purposes') ||
    message.includes('rate limit') ||
    message.includes('Too many requests')
  ) {
    return 'Previše pokušaja — sačekaj minut pa probaj ponovo';
  }
  if (message.includes('New password should be different')) return 'Nova lozinka mora da se razlikuje od stare';
  if (message.includes('Signups not allowed')) return 'Registracija je trenutno isključena';
  if (message.includes('Password is too weak') || message.includes('weak password')) return 'Lozinka je preslaba';
  if (message.includes('expired') || message.includes('invalid') || message.includes('Invalid')) {
    return 'Link je istekao ili nije važeći — zatraži novi';
  }
  if (message.includes('Auth session missing')) return 'Sesija je istekla — prijavi se ponovo';
  return message;
}
