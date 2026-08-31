import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function generateBlogContent(title: string) {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: title }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is a comprehensive blog post about " + title + ". We explore the key concepts, best practices, and real-world applications.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Through this article, you will learn how to effectively implement and utilize " + title + " in your projects.",
          },
        ],
      },
    ],
  };
}

async function main() {
  console.log("🌱 Seeding database...");

  // Create tags
  const tags = await Promise.all(
    [
      { name: "Technology", slug: "technology" },
      { name: "Programming", slug: "programming" },
      { name: "Design", slug: "design" },
      { name: "AI", slug: "ai" },
      { name: "Web Development", slug: "web-development" },
      { name: "Mobile", slug: "mobile" },
      { name: "Tutorial", slug: "tutorial" },
      { name: "News", slug: "news" },
    ].map((tag) =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        update: {},
        create: tag,
      })
    )
  );

  console.log(`✅ Created ${tags.length} tags`);

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@example.com",
      emailVerified: true,
      image: null,
    },
  });

  console.log(`✅ Created user: ${user.name}`);

  // Create demo posts
  const posts = [
    {
      title: "Next.js bilan zamonaviy web ilovalar yaratish",
      slug: "nextjs-bilan-zamonaviy-web-ilovalar",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Kirish" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Next.js — bu React asosidagi eng mashhur freymvorklardan biri. U serverda render qilish, statik sayt yaratish va API marshrutlarini qo'llab-quvvatlaydi.",
              },
            ],
          },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "App Router" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Next.js 13 dan boshlab App Router tizimi joriy qilindi. Bu yangi fayl tizimi asosidagi marshrutlash tizimi bo'lib, React Server Components bilan ishlaydi.",
              },
            ],
          },
        ],
      },
      language: "uz",
      published: true,
      featured: true,
      readingTime: 5,
      tagSlugs: ["programming", "web-development", "tutorial"],
    },
    {
      title: "TypeScriptでの型安全なプログラミング",
      slug: "typescript-type-safe-programming",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "はじめに" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "TypeScriptは、JavaScriptに静的型付けを追加するプログラミング言語です。大規模なアプリケーション開発において、バグの早期発見とコードの品質向上に貢献します。",
              },
            ],
          },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "型システムの基本" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "TypeScriptの型システムは非常に強力で、ジェネリクス、ユニオン型、インターセクション型など、多くの高度な機能を提供しています。",
              },
            ],
          },
        ],
      },
      language: "ja",
      published: true,
      featured: true,
      readingTime: 4,
      tagSlugs: ["programming", "technology"],
    },
    {
      title: "Sun'iy intellekt va kelajak",
      slug: "suniy-intellekt-va-kelajak",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Sun'iy intellekt texnologiyalari tezlik bilan rivojlanmoqda. ChatGPT, Claude va boshqa AI modellari bizning kundalik hayotimizga chuqur kirib bormoqda.",
              },
            ],
          },
        ],
      },
      language: "uz",
      published: true,
      featured: false,
      readingTime: 3,
      tagSlugs: ["ai", "technology", "news"],
    },
    {
      title: "React Native ile mobil uygulama gelishtirish",
      slug: "react-native-mobil-dastur",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Bu qoralama post React Native haqida. Hali tugallanmagan.",
              },
            ],
          },
        ],
      },
      language: "uz",
      published: false,
      featured: false,
      readingTime: 2,
      tagSlugs: ["mobile", "programming"],
    },
  ];

  // Pre-computed translations for each post in all 4 languages
  const postTranslations: Record<string, Record<string, { title: string; content: object }>> = {
    "nextjs-bilan-zamonaviy-web-ilovalar": {
      uz: {
        title: "Next.js bilan zamonaviy web ilovalar yaratish",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Kirish" }] },
            { type: "paragraph", content: [{ type: "text", text: "Next.js — bu React asosidagi eng mashhur freymvorklardan biri. U serverda render qilish, statik sayt yaratish va API marshrutlarini qo'llab-quvvatlaydi." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "App Router" }] },
            { type: "paragraph", content: [{ type: "text", text: "Next.js 13 dan boshlab App Router tizimi joriy qilindi. Bu yangi fayl tizimi asosidagi marshrutlash tizimi bo'lib, React Server Components bilan ishlaydi." }] },
          ],
        },
      },
      en: {
        title: "Creating Modern Web Applications with Next.js",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Introduction" }] },
            { type: "paragraph", content: [{ type: "text", text: "Next.js is one of the most popular frameworks based on React. It supports server-side rendering, static site generation, and API routes." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "App Router" }] },
            { type: "paragraph", content: [{ type: "text", text: "Starting from Next.js 13, the App Router system was introduced. This is a new file system-based routing system that works with React Server Components." }] },
          ],
        },
      },
      ja: {
        title: "Next.jsでモダンなウェブアプリケーションを作成する",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "はじめに" }] },
            { type: "paragraph", content: [{ type: "text", text: "Next.jsはReactベースの最も人気のあるフレームワークの1つです。サーバーサイドレンダリング、静的サイト生成、APIルートをサポートしています。" }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "App Router" }] },
            { type: "paragraph", content: [{ type: "text", text: "Next.js 13からApp Routerシステムが導入されました。これはReact Server Componentsと連携するファイルシステムベースの新しいルーティングシステムです。" }] },
          ],
        },
      },
      ru: {
        title: "Создание современных веб-приложений с Next.js",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Введение" }] },
            { type: "paragraph", content: [{ type: "text", text: "Next.js — это один из самых популярных фреймворков на основе React. Он поддерживает серверный рендеринг, генерацию статических сайтов и маршруты API." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "App Router" }] },
            { type: "paragraph", content: [{ type: "text", text: "Начиная с Next.js 13, была введена система App Router. Это новая файловая система маршрутизации, работающая с React Server Components." }] },
          ],
        },
      },
    },
    "typescript-type-safe-programming": {
      uz: {
        title: "TypeScript bilan xavfsiz turdagi dasturlash",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Kirish" }] },
            { type: "paragraph", content: [{ type: "text", text: "TypeScript — bu JavaScriptga statik turlarni qo'shadigan dasturlash tili. U katta hajmdagi ilovalarni ishlab chiqishda xatolarni erta aniqlash va kod sifatini oshirishga yordam beradi." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Tur tizimining asoslari" }] },
            { type: "paragraph", content: [{ type: "text", text: "TypeScriptning tur tizimi juda kuchli bo'lib, generiklar, birlashtirish turlari va kesishish turlari kabi ko'plab ilg'or imkoniyatlarni taqdim etadi." }] },
          ],
        },
      },
      en: {
        title: "Type-Safe Programming with TypeScript",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Introduction" }] },
            { type: "paragraph", content: [{ type: "text", text: "TypeScript is a programming language that adds static typing to JavaScript. It contributes to early bug detection and code quality improvement in large-scale application development." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Type System Basics" }] },
            { type: "paragraph", content: [{ type: "text", text: "TypeScript's type system is very powerful, offering many advanced features such as generics, union types, and intersection types." }] },
          ],
        },
      },
      ja: {
        title: "TypeScriptでの型安全なプログラミング",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "はじめに" }] },
            { type: "paragraph", content: [{ type: "text", text: "TypeScriptは、JavaScriptに静的型付けを追加するプログラミング言語です。大規模なアプリケーション開発において、バグの早期発見とコードの品質向上に貢献します。" }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "型システムの基本" }] },
            { type: "paragraph", content: [{ type: "text", text: "TypeScriptの型システムは非常に強力で、ジェネリクス、ユニオン型、インターセクション型など、多くの高度な機能を提供しています。" }] },
          ],
        },
      },
      ru: {
        title: "Типобезопасное программирование на TypeScript",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Введение" }] },
            { type: "paragraph", content: [{ type: "text", text: "TypeScript — это язык программирования, добавляющий статическую типизацию в JavaScript. Он способствует раннему обнаружению ошибок и повышению качества кода при разработке крупных приложений." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Основы системы типов" }] },
            { type: "paragraph", content: [{ type: "text", text: "Система типов TypeScript очень мощная и предоставляет множество продвинутых возможностей, таких как дженерики, объединённые типы и типы пересечений." }] },
          ],
        },
      },
    },
    "suniy-intellekt-va-kelajak": {
      uz: {
        title: "Sun'iy intellekt va kelajak",
        content: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Sun'iy intellekt texnologiyalari tezlik bilan rivojlanmoqda. ChatGPT, Claude va boshqa AI modellari bizning kundalik hayotimizga chuqur kirib bormoqda." }] },
          ],
        },
      },
      en: {
        title: "Artificial Intelligence and the Future",
        content: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Artificial intelligence technologies are developing rapidly. ChatGPT, Claude and other AI models are deeply penetrating into our daily lives." }] },
          ],
        },
      },
      ja: {
        title: "人工知能と未来",
        content: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "人工知能技術は急速に発展しています。ChatGPT、Claudeなどのaiモデルは私たちの日常生活に深く浸透しています。" }] },
          ],
        },
      },
      ru: {
        title: "Искусственный интеллект и будущее",
        content: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Технологии искусственного интеллекта стремительно развиваются. ChatGPT, Claude и другие ИИ-модели глубоко проникают в нашу повседневную жизнь." }] },
          ],
        },
      },
    },
    "react-native-mobil-dastur": {
      uz: {
        title: "React Native ile mobil uygulama gelishtirish",
        content: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Bu qoralama post React Native haqida. Hali tugallanmagan." }] },
          ],
        },
      },
      en: {
        title: "Mobile App Development with React Native",
        content: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "This is a draft post about React Native. Not yet completed." }] },
          ],
        },
      },
      ja: {
        title: "React Nativeによるモバイルアプリ開発",
        content: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "これはReact Nativeに関する下書き記事です。まだ完成していません。" }] },
          ],
        },
      },
      ru: {
        title: "Разработка мобильных приложений с React Native",
        content: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Это черновик поста о React Native. Ещё не завершён." }] },
          ],
        },
      },
    },
  };

  for (const postData of posts) {
    const { tagSlugs, ...data } = postData;
    const post = await prisma.post.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        authorId: user.id,
      },
    });
    console.log(`✅ Created post: ${post.title}`);

    const tagIds = tagSlugs.map((slug) => tags.find((t) => t.slug === slug)!.id);

    // Create translations for each post in all 4 languages
    const translationsMap = postTranslations[data.slug];
    if (translationsMap) {
      for (const [lang, translation] of Object.entries(translationsMap)) {
        const isOriginal = lang === data.language;
        const translationSlug = isOriginal ? data.slug : `${data.slug}-${lang}`;
        const created = await prisma.postTranslation.upsert({
          where: { postId_language: { postId: post.id, language: lang } },
          update: {},
          create: {
            postId: post.id,
            language: lang,
            title: translation.title,
            content: translation.content,
            slug: translationSlug,
            coverImage: "coverImage" in data ? (data.coverImage ?? null) : null,
            isOriginal,
            translationStatus: isOriginal ? "ORIGINAL" : "AUTO_TRANSLATED",
          },
        });

        // Attach the same tags to every language's translation row.
        await prisma.postTranslationTag.createMany({
          data: tagIds.map((tagId) => ({ postTranslationId: created.id, tagId })),
          skipDuplicates: true,
        });
      }
      console.log(`  ✅ Added translations for: ${Object.keys(translationsMap).join(", ")}`);
    }
  }

  console.log("\n🎉 Seed completed!");
  console.log("\n📊 Creating focused test data...\n");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      emailVerified: true,
      image: null,
      role: "ADMIN",
    },
  });
  console.log(`✅ Created admin: ${admin.name} (${admin.email})`);

  // Create 29 teacher users
  const teachers = [];
  for (let i = 1; i <= 29; i++) {
    const teacher = await prisma.user.upsert({
      where: { email: `teacher${i}@example.com` },
      update: {},
      create: {
        name: `Teacher ${i}`,
        email: `teacher${i}@example.com`,
        emailVerified: true,
        image: null,
        role: "TEACHER",
      },
    });
    teachers.push(teacher);
    if (i % 10 === 0) console.log(`✅ Created teachers 1-${i}`);
  }
  console.log(`✅ Created total 29 teachers`);

  // Get random tags
  const allTags = await prisma.tag.findMany();
  const getRandomTags = () => {
    if (allTags.length === 0) return [];
    const shuffled = [...allTags].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.floor(Math.random() * 3) + 1);
  };

  // Create 30 blogs
  const createdPosts = [];
  const blogTitles = [
    "Getting Started with Modern Web Development",
    "Best Practices in Software Architecture",
    "Mastering Async Programming",
    "Building Scalable Applications",
    "Clean Code Principles",
    "Database Design Patterns",
    "Testing Strategies for Production",
    "Security in Web Applications",
    "Performance Optimization Techniques",
    "Cloud Computing Basics",
    "Microservices Architecture",
    "DevOps Essentials",
    "API Design Best Practices",
    "Frontend Optimization",
    "Backend Development with Node.js",
    "React Advanced Patterns",
    "Vue.js Deep Dive",
    "Angular for Enterprise",
    "GraphQL vs REST",
    "Containerization with Docker",
    "Kubernetes Orchestration",
    "CI/CD Pipelines",
    "Machine Learning Basics",
    "Data Engineering Fundamentals",
    "Web Performance Metrics",
    "Accessibility Guidelines",
    "Mobile App Development",
    "Progressive Web Apps",
    "Serverless Architecture",
    "Event-Driven Applications",
  ];

  for (let i = 0; i < 30; i++) {
    const title = blogTitles[i];
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const uniqueSlug = slug + "-" + i;

    const randomTags = getRandomTags();
    const content = await generateBlogContent(title);

    const post = await prisma.post.upsert({
      where: { slug: uniqueSlug },
      update: {},
      create: {
        title: title,
        slug: uniqueSlug,
        content,
        language: "en",
        published: Math.random() > 0.2, // 80% published
        featured: Math.random() > 0.8, // 20% featured
        readingTime: Math.floor(Math.random() * 10) + 3,
        authorId: admin.id,
      },
    });

    // Create the original-language translation row (required since slug
    // is now per-translation) and attach this post's tags there.
    const translation = await prisma.postTranslation.upsert({
      where: { postId_language: { postId: post.id, language: "en" } },
      update: {},
      create: {
        postId: post.id,
        language: "en",
        title,
        content,
        slug: uniqueSlug,
        isOriginal: true,
        translationStatus: "ORIGINAL",
      },
    });

    if (randomTags.length > 0) {
      await prisma.postTranslationTag.createMany({
        data: randomTags.map((tag) => ({
          postTranslationId: translation.id,
          tagId: tag.id,
        })),
        skipDuplicates: true,
      });
    }

    createdPosts.push(post);
    console.log(`✅ Created blog ${i + 1}/30: "${title}"`);

    // Add 2-3 comments to each blog from random teachers
    const commentCount = Math.floor(Math.random() * 2) + 2; // 2-3 comments
    for (let c = 0; c < commentCount; c++) {
      const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)];

      const comment = await prisma.comment.create({
        data: {
          content: `Great article! This really helped me understand ${title.toLowerCase()}. Looking forward to more posts like this.`,
          authorId: randomTeacher.id,
          postId: post.id,
        },
      });

      // Add 1-2 replies to each comment
      const replyCount = Math.floor(Math.random() * 2) + 1; // 1-2 replies
      for (let r = 0; r < replyCount; r++) {
        const replyTeacher = teachers[Math.floor(Math.random() * teachers.length)];
        await prisma.comment.create({
          data: {
            content: `Thanks for sharing! I agree with your point. Have you considered ${["using this approach", "implementing this pattern", "exploring this further"][r % 3]}?`,
            authorId: replyTeacher.id,
            postId: post.id,
            parentId: comment.id, // This makes it a reply to the parent comment
          },
        });
      }
    }
  }

  console.log(
    `\n✅ Created 30 blogs with ${createdPosts.length * 2.5} comments and replies (average 2.5 per blog)\n`
  );

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
