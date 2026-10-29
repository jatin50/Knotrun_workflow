import React, { useEffect } from "react";

export interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  schemaType?: "website" | "software";
}

const DEFAULT_TITLE = "Knotrun Studio — Cloud DAG Workflow Orchestration";
const DEFAULT_DESC = "Visual DAG pipeline editor and execution studio with guest access, pre-architected templates, isolated V8 execution, and BullMQ queue workers.";
const DEFAULT_CANONICAL = "https://studio.knotrun.io/";
const DEFAULT_OG_IMAGE = "https://studio.knotrun.io/og-image.webp";
const GA_MEASUREMENT_ID = (typeof import.meta !== "undefined" && import.meta.env?.VITE_GA_ID) || "G-KNOTRUNSTUDIO";
const GSC_VERIFICATION = (typeof import.meta !== "undefined" && import.meta.env?.VITE_GSC_KEY) || "google-site-verification=KnotrunStudioVerificationToken2026";

export const STUDIO_ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Knotrun Systems Inc.",
  "alternateName": "Knotrun Studio",
  "url": "https://studio.knotrun.io",
  "logo": "https://studio.knotrun.io/og-image.webp",
  "description": "Visual DAG workflow orchestration platform with in-memory execution and pre-architected SaaS templates.",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Technical Support",
    "email": "studio@knotrun.io",
    "url": "https://studio.knotrun.io"
  }
};

export const STUDIO_APPLICATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Knotrun Studio DAG Orchestrator",
  "operatingSystem": "Web, Cloud, Docker, Kubernetes",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "WorkflowManagement",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "Visual DAG canvas for assembling, configuring, and triggering high-throughput automation pipelines with isolated V8 runtimes.",
  "featureList": [
    "Interactive Visual Node Canvas (@xyflow/react)",
    "Instant Recruiter Guest Mode",
    "Pre-loaded Enterprise DAG Templates",
    "Real-Time Telemetry and Execution Logs",
    "Isolated V8 JavaScript Code Execution"
  ]
};

export const SEOHead: React.FC<SEOProps> = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  canonicalUrl = DEFAULT_CANONICAL,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  schemaType = "software"
}) => {
  useEffect(() => {
    document.title = title;

    const setMeta = (nameAttr: "name" | "property", key: string, content: string) => {
      let el = document.querySelector(`meta[${nameAttr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(nameAttr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    setMeta("name", "google-site-verification", GSC_VERIFICATION);

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalUrl);

    // Open Graph
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:site_name", "Knotrun Studio");

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:site", "@knotrun_io");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);

    // Google Analytics
    if (typeof window !== "undefined" && !document.getElementById("ga4-studio-script")) {
      const gaScript = document.createElement("script");
      gaScript.id = "ga4-studio-script";
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(gaScript);

      const gaInit = document.createElement("script");
      gaInit.id = "ga4-studio-init";
      gaInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname });
      `;
      document.head.appendChild(gaInit);
    } else if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("config", GA_MEASUREMENT_ID, { page_path: window.location.pathname });
    }
  }, [title, description, canonicalUrl, ogImage, ogType]);

  const activeSchema = schemaType === "software" ? STUDIO_APPLICATION_SCHEMA : STUDIO_ORGANIZATION_SCHEMA;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STUDIO_ORGANIZATION_SCHEMA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(activeSchema) }}
      />
    </>
  );
};
