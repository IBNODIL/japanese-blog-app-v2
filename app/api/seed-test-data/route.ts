import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DEVELOPMENT ONLY: seeds fake users/posts/comments into the database.
export async function POST(request: NextRequest) {
  // Hard block in production regardless of header — this endpoint writes
  // dozens of rows (including a SUPER_ADMIN account) and must never be
  // reachable on a live deployment.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { message: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const seedKey = process.env.SEED_KEY;

  // Require a real secret from the environment — never compare against a
  // hardcoded value baked into source.
  if (!seedKey || authHeader !== `Bearer ${seedKey}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log("🌱 Starting seed...");

    // Create super admin user
    await prisma.user.upsert({
      where: { email: "superadmin@example.com" },
      update: {},
      create: {
        name: "Super Admin User",
        email: "superadmin@example.com",
        emailVerified: true,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin",
        role: "SUPER_ADMIN",
      },
    });
    console.log("✓ Super Admin user created");

    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        name: "Admin User",
        email: "admin@example.com",
        emailVerified: true,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
        role: "ADMIN",
      },
    });
    console.log("✓ Admin user created");

    // Create 29 teacher users
    const teacherUsers = [];
    for (let i = 1; i <= 29; i++) {
      const teacher = await prisma.user.upsert({
        where: { email: `teacher${i}@example.com` },
        update: {},
        create: {
          name: `Teacher ${i}`,
          email: `teacher${i}@example.com`,
          emailVerified: true,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=teacher${i}`,
          role: "TEACHER",
        },
      });
      teacherUsers.push(teacher);
    }
    console.log(`✓ ${teacherUsers.length} teacher users created`);

    // Create 30 blog posts
    const blogPosts = [];
    for (let i = 1; i <= 30; i++) {
      const slug = `blog-post-${i}`;
      const post = await prisma.post.upsert({
        where: { slug },
        update: {},
        create: {
          title: `Blog Post #${i}`,
          slug,
          content: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 1 },
                content: [
                  {
                    type: "text",
                    text: `Blog Post #${i}`,
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: `This is blog post number ${i}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
                  },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: `Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
                  },
                ],
              },
            ],
          },
          coverImage: `https://picsum.photos/800/600?random=${i}`,
          authorId: adminUser.id,
          published: true,
          language: "en",
          readingTime: 5,
          status: "PUBLISHED",
        },
      });
      blogPosts.push(post);
    }
    console.log(`✓ ${blogPosts.length} blog posts created`);

    // Add comments and replies
    let commentCount = 0;
    for (const post of blogPosts) {
      // 2-3 comments per blog
      const commentCount_this = Math.floor(Math.random() * 2) + 2;

      for (let c = 0; c < commentCount_this; c++) {
        const randomTeacher =
          teacherUsers[Math.floor(Math.random() * teacherUsers.length)];

        const comment = await prisma.comment.create({
          data: {
            content: `Great post! This is comment from ${randomTeacher.name}. I really enjoyed reading this article about blog post #${post.title}.`,
            postId: post.id,
            authorId: randomTeacher.id,
            language: "en",
          },
        });
        commentCount++;

        // 1-2 replies per comment
        const replyCount = Math.floor(Math.random() * 2) + 1;
        for (let r = 0; r < replyCount; r++) {
          const replyAuthor =
            teacherUsers[Math.floor(Math.random() * teacherUsers.length)];

          await prisma.comment.create({
            data: {
              content: `I agree with ${randomTeacher.name}! This is a great insight. Thanks for sharing your thoughts on this topic.`,
              postId: post.id,
              authorId: replyAuthor.id,
              parentId: comment.id,
              language: "en",
            },
          });
          commentCount++;
        }
      }
    }
    console.log(`✓ ${commentCount} comments and replies created`);

    return NextResponse.json(
      {
        success: true,
        message: "✅ Seed completed successfully!",
        summary: {
          superAdmins: 1,
          admins: 1,
          teachers: teacherUsers.length,
          blogs: blogPosts.length,
          comments: commentCount,
        },
        note: "Test accounts created. Use Google OAuth or sign up with email to access admin features.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        error: "Seed failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
