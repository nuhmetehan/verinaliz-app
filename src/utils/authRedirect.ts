export class UnsupportedAuthEnvironmentError extends Error {
  constructor() {
    super('Google ile giriş Expo Go üzerinden desteklenmiyor. Verinaliz’in önizleme APK’sını veya geliştirme derlemesini kullanın.');
    this.name = 'UnsupportedAuthEnvironmentError';
  }
}

export function validateAuthRedirect(redirectUri: string): void {
  if (/^exps?:/i.test(redirectUri)) throw new UnsupportedAuthEnvironmentError();
}
