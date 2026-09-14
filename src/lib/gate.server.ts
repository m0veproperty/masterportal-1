import { useSession } from "@tanstack/react-start/server";

const PORTAL_PIN = "998864";
const MAX_ATTEMPTS = 3;

type GateSession = {
  unlocked?: boolean;
  unlockedAt?: number;
  failedAttempts?: number;
  lockedOut?: boolean;
};

function sessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET is not set");
  return {
    password,
    name: "portal-gate",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

export async function getGateSession() {
  return useSession<GateSession>(sessionConfig());
}

export async function requireUnlocked() {
  const session = await getGateSession();
  if (!session.data.unlocked) {
    throw new Error("Locked");
  }
  return session;
}

export async function unlockGate(pin: string) {
  const session = await getGateSession();
  if (session.data.lockedOut) {
    return { ok: false as const, lockedOut: true, attemptsLeft: 0 };
  }
  if (pin === PORTAL_PIN) {
    await session.update({ unlocked: true, unlockedAt: Date.now(), failedAttempts: 0, lockedOut: false });
    return { ok: true as const, lockedOut: false, attemptsLeft: MAX_ATTEMPTS };
  }
  const failed = (session.data.failedAttempts ?? 0) + 1;
  const lockedOut = failed >= MAX_ATTEMPTS;
  await session.update({ failedAttempts: failed, lockedOut });
  return { ok: false as const, lockedOut, attemptsLeft: Math.max(0, MAX_ATTEMPTS - failed) };
}

export async function lockGate() {
  const session = await getGateSession();
  await session.update({ unlocked: false });
  return { ok: true as const };
}

export async function getUnlockedStatus() {
  const session = await getGateSession();
  return {
    unlocked: !!session.data.unlocked,
    lockedOut: !!session.data.lockedOut,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - (session.data.failedAttempts ?? 0)),
  };
}
