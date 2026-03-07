import type { KeyValue, RequestBody, AuthConfig } from "./api";

export function buildCurlCommand(
  method: string,
  url: string,
  headers: KeyValue[],
  body: RequestBody,
  auth: AuthConfig
): string {
  // Note: url already includes query params (synced bidirectionally with params array)
  let cmd = `curl -X ${method}`;
  cmd += ` '${url}'`;
  for (const h of headers) {
    if (h.enabled && h.key) {
      cmd += ` \\\n  -H '${h.key}: ${h.value}'`;
    }
  }
  if (body.type === "json") {
    cmd += ` \\\n  -H 'Content-Type: application/json'`;
    cmd += ` \\\n  -d '${body.data.content}'`;
  } else if (body.type === "raw") {
    cmd += ` \\\n  -H 'Content-Type: ${body.data.content_type}'`;
    cmd += ` \\\n  -d '${body.data.content}'`;
  } else if (body.type === "form_urlencoded") {
    const params = body.data.params.filter(p => p.enabled && p.key);
    if (params.length) {
      const encoded = params.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join("&");
      cmd += ` \\\n  -d '${encoded}'`;
    }
  }
  if (auth.type === "bearer") {
    cmd += ` \\\n  -H 'Authorization: Bearer ${auth.config.token}'`;
  } else if (auth.type === "basic") {
    cmd += ` \\\n  -u '${auth.config.username}:${auth.config.password}'`;
  } else if (auth.type === "api_key") {
    if (auth.config.add_to === "header") {
      cmd += ` \\\n  -H '${auth.config.key}: ${auth.config.value}'`;
    }
  }
  return cmd;
}
