import { MessageSquareHeart } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { FeedbackBoard } from "@/components/feedback-board";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function FeedbackPage() {
  const session = await requireSession();
  const outletId = await resolveOutletId(session);
  const feedbacks = await prisma.feedback.findMany({
    where: { outletId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const avg =
    feedbacks.length === 0
      ? 0
      : feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length;

  return (
    <ModulePage title="Feedback" subtitle="Ratings & reviews" icon={MessageSquareHeart}>
      <StatRow
        stats={[
          { label: "Reviews", value: String(feedbacks.length) },
          { label: "Average", value: avg.toFixed(1) },
          { label: "5-star", value: String(feedbacks.filter((f) => f.rating === 5).length) },
          { label: "Synced", value: "Live" },
        ]}
      />
      <FeedbackBoard
        avgRating={avg}
        feedbacks={feedbacks.map((f) => ({
          id: f.id,
          rating: f.rating,
          comment: f.comment,
          customerName: f.customerName,
          createdAt: f.createdAt.toISOString(),
        }))}
      />
    </ModulePage>
  );
}
