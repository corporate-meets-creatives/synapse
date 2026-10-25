/** Social/listing sites: public pages only, one page, never crawled, never logged in. */
const SOCIAL_HOSTS = ["facebook.com", "fb.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "tiktok.com", "yelp.com", "nextdoor.com", "threads.net", "youtube.com"];

export function isSocialUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    return SOCIAL_HOSTS.some((s) => h === s || h.endsWith("." + s));
  } catch {
    return false;
  }
}

const LOGIN_WALL = /(log in|login|sign in|sign up|create new account|join facebook)[^.]{0,60}(to (continue|see|view|connect)|or sign up)|you must (log|sign) in|enable javascript|checking your browser/i;

/** True when the page we got is a login wall or too thin to be the business's real page. */
export function looksBlocked(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length < 150 || LOGIN_WALL.test(t.slice(0, 1500));
}
