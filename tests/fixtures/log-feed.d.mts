export const fixture: { served: string[]; scopes: string[]; entries: any[]; live: any[] };
export const FEED_URL: string;
export function answer(href: string): { status: number; headers: Record<string, string>; body: string };
