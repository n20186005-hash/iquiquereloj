export const siteConfig = {
  name: 'Torre del Reloj',
  baseUrl: 'https://iquiquereloj.com',
  locales: ['es', 'en', 'zh', 'arn'] as const,
};

export const ogLocale: Record<string, string> = {
  es: 'es_CL',
  en: 'en_US',
  zh: 'zh_CN',
  arn: 'arn',
};
