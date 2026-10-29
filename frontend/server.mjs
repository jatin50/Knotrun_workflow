import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5173;

const ROUTE_METADATA = {
  "/": {
    title: "Workspaces | Knotrun Studio — Cloud DAG Orchestrator",
    description: "Manage in-memory execution workspaces, enterprise DAG pipelines, and real-time execution telemetry in Knotrun Studio.",
    canonical: "https://studio.knotrun.io/dashboard",
    status: 200,
  },
  "/dashboard": {
    title: "Workspaces | Knotrun Studio — Cloud DAG Orchestrator",
    description: "Manage in-memory execution workspaces, enterprise DAG pipelines, and real-time execution telemetry in Knotrun Studio.",
    canonical: "https://studio.knotrun.io/dashboard",
    status: 200,
  },
  "/login": {
    title: "Sign In | Knotrun Studio",
    description: "Sign in to your Knotrun Studio account to access saved workflows and manage encrypted credentials.",
    canonical: "https://studio.knotrun.io/login",
    status: 200,
  },
  "/register": {
    title: "Create Account | Knotrun Studio",
    description: "Create your Knotrun Studio account to orchestrate high-performance DAG workflows and manage custom integrations.",
    canonical: "https://studio.knotrun.io/register",
    status: 200,
  },
  "/privacy": {
    title: "Privacy Policy | Knotrun Studio — Cloud DAG Orchestrator",
    description: "Comprehensive privacy policies for Knotrun Studio: guest sessions, AES-256 credential encryption, isolated V8 execution, and zero-persistence DAG runtimes.",
    canonical: "https://studio.knotrun.io/privacy",
    status: 200,
  },
};

const DEFAULT_404_META = {
  title: "404 — Page Not Found | Knotrun Studio",
  description: "The requested workflow, workspace, or studio route does not exist in the Knotrun DAG pipeline registry.",
  canonical: "https://studio.knotrun.io/404",
  status: 404,
};

// 301 Permanent Redirect Maps
const REDIRECTS_301 = {
  "/home": "/dashboard",
  "/app": "/dashboard",
  "/workspaces": "/dashboard",
  "/privacy-policy": "/privacy",
  "/privacy.html": "/privacy",
  "/3d": "http://localhost:3000",
  "/landing": "http://localhost:3000",
};

export async function createServer() {
  const app = express();

  // 1. 301 REDIRECTS MIDDLEWARE
  app.use((req, res, next) => {
    const rawUrl = req.url.split("?")[0];

    // Trailing slash redirect (except root)
    if (rawUrl.length > 1 && rawUrl.endsWith("/")) {
      const cleanPath = rawUrl.slice(0, -1) + (req.url.includes("?") ? `?${req.url.split("?")[1]}` : "");
      return res.redirect(301, cleanPath);
    }

    if (REDIRECTS_301[rawUrl]) {
      const target = REDIRECTS_301[rawUrl];
      return res.redirect(301, target);
    }

    next();
  });

  // 2. STATIC ASSETS
  app.use(express.static(path.resolve(__dirname, "public"), { maxAge: "1d", redirect: false }));
  if (fs.existsSync(path.resolve(__dirname, "dist/client"))) {
    app.use(express.static(path.resolve(__dirname, "dist/client"), { index: false, maxAge: "7d", redirect: false }));
  }

  // 3. SERVER-SIDE RENDERING (SSR) HANDLER
  app.use(async (req, res) => {
    const url = req.originalUrl.split("?")[0];
    const meta = ROUTE_METADATA[url] || DEFAULT_404_META;

    try {
      let templatePath = path.resolve(__dirname, "dist/client/index.html");
      if (!fs.existsSync(templatePath)) {
        templatePath = path.resolve(__dirname, "index.html");
      }
      let template = fs.readFileSync(templatePath, "utf-8");

      let render;
      const ssrBundlePath = path.resolve(__dirname, "dist/server/entry-server.js");
      if (fs.existsSync(ssrBundlePath)) {
        const mod = await import(`file://${ssrBundlePath}`);
        render = mod.render;
      } else {
        render = (u) => ({ html: `<div id="ssr-fallback">Studio SSR path: ${u}</div>` });
      }

      const { html: appHtml } = render(url);

      const headTags = `
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="google-site-verification" content="google-site-verification=KnotrunStudioVerificationToken2026" />
    <link rel="canonical" href="${meta.canonical}" />

    <!-- Open Graph Protocol -->
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:url" content="${meta.canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://studio.knotrun.io/og-image.webp" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/webp" />
    <meta property="og:site_name" content="Knotrun Studio" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@knotrun_io" />
    <meta name="twitter:title" content="${meta.title}" />
    <meta name="twitter:description" content="${meta.description}" />
    <meta name="twitter:image" content="https://studio.knotrun.io/og-image.webp" />

    <!-- Organization Schema JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Knotrun Systems Inc.",
      "url": "https://studio.knotrun.io",
      "logo": "https://studio.knotrun.io/og-image.webp",
      "description": "Visual DAG workflow orchestration platform with in-memory execution and pre-architected SaaS templates."
    }
    </script>

    <!-- Google Analytics (GA4) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-KNOTRUNSTUDIO"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-KNOTRUNSTUDIO', { page_path: '${url}' });
    </script>
      `;

      let finalHtml = template
        .replace(/<title>[\s\S]*?<\/title>/, "")
        .replace(/<meta\s+name="description"[\s\S]*?>/i, "")
        .replace("</head>", `${headTags}\n</head>`)
        .replace(`<div id="root"></div>`, `<div id="root">${appHtml}</div>`);

      res.status(meta.status).set({ "Content-Type": "text/html; charset=utf-8" }).send(finalHtml);
    } catch (err) {
      console.error("[Studio SSR Error]", err);
      res.status(500).send("Studio SSR Exception: " + err.message);
    }
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  createServer().then((app) => {
    app.listen(PORT, () => {
      console.log(`🚀 Knotrun Studio SSR Server listening on http://localhost:${PORT}`);
    });
  });
}
