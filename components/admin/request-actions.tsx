"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setQuoteRequestStatus } from "@/app/admin/requests/actions";
import type { QuoteRequestStatus } from "@/lib/quote-store";

export function RequestActions({ id, status }: { id: string; status: QuoteRequestStatus }) {
  const [isPending, startTransition] = React.useTransition();

  function handle(next: QuoteRequestStatus) {
    startTransition(async () => {
      await setQuoteRequestStatus(id, next);
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Duyệt"
        disabled={isPending || status === "da_duyet"}
        onClick={() => handle("da_duyet")}
      >
        <Check className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Từ chối"
        disabled={isPending || status === "tu_choi"}
        onClick={() => handle("tu_choi")}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
