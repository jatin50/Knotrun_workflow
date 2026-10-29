import React from "react";
import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = "" }) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Studio Home",
        "item": "https://studio.knotrun.io/dashboard"
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": item.label,
        ...(item.href ? { "item": `https://studio.knotrun.io${item.href}` } : {})
      }))
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <nav aria-label="Breadcrumb" className={`flex items-center text-xs font-mono text-slate-400 ${className}`}>
        <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          <li className="inline-flex items-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition"
              title="Workspaces Dashboard"
            >
              <span>Workspaces</span>
            </Link>
          </li>

          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li key={idx} className="inline-flex items-center gap-1.5 sm:gap-2">
                <span className="text-slate-600">/</span>
                {item.href && !isLast ? (
                  <Link
                    to={item.href}
                    className="text-slate-400 hover:text-white transition"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-slate-200 font-medium" aria-current={isLast ? "page" : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};
