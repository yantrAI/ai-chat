declare module "needle" {
  interface NeedleResponse {
    statusCode: number;
    statusMessage?: string;
    body: string | Buffer | any;
    headers: Record<string, string>;
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

  type HttpMethod = "get" | "head" | "post" | "put" | "patch" | "delete";

  function needle(
    method: HttpMethod,
    url: string,
    options?: NeedleOptions
  ): Promise<NeedleResponse>;

  export default needle;
}
