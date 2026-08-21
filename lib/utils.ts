import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatVnd(value: number) {
  return value.toLocaleString("vi-VN") + "₫";
}

export function formatDateTimeVN(iso: string) {
  return new Date(iso)
    .toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
    .slice(0, 16)
    .replace("T", " ");
}
