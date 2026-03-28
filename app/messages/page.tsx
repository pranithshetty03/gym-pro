"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function MessagesPage() {
  const router = useRouter();

  useEffect(() => {
    toast.info("Payment QR has been removed. Use Reminders to notify members via SMS or email.");
    router.replace("/reminders");
  }, [router]);

  return null;
}
