import { getIronSession, IronSessionData } from "iron-session";
import { cookies } from "next/headers";
import { getServerSession, type AuthOptions } from "next-auth";
import { authOptions as rawAuthOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasAnyRole } from "@/lib/roleUtils";
import { prisma } from "@/lib/prisma";
import type { GuestSession } from "@prisma/client";

/**
 * authOptions di app/api/auth/[...nextauth]/route.ts ditulis tanpa type
 * annotation eksplisit (object literal biasa). Itu sudah valid dan jalan
 * dengan benar di runtime — TIDAK PERLU DIUBAH. Masalahnya murni di sisi
 * TypeScript: tanpa annotation, `strategy: "jwt"` ke-infer sebagai `string`
 * lebar, sehingga getServerSession() (yang mengharapkan tipe AuthOptions
 * dengan literal SessionStrategy) menolaknya secara tipe saja, bukan runtime.
 *
 * Fix-nya cukup di sisi pemanggil (file ini): cast ke AuthOptions saat
 * dipakai di sini saja, tanpa menyentuh file aslinya sama sekali.
 */
const authOptions = rawAuthOptions as AuthOptions;

/**
 * Tipe lokal untuk field custom yang diisi manual di callback session()
 * pada authOptions (role, id) — lihat app/api/auth/[...nextauth]/route.ts:
 *   session.user.id = token.sub
 *   session.user.role = token.role
 * Field ini memang ada di runtime, tapi tidak terdeklarasi di tipe default
 * NextAuth. Daripada nambah module augmentation global (next-auth.d.ts) yang
 * mempengaruhi seluruh project, di sini kita cukup definisikan tipe lokal
 * dan cast session.user ke tipe itu — efeknya cuma berlaku di file ini.
 */
interface SessionUserWithRole {
  id?: string | null;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/* ------------------------------------------------------------------ */
/*  GUEST SESSION — iron-session (signed + encrypted cookie)          */
/* ------------------------------------------------------------------ */

export const GUEST_SESSION_COOKIE_NAME = "live_chat_guest_session";

/**
 * Data yang disimpan di cookie iron-session itu sendiri.
 * Cuma `sessionId` — semua data sesungguhnya (guestName, isMuted, dll) tetap
 * di MongoDB lewat model GuestSession. Cookie cuma pembawa referensi, supaya
 * kalau ada perubahan data (mute, dll) tidak perlu re-issue cookie.
 */
export interface GuestCookieData {
  sessionId?: string;
}

declare module "iron-session" {
  interface IronSessionData extends GuestCookieData {}
}

const ironSessionOptions = {
  password: process.env.GUEST_SESSION_SECRET as string, // wajib >= 32 karakter
  cookieName: GUEST_SESSION_COOKIE_NAME,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    // Tidak set `maxAge` tetap (lihat penjelasan expiry di bawah) — cookie bertahan
    // selama browser session / sampai expiresAt di DB dicek manual tiap request.
  },
};

if (!process.env.GUEST_SESSION_SECRET || process.env.GUEST_SESSION_SECRET.length < 32) {
  // Gagal cepat saat boot kalau secret belum di-set dengan benar, daripada
  // iron-session lempar error samar di runtime saat request pertama masuk.
  console.warn(
    "[live-chat] GUEST_SESSION_SECRET belum di-set atau kurang dari 32 karakter. " +
      "iron-session TIDAK akan berfungsi dengan benar."
  );
}

async function getIronSessionInstance() {
  const cookieStore = await cookies();
  return getIronSession<IronSessionData>(cookieStore, ironSessionOptions);
}

/**
 * Dipanggil dari POST /guest-session setelah GuestSession dibuat di DB.
 * Menyimpan sessionId ke cookie ter-encrypt.
 */
export async function setGuestSessionCookie(sessionId: string) {
  const session = await getIronSessionInstance();
  session.sessionId = sessionId;
  await session.save();
}

export async function clearGuestSessionCookie() {
  const session = await getIronSessionInstance();
  session.destroy();
}

export async function getSessionIdFromCookie(): Promise<string | null> {
  const session = await getIronSessionInstance();
  return session.sessionId ?? null;
}

export type GuestSessionCheckResult =
  | { ok: true; session: GuestSession }
  | { ok: false; reason: "no_cookie" | "not_found" | "expired" | "muted" };

/**
 * Validasi sesi guest dari cookie request saat ini.
 *
 * SOAL EXPIRY: sesuai keputusan, expiry guest session terikat ke lifecycle
 * siaran (StreamConfig.onAir), BUKAN TTL waktu tetap. Field `expiresAt` di
 * GuestSession tetap dipakai sebagai fallback/hard-limit (dipakai juga sebagai
 * housekeeping), tapi pengecekan utama "apakah room masih live" dilakukan
 * terpisah lewat helper `getActiveRoomOrNull()` di lib/room.ts — endpoint yang
 * butuh keduanya (cookie valid DAN room masih aktif) harus panggil dua-duanya.
 * Helper ini SENGAJA tidak menolak berdasarkan onAir, supaya tetap reusable
 * untuk endpoint yang hanya butuh identitas guest (misal lihat nickname sendiri)
 * tanpa peduli room aktif atau tidak.
 */
export async function requireGuestSession(): Promise<GuestSessionCheckResult> {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) return { ok: false, reason: "no_cookie" };

  const session = await prisma.guestSession.findUnique({ where: { sessionId } });
  if (!session) return { ok: false, reason: "not_found" };

  if (session.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  if (session.isMuted) {
    return { ok: false, reason: "muted" };
  }

  return { ok: true, session };
}

/* ------------------------------------------------------------------ */
/*  ADMIN AUTH — NextAuth getServerSession + role check                */
/* ------------------------------------------------------------------ */

/**
 * ASUMSI yang belum saya verifikasi langsung (saya tidak punya isi
 * lib/roleUtils.ts) — TOLONG KONFIRMASI:
 * 1. `hasAnyRole(roleString: string, allowedRoles: string[]): boolean`
 *    — signature ini saya ambil dari contoh pakai di /api/stream-config:
 *      hasAnyRole(session.user.role, ["DEVELOPER", "TECHNIC"])
 * 2. Role apa saja yang dianggap "admin" untuk moderasi live-chat
 *    (hapus pesan, mute guest, dll) — saya pakai ["DEVELOPER", "TECHNIC"]
 *    sama seperti stream-config sebagai default. GANTI kalau moderasi chat
 *    harusnya boleh diakses role lain juga (misal REPORTER atau KRU).
 */
const LIVE_CHAT_ADMIN_ROLES = ["DEVELOPER", "TECHNIC"];

export interface AdminIdentity {
  adminId: string;
  adminName?: string | null;
}

export type AdminCheckResult =
  | { ok: true; admin: AdminIdentity }
  | { ok: false; reason: "no_session" | "not_admin" };

export async function requireAdmin(): Promise<AdminCheckResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { ok: false, reason: "no_session" };
  }

  // Cast lokal ke tipe yang punya `role` & `id` — lihat komentar
  // SessionUserWithRole di atas untuk alasan kenapa cast ini diperlukan.
  const user = session.user as SessionUserWithRole;

  if (!hasAnyRole(user.role ?? "", LIVE_CHAT_ADMIN_ROLES)) {
    return { ok: false, reason: "not_admin" };
  }

  return {
    ok: true,
    admin: {
      adminId: user.id ?? user.email ?? "unknown",
      adminName: user.name,
    },
  };
}