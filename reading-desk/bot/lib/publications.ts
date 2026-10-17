/** Starting publication map. Homepages are real. Article URLs live on the shelf. */
export type Publication = {
  id: string;
  name: string;
  url: string;
  hosts: string[];
};

export const publications: Publication[] = [
  { id: "stripe", name: "Stripe blog", url: "https://stripe.com/blog", hosts: ["stripe.com"] },
  { id: "ux-collective", name: "UX Collective", url: "https://uxdesign.cc", hosts: ["uxdesign.cc"] },
  { id: "ux-planet", name: "UX Planet", url: "https://uxplanet.org", hosts: ["uxplanet.org"] },
  {
    id: "looking-glass",
    name: "Julie Zhuo, The Looking Glass",
    url: "https://medium.com/the-year-of-the-looking-glass",
    hosts: ["medium.com"],
  },
  {
    id: "nngroup",
    name: "Nielsen Norman Group",
    url: "https://www.nngroup.com/articles/",
    hosts: ["nngroup.com"],
  },
  {
    id: "smashing",
    name: "Smashing Magazine",
    url: "https://www.smashingmagazine.com",
    hosts: ["smashingmagazine.com"],
  },
  { id: "alistapart", name: "A List Apart", url: "https://alistapart.com", hosts: ["alistapart.com"] },
  { id: "intercom", name: "Intercom blog", url: "https://www.intercom.com/blog", hosts: ["intercom.com"] },
  { id: "figma", name: "Figma blog", url: "https://www.figma.com/blog/", hosts: ["figma.com"] },
  { id: "linear", name: "Linear blog", url: "https://linear.app/blog", hosts: ["linear.app"] },
  { id: "bradfrost", name: "Brad Frost", url: "https://bradfrost.com/blog/", hosts: ["bradfrost.com"] },
  { id: "shape-up", name: "Shape Up", url: "https://basecamp.com/shapeup", hosts: ["basecamp.com"] },
];

export function publicationById(id: string): Publication | undefined {
  return publications.find((publication) => publication.id === id);
}

export function bareHost(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

export function hostFromUrl(url: string): string {
  const host = bareHost(url);
  if (host === null) throw new Error(`Not a URL: ${url}`);
  return host;
}

/** True when the URL host equals an allowed host or is a subdomain of one. */
export function urlAllowed(url: string, hosts: readonly string[]): boolean {
  const host = bareHost(url);
  if (host === null) return false;
  return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
