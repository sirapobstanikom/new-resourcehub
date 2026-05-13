import { getToolById, getUpdateById } from '../constants';

const SITE_URL = 'https://www.minddojo.co.th';
const SITE_NAME = 'MindDoJo Resource Hub';
const DEFAULT_IMAGE = `${SITE_URL}/updates/MindDoJoLogo.jpg`;
const DEFAULT_DESCRIPTION =
  'MindDoJo แพลตฟอร์มรวมแบบประเมิน เครื่องมือพัฒนาองค์กร เครื่องมือวางแผนกลยุทธ์ เทมเพลตธุรกิจ และความรู้ด้านนวัตกรรมสำหรับองค์กรไทย';

type SeoConfig = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
  robots?: string;
  schema?: Record<string, unknown> | Record<string, unknown>[];
};

const assessmentSeo: Record<string, Pick<SeoConfig, 'title' | 'description'>> = {
  '/assessment/minddojo': {
    title: 'MindDoJo AI Assessment | แบบประเมินทักษะการทำงานและการสื่อสาร',
    description:
      'ทำแบบประเมิน MindDoJo AI Assessment เพื่อสำรวจทักษะการสื่อสาร การตัดสินใจ และการรับมือสถานการณ์ผ่าน AI role play',
  },
  '/assessment/leadership': {
    title: 'แบบประเมินภาวะผู้นำ | Dynamic Leadership Capability Wheel',
    description:
      'ประเมินสมรรถนะภาวะผู้นำผ่านกรอบ Dynamic Leadership Capability Wheel ครอบคลุม Be AWARE, ADAPT และ ACT',
  },
  '/assessment/leaderships': {
    title: 'แบบประเมินภาวะผู้นำ | Dynamic Leadership Capability Wheel',
    description:
      'ประเมินสมรรถนะภาวะผู้นำผ่านกรอบ Dynamic Leadership Capability Wheel ครอบคลุม Be AWARE, ADAPT และ ACT',
  },
  '/assessment/persuasion': {
    title: 'Persuasion Test | แบบประเมินสไตล์การโน้มน้าว',
    description:
      'สำรวจสไตล์การโน้มน้าวและจิตวิทยาการสื่อสารด้วย Persuasion Test จาก MindDoJo สำหรับพัฒนาการทำงานร่วมกัน',
  },
  '/assessment/digital-leadership': {
    title: 'Digital Leadership Competency Assessment | แบบประเมินผู้นำดิจิทัล',
    description:
      'ประเมินทักษะผู้นำดิจิทัล 4 มิติ ได้แก่ AI Mindset, Digital Literacy, Application และ Leadership & Governance',
  },
  '/assessment/reactive-proactive-mindset': {
    title: 'Reactive vs Proactive Mindset Assessment | แบบประเมิน Mindset การทำงาน',
    description:
      'สำรวจแนวโน้ม Reactive และ Proactive Mindset ในการรับมือปัญหา การสื่อสาร การตัดสินใจ และความรับผิดชอบต่อผลลัพธ์',
  },
  '/assessment/conflict-management-style': {
    title: 'การประเมินรูปแบบการจัดการความขัดแย้ง | Conflict Management Style',
    description:
      'แบบประเมิน MindDoJo 15 ข้อ วัดรูปแบบการจัดการความขัดแย้ง 5 แบบ: หลีกหนี ยอมตาม เอาชนะ ร่วมมือ และประนีประนอม',
  },
  '/assessment/disc': {
    title: 'DISC Assessment | แบบประเมินบุคลิกภาพ DISC',
    description:
      'ทำแบบประเมิน DISC เพื่อเข้าใจสไตล์บุคลิกภาพ การสื่อสาร และแนวทางการทำงานร่วมกับผู้อื่นอย่างมีประสิทธิภาพ',
  },
};

function absoluteUrl(path: string): string {
  return new URL(path || '/', SITE_URL).toString();
}

function normalizeImage(image?: string): string {
  if (!image) return DEFAULT_IMAGE;
  if (image.startsWith('http')) return image;
  return absoluteUrl(image);
}

function upsertMeta(selector: string, attrs: Record<string, string>): void {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
}

function upsertLink(selector: string, attrs: Record<string, string>): void {
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
}

function upsertJsonLd(schema: SeoConfig['schema']): void {
  const id = 'route-jsonld';
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!schema) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(schema);
}

function pageSchema(config: SeoConfig): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': config.type === 'article' ? 'Article' : 'WebPage',
    headline: config.title,
    name: config.title,
    description: config.description,
    url: absoluteUrl(config.path),
    image: normalizeImage(config.image),
    inLanguage: 'th-TH',
    publisher: {
      '@type': 'Organization',
      name: 'MindDoJo',
      url: SITE_URL,
      logo: DEFAULT_IMAGE,
    },
  };
}

function getSeoConfig(pathname: string): SeoConfig {
  const basePath = pathname === '/home' ? '/' : pathname;
  const toolMatch = basePath.match(/^\/tool\/([^/]+)/);
  const updateMatch = basePath.match(/^\/update\/(.+)/);

  if (toolMatch) {
    const tool = getToolById(decodeURIComponent(toolMatch[1]));
    if (tool) {
      return {
        title: `${tool.name} | เครื่องมือธุรกิจและเทมเพลต | MindDoJo`,
        description: tool.longDescription || tool.description,
        path: basePath,
        image: tool.exampleImage,
        robots: 'noindex, follow',
      };
    }
  }

  if (updateMatch) {
    const update = getUpdateById(decodeURIComponent(updateMatch[1]));
    if (update) {
      return {
        title: `${update.title} | Innovation Updates | MindDoJo`,
        description: update.description,
        path: basePath,
        image: update.image,
        type: 'article',
        robots: 'noindex, follow',
      };
    }
  }

  if (assessmentSeo[basePath]) {
    return {
      ...assessmentSeo[basePath],
      path: basePath,
    };
  }

  if (basePath === '/resourcehub') {
    return {
      title: 'ResourceHub | เครื่องมือกลยุทธ์ เทมเพลตธุรกิจ และ Innovation Updates',
      description:
        'คลังเครื่องมือเชิงกลยุทธ์ เทมเพลตธุรกิจ Business Model Canvas, Game Plan, Product Strategy และความรู้ด้านนวัตกรรมจาก MindDoJo',
      path: basePath,
      robots: 'noindex, follow',
    };
  }

  if (
    basePath === '/login' ||
    basePath === '/register' ||
    basePath === '/course-wheel' ||
    basePath.startsWith('/admin') ||
    basePath.startsWith('/room') ||
    basePath.startsWith('/evaluation/eva-editor') ||
    basePath.startsWith('/evaluation/dashboard')
  ) {
    return {
      title: 'เข้าสู่ระบบ | MindDoJo',
      description: DEFAULT_DESCRIPTION,
      path: basePath,
      robots: 'noindex, nofollow',
    };
  }

  return {
    title: 'MindDoJo | แบบประเมิน เครื่องมือพัฒนาองค์กร และ Resource Hub',
    description: DEFAULT_DESCRIPTION,
    path: '/',
  };
}

export function updateSeoTags(pathname: string): void {
  const config = getSeoConfig(pathname);
  const title = `${config.title} | ${SITE_NAME}`;
  const description = config.description.slice(0, 300);
  const url = absoluteUrl(config.path);
  const image = normalizeImage(config.image);
  const robots = config.robots || 'index, follow, max-image-preview:large';

  document.documentElement.lang = 'th';
  document.title = title;

  upsertMeta('meta[name="description"]', { name: 'description', content: description });
  upsertMeta('meta[name="robots"]', { name: 'robots', content: robots });
  upsertMeta('meta[name="author"]', { name: 'author', content: 'MindDoJo CO., LTD.' });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: config.type || 'website' });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'th_TH' });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:url"]', { name: 'twitter:url', content: url });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
  upsertLink('link[rel="canonical"]', { rel: 'canonical', href: url });
  upsertJsonLd(config.schema || pageSchema(config));
}
