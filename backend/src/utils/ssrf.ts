import net from "node:net";

/**
 * Checks whether an IP address belongs to loopback, private RFC1918,
 * link-local (cloud metadata 169.254.169.254), or reserved ranges.
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4) return true;

    const [a, b] = parts;
    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private RFC 1918)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private RFC 1918)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private RFC 1918)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-Local / AWS/GCP/Azure Cloud Metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // IPv6 Loopback
    if (normalized === "::1" || normalized === "::") return true;
    // IPv6 Link-Local (fe80::/10)
    if (
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    ) {
      return true;
    }
    // IPv6 Unique Local (fc00::/7)
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
      return true;
    }
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (normalized.startsWith("::ffff:")) {
      return isPrivateIp(normalized.slice(7));
    }
  }

  return false;
}

/**
 * Validates outbound request URLs against SSRF (Server-Side Request Forgery).
 * Blocks non-HTTP protocols, private IP ranges, loopbacks, and cloud metadata endpoints.
 */
export function validateUrl(rawUrl: string, allowPrivate = false): URL {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Invalid URL provided");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  // 1. Strict protocol verification
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Forbidden URL protocol '${parsed.protocol}'. Only http: and https: are allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Block local / internal hostnames
  if (
    hostname === "localhost" ||
    hostname === "metadata.google.internal" ||
    hostname === "instance-data" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    if (!allowPrivate) {
      throw new Error(`Access to internal/loopback host '${hostname}' is blocked by security policy.`);
    }
  }

  // 3. Block private / metadata IP addresses
  if (net.isIP(hostname)) {
    if (!allowPrivate && isPrivateIp(hostname)) {
      throw new Error(`Access to private/metadata IP address '${hostname}' is blocked by security policy.`);
    }
  }

  return parsed;
}
