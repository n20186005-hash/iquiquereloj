/**
 * 单景点 SEO 实体绑定配置变量表
 * ---------------------------------------------------------------
 * 该文件是整个站点的唯一实体数据源。若要复制本模版去制作另一个
 * 单景点站点，只需修改此处的变量即可（对应需求文档中的
 * {{DOMAIN_NAME}} / {{ATTRACTION_FULL_NAME}} / {{LATITUDE}} 等占位符）。
 */
export const attraction = {
  // {{DOMAIN_NAME}}
  domain: 'iquiquereloj.com',
  baseUrl: 'https://iquiquereloj.com',

  // {{ATTRACTION_FULL_NAME}} / {{ATTRACTION_SHORT_NAME}}
  fullName: 'Torre del Reloj',
  shortName: 'Iquique Clock Tower',

  // 语义别称（包含域名含义与地图昵称）
  alternateNames: ['Clock Tower', 'Torre Del Reloj', 'Iquique Clock Tower'],

  // 地理归属层级：City → State/Province → Country
  city: 'Iquique',
  state: 'Tarapacá',
  country: 'Chile',
  countryCode: 'CL',
  postalCode: '1100000',
  streetAddress: 'Plaza Arturo Prat, Baquedano',

  // {{LATITUDE}} / {{LONGITUDE}}（来自 Google Maps 地点坐标）
  latitude: -20.2141137,
  longitude: -70.1524016,

  // {{MAPS_SHARE_URL}} / {{MAPS_EMBED_SRC}}
  mapsShareUrl: 'https://maps.app.goo.gl/sVrMdFfi1sb1wGQ3A',
  mapsEmbedSrc:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6654.512172171392!2d-70.15240159999999!3d-20.2141137!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9152115612cb802d%3A0x5e49f72bca2f4702!2sClock%20Tower!5e1!3m2!1szh-CN!2sus!4v1789097688004!5m2!1szh-CN!2sus',

  // {{NEARBY_LANDMARK_1}} / {{NEARBY_LANDMARK_2}}
  nearbyLandmarks: ['Paseo Baquedano', 'Teatro Municipal de Iquique'],

  // {{GOVT_TOURISM_URL}}（官方旅游局 / 政府链接）
  govtTourismUrl: 'https://www.chile.travel',
  govtTourismName: 'SERNATUR – Chile Travel',

  // 图片资产（命名规范：{slug}-{序号}，含同序号 .webp 版本）
  heroImage: '/gallery/torre-del-reloj-iquique-1.jpg',
  ogImage: '/gallery/torre-del-reloj-iquique-og.jpg',
  imageAlt: 'Torre del Reloj in Iquique, Chile',
  gallery: {
    slug: 'torre-del-reloj-iquique',
    dir: '/gallery',
    count: 18,
  },

  // 实体属性
  isAccessibleForFree: true,
  openingHours: 'Mo-Su 00:00-23:59',
  rating: 4.5,
  reviewCount: 11579,
} as const;

export const absoluteImage = `${attraction.baseUrl}${attraction.heroImage}`;
export const absoluteOgImage = `${attraction.baseUrl}${attraction.ogImage}`;

/** 生成相册图片路径（jpg / webp 双格式，命名规范 {slug}-{n}） */
export function galleryImage(index: number, ext: 'jpg' | 'webp' = 'jpg'): string {
  return `${attraction.gallery.dir}/${attraction.gallery.slug}-${index}.${ext}`;
}

export default attraction;
