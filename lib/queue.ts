/**
 * Database-based translation job queue (NeonDB / PostgreSQL)
 *
 * No external services needed — jobs are stored in TranslationJob table
 * and processed by the /api/worker cron endpoint.
 */

import { prisma } from "@/lib/prisma";

const MAX_RETRIES = 3;

/**
 * Enqueue a translation job for the given post.
 * Creates a PENDING row in TranslationJob — returns immediately.
 */
export async function addTranslationJob(postId: string): Promise<void> {
  await prisma.translationJob.create({
    data: { postId, status: "PENDING" },
  });

  console.log(`📤 Translation job queued for post ${postId}`);
}

/**
 * Claim the next PENDING job (atomic: sets status = PROCESSING).
 * Returns null when the queue is empty.
 */
export async function claimNextJob() {
  // Find oldest pending job that hasn't exceeded retries
  const job = await prisma.translationJob.findFirst({
    where: {
      status: "PENDING",
      retries: { lt: MAX_RETRIES },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return null;

  // Atomically mark it PROCESSING (prevents duplicate pickup)
  return prisma.translationJob.update({
    where: { id: job.id, status: "PENDING" },
    data: { status: "PROCESSING" },
  });
}

/**
 * Mark a job as DONE.
 */
export async function markJobDone(jobId: string): Promise<void> {
  await prisma.translationJob.update({
    where: { id: jobId },
    data: { status: "DONE" },
  });
}

/**
 * Mark a job as FAILED. If retries < MAX_RETRIES, reset to PENDING for retry.
 */
export async function markJobFailed(
  jobId: string,
  error: string
): Promise<void> {
  const job = await prisma.translationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) return;

  if (job.retries + 1 < MAX_RETRIES) {
    // Reset to PENDING for automatic retry
    await prisma.translationJob.update({
      where: { id: jobId },
      data: {
        status: "PENDING",
        retries: { increment: 1 },
        error,
      },
    });
  } else {
    // Max retries reached — permanently failed
    await prisma.translationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        retries: { increment: 1 },
        error,
      },
    });
  }
}
