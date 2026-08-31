/**
 * usePostStatus — polls a post's status every 3 s until it
 * settles to PUBLISHED or FAILED. Uses React Query.
 */

"use client";

// import { useQuery } from "@tanstack/react-query";
// @tanstack/react-query not installed yet - install when needed
// import type { UseQueryResult } from "@tanstack/react-query";

export type PostStatus = "PROCESSING" | "PUBLISHED" | "FAILED";

// TODO: Uncomment and install @tanstack/react-query when implementing post status polling
/*
export function usePostStatus(postId: string | null) {
  return useQuery<PostStatusResponse>({
    queryKey: ["post-status", postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) throw new Error("Failed to fetch post status");
      return res.json();
    },
    enabled: !!postId,
    refetchInterval: (query) => {
      // Stop polling once settled
      const status = query.state.data?.status;
      if (status === "PUBLISHED" || status === "FAILED") return false;
      return 3000; // poll every 3 s
    },
  });
}
*/
