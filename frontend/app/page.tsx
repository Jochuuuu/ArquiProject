"use client";

import { useRouter } from "next/navigation";
import HomePage from "@/views/HomePage";

export default function Page() {
  const router = useRouter();
  return <HomePage onLaunchIde={() => router.push("/ide")} />;
}
