/**
 * Background translation worker — triggered by Vercel Cron (every 1 min).
 *
 * GET /api/worker
 *
 * 1. Claims the oldest PENDING TranslationJob
 * 2. Calls translatePost(postId) which reuses existing translation logic
 * 3. Marks job DONE and post PUBLISHED on success
 * 4. On error: increments retries, resets to PENDING (up to 3 retries)
 *    then marks both job and post as FAILED
 *
 * Processes one job per invocation to stay within serverless time limits.
 */

import { NextRequest, NextResponse } from "next/server";
import { claimNextJob, markJobDone, markJobFailed } from "@/lib/queue";
import { translatePost } from "@/lib/translator";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // Verify cron secret in production to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Claim next pending job
  const job = await claimNextJob();

  if (!job) {
    return NextResponse.json({ status: "idle", message: "No pending jobs" });
  }

  console.log(
    `🔧 Worker processing job ${job.id} for post ${job.postId} (attempt ${job.retries + 1})`
  );

  try {
    // 2. Run translation (reuses existing savePostTranslations logic)
    await translatePost(job.postId);

    // 3. Mark job done
    await markJobDone(job.id);

    return NextResponse.json({
      status: "done",
      jobId: job.id,
      postId: job.postId,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`❌ Worker failed for job ${job.id}: ${errorMessage}`);

    // 4. Handle failure with retry logic
    await markJobFailed(job.id, errorMessage);

    // If max retries exceeded, mark post as FAILED too
    if (job.retries + 1 >= 3) {
      await prisma.post
        .update({
          where: { id: job.postId },
          data: { status: "FAILED" },
        })
        .catch(() => {});
    }

    return NextResponse.json(
      {
        status: "failed",
        jobId: job.id,
        postId: job.postId,
        error: errorMessage,
        retries: job.retries + 1,
      },
      { status: 500 }
    );
  }
}
