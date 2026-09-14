import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUnlockedStatus, lockGate, unlockGate } from "./gate.server";

export const unlockPortal = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ pin: z.string().min(1).max(20) }).parse(d))
  .handler(async ({ data }) => unlockGate(data.pin));

export const lockPortal = createServerFn({ method: "POST" }).handler(async () => lockGate());

export const getGateStatus = createServerFn({ method: "GET" }).handler(async () => getUnlockedStatus());
