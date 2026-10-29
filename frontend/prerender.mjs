import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROUTES = [
  {
    path: "/",
    outFile: "dist/client/index.html",
    title: "Workspaces | Knotrun Studio — Cloud DAG Orchestrator",
    description: "Manage in-memory execution workspaces, enterprise DAG pipelines, and real-time execution telemetry in Knotrun Studio.",
    canonical: "https://studio.knotrun.io/dashboard",
  },
  {
    path: "/dashboard",
    outFile: "dist/client/dashboard/index.html",
    title: "Workspaces | Knotrun Studio — Cloud DAG Orchestrator",
    description: "Manage in-memory execution workspaces, enterprise DAG pipelines, and real-time execution telemetry in Knotrun Studio.",
    canonical: "https://studio.knotrun.io/dashboard",
  },
  {
    path: "/login",
    outFile: "dist/client/login/index.html",
    title: "Sign In | Knotrun Studio",
    description: "Sign in to your Knotrun Studio account to access saved workflows and manage encrypted credentials.",
    canonical: "https://studio.knotrun.io/login",
  },
  {
    path: "/register",
    outFile: "dist/client/register/index.html",
    title: "Create Account | Knotrun Studio",
    description: "Create your Knotrun Studio account to orchestrate high-performance DAG workflows and manage custom integrations.",
    canonical: "https://studio.knotrun.io/register",
  },
  {
    path: "/privacy",
    outFile: "dist/client/privacy/index.html",
    title: "Privacy Policy | Knotrun Studio — Cloud DAG Orchestrator",
    description: "Comprehensive privacy policies for Knotrun Studio: guest sessions, AES-256 credential encryption, isolated V8 execution, and zero-persistence DAG runtimes.",
    canonical: "https://studio.knotrun.io/privacy",
  },
  {
    path: "/404",
    outFile: "dist/client/404.html",
    title: "404 — Page Not Found | Knotrun Studio",
    description: "The requested workflow, workspace, or studio route does not exist in the Knotrun DAG pipeline registry.",
    canonical: "https://studio.knotrun.io/404",
  },
];

async function prerender() {
  console.log("⚡ Starting Studio static pre-rendering (SSG)...");

  const templatePath = path.resolve(__dirname, "dist/client/index.html");
  if (!fs.existsSync(templatePath)) {
    console.error("❌ dist/client/index.html not found. Run client build first.");
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, "utf-8");

  const ssrBundlePath = path.resolve(__dirname, "dist/server/entry-server.js");
  if (!fs.existsSync(ssrBundlePath)) {
    console.error("❌ dist/server/entry-server.js not found. Run ssr build first.");
    process.exit(1);
  }
  const { render } = await import(`file://${ssrBundlePath}`);

  for (const route of ROUTES) {
    const { html: appHtml } = render(route.path);

    const headTags = `
    <title>${route.title}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
    <link rel="alternate icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="192x192" href="/logo-192.png" />
    <meta name="description" content="${route.description}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="google-site-verification" content="google-site-verification=KnotrunStudioVerificationToken2026" />
    <link rel="canonical" href="${route.canonical}" />

    <!-- Open Graph Protocol -->
    <meta property="og:title" content="${route.title}" />
    <meta property="og:description" content="${route.description}" />
    <meta property="og:url" content="${route.canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://studio.knotrun.io/og-image.webp" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/webp" />
    <meta property="og:site_name" content="Knotrun Studio" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@knotrun_io" />
    <meta name="twitter:title" content="${route.title}" />
    <meta name="twitter:description" content="${route.description}" />
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
    `;

    const finalHtml = template
      .replace(/<title>[\s\S]*?<\/title>/, "")
      .replace(/<meta\s+name="description"[\s\S]*?>/i, "")
      .replace("</head>", `${headTags}\n</head>`)
      .replace(`<div id="root"></div>`, `<div id="root">${appHtml}</div>`);

    const targetFile = path.resolve(__dirname, route.outFile);
    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetFile, finalHtml, "utf-8");
    console.log(`✓ Pre-rendered [${route.path}] -> ${route.outFile} (${(finalHtml.length / 1024).toFixed(1)} KB)`);
  }

  console.log("✅ Studio static pre-rendering completed successfully.");
}

prerender().catch(console.error);
