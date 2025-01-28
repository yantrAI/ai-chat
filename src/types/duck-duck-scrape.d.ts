declare module "duck-duck-scrape" {
  interface SearchResult {
    title: string;
    description: string;
    rawDescription: string;
    hostname: string;
    icon: string;
    url: string;
    bang?: {
      prefix: string;
      title: string;
      domain: string;
    };
  }

  interface ImageResult {
    title: string;
    image: string;
    thumbnail: string;
    url: string;
    height: number;
    width: number;
    source: string;
  }

  interface NewsResult {
    date: string;
    excerpt: string;
    image?: string;
    relativeTime: string;
    syndicate: string;
    title: string;
    url: string;
    isOld: boolean;
  }

  interface VideoResult {
    url: string;
    title: string;
    description: string;
    image: string;
    duration: string;
    publishedOn: string;
    published: string;
    publisher: string;
    viewCount?: number;
  }

  interface RelatedResult {
    text: string;
    raw: string;
  }

  interface SearchResponse {
    noResults: boolean;
    vqd: string;
    results: SearchResult[];
    images?: ImageResult[];
    news?: NewsResult[];
    videos?: VideoResult[];
    related?: RelatedResult[];
  }

  interface NeedleOptions {
    headers?: Record<string, string>;
    timeout?: number;
    follow_max?: number;
    response_timeout?: number;
    read_timeout?: number;
    rejectUnauthorized?: boolean;
    parse_response?: boolean;
    compressed?: boolean;
  }

  type SafeSearchType = "OFF" | "MODERATE" | "STRICT";

  export function search(
    query: string,
    options?: {
      safeSearch?: SafeSearchType;
      time?: string;
      locale?: string;
      region?: string;
      offset?: number;
      marketRegion?: string;
      vqd?: string;
    },
    needleOptions?: NeedleOptions
  ): Promise<SearchResponse>;
}
