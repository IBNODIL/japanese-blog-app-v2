/**
 * PostStatusBadge — visual indicator for post translation status.
 *
 * PROCESSING → pulsing yellow "Publishing..."
 * PUBLISHED  → green  "Published"
 * FAILED     → red    "Failed"
 */

"use client";

import { Badge } from "@/components/ui/badge";

interface Props {
  status: string;
}

export function PostStatusBadge({ status }: Props) {
  switch (status) {
    case "PUBLISHED":
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-300" />
          Published
        </Badge>
      );

    case "FAILED":
      return (
        <Badge variant="destructive">
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />
          Failed
        </Badge>
      );

    case "PROCESSING":
    default:
      return <Badge variant="outline">Draft</Badge>;
  }
}
