import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { setAuthCookies, clearAuthCookies } from "../lib/cookies";
import { generateUniqueWorkspaceSlug } from "../utils/slug";

// Standard RFC-compliant email pattern check
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Precomputed bcrypt cost-10 hash used to ensure constant-time response
// when a user email is not found, defeating timing-based account enumeration.
const DUMMY_BCRYPT_HASH = bcrypt.hashSync("timing-defense-static-salt-pad", 10);

export async function register(req: Request, res: Response) {
    const { name, email, password } = req.body ?? {};

    if (!name || !email || !password) {
        return res.status(400).json({ error: "name, email, and password are required" });
    }

    if (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
        return res.status(400).json({ error: "name must be between 1 and 100 characters" });
    }

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!cleanEmail || cleanEmail.length > 255 || !EMAIL_REGEX.test(cleanEmail)) {
        return res.status(400).json({ error: "A valid email address is required" });
    }

    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
        return res.status(400).json({ error: "password must be between 8 and 128 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { name: name.trim(), email: cleanEmail, password: passwordHash },
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
        user: { id: user.id, name: user.name, email: user.email },
    });
}

export async function login(req: Request, res: Response) {
    const { email, password } = req.body ?? {};

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "email and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const candidatePassword = password.slice(0, 128);

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Always run bcrypt.compare even if user does not exist so timing remains identical
    const passwordHashToCompare = user ? user.password : DUMMY_BCRYPT_HASH;
    const passwordMatches = await bcrypt.compare(candidatePassword, passwordHashToCompare);

    if (!user || !passwordMatches) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
        user: { id: user.id, name: user.name, email: user.email },
    });
}

export async function logout(_req: Request, res: Response) {
    clearAuthCookies(res);
    return res.status(204).send();
}

export async function me(req: Request, res: Response) {
    // req.user is attached by the authenticate middleware — see auth.middleware.ts
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
}

export async function refresh(req: Request, res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) {
        return res.status(401).json({ error: "No refresh token provided" });
    }

    try {
        const payload = verifyRefreshToken(token);
        const accessToken = signAccessToken({ userId: payload.userId, email: payload.email });

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60 * 1000,
            path: "/",
        });

        return res.json({ ok: true });
    } catch {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
}

export async function guestLogin(_req: Request, res: Response) {
    try {
        const GUEST_EMAIL = "recruiter.guest@aethelflow.internal";
        let user = await prisma.user.findUnique({ where: { email: GUEST_EMAIL } });

        if (!user) {
            const passwordHash = await bcrypt.hash("AethelFlow-Guest-Recruiter-2026!", 10);
            user = await prisma.user.create({
                data: {
                    name: "Guest Recruiter",
                    email: GUEST_EMAIL,
                    password: passwordHash,
                },
            });
        }

        // Ensure guest has a demo workspace
        let workspace = await prisma.workspace.findFirst({
            where: { ownerId: user.id },
            include: { workflows: true },
        });

        if (!workspace) {
            const slug = await generateUniqueWorkspaceSlug("Recruiter Demo Workspace");
            workspace = await prisma.workspace.create({
                data: {
                    name: "Recruiter Demo Workspace",
                    slug,
                    ownerId: user.id,
                },
                include: { workflows: true },
            });
        }

        // If workspace has no workflows yet, seed starter workflow templates so the recruiter sees immediate results!
        if (workspace.workflows.length === 0) {
            // 1. Website Uptime & Cloud Instance Keep-Alive
            const wf1 = await prisma.workflow.create({
                data: {
                    workspaceId: workspace.id,
                    name: "Website Uptime & Cloud Instance Keep-Alive",
                    description: "Periodically pings free-tier cloud deployments to prevent cold sleep with SSRF protection.",
                    active: true,
                },
            });
            await prisma.node.createMany({
                data: [
                    {
                        id: `node_${Date.now()}_1`,
                        workflowId: wf1.id,
                        type: "trigger.schedule",
                        positionX: 80,
                        positionY: 200,
                        configuration: { cron: "*/10 * * * *" },
                    },
                    {
                        id: `node_${Date.now()}_2`,
                        workflowId: wf1.id,
                        type: "network.ping",
                        positionX: 380,
                        positionY: 200,
                        configuration: { url: "https://httpbin.org/status/200", method: "GET" },
                    },
                    {
                        id: `node_${Date.now()}_3`,
                        workflowId: wf1.id,
                        type: "logic.if",
                        positionX: 680,
                        positionY: 200,
                        configuration: { condition: "input.alive === false || input.latencyMs > 2500" },
                    },
                    {
                        id: `node_${Date.now()}_4`,
                        workflowId: wf1.id,
                        type: "communication.email",
                        positionX: 980,
                        positionY: 200,
                        configuration: { to: "recruiter@example.com", subject: "🚨 Latency Alert" },
                    },
                ],
            });

            // 2. AI Customer Support Auto-Responder
            const wf2 = await prisma.workflow.create({
                data: {
                    workspaceId: workspace.id,
                    name: "AI Customer Support Auto-Responder",
                    description: "Captures customer support webhooks, classifies ticket priority with Gemini AI, and routes escalations.",
                    active: false,
                },
            });
            await prisma.node.createMany({
                data: [
                    {
                        id: `node_${Date.now()}_5`,
                        workflowId: wf2.id,
                        type: "trigger.webhook",
                        positionX: 80,
                        positionY: 200,
                        configuration: { path: "/webhook/support-ticket" },
                    },
                    {
                        id: `node_${Date.now()}_6`,
                        workflowId: wf2.id,
                        type: "ai.prompt",
                        positionX: 380,
                        positionY: 200,
                        configuration: { prompt: "Classify incoming support request urgency into P1, P2, P3." },
                    },
                    {
                        id: `node_${Date.now()}_7`,
                        workflowId: wf2.id,
                        type: "communication.discord",
                        positionX: 720,
                        positionY: 200,
                        configuration: { channel: "#urgent-support" },
                    },
                ],
            });
        }

        const accessToken = signAccessToken({ userId: user.id, email: user.email });
        const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
        setAuthCookies(res, accessToken, refreshToken);

        return res.json({
            user: { id: user.id, name: user.name, email: user.email },
            workspaceId: workspace.id,
        });
    } catch (err) {
        console.error("[Auth] Guest login error:", err);
        return res.status(500).json({ error: "Failed to authenticate as guest" });
    }
}
