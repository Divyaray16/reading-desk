import { Desk } from "@/components/desk";
import { kolkataLabel } from "@/lib/desk";

export const dynamic = "force-dynamic";

export default function Page() {
  return <Desk dateLabel={kolkataLabel(new Date())} />;
}
