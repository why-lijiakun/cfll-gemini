import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

async function handler(req: Request): Promise<Response> {
  const incomingUrl = new URL(req.url);
  if (incomingUrl.pathname === "/") {
    return new Response(
      "这个地址仅用于访问Gemini API使用！",
      {
        status: 200, // OK
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }

  // 1. Extract the target path from the request URL
  //    - incomingUrl.pathname will be like "/v1/models" or similar
  //    - slice(1) removes the leading "/"
  //    - decodeURIComponent handles URL-encoded characters (e.g., %2F)
  const targetPath = decodeURIComponent(incomingUrl.pathname.slice(1));

  // 2. Construct the full Gemini API URL
  const baseUrl ="https://lijiakun-gemini.deno.dev";
  const targetUrlString = `${baseUrl}${targetPath}${incomingUrl.search}`;

  // 3. Validate that the constructed URL is valid
  if (!targetUrlString.startsWith(baseUrl)) {
    return new Response("Invalid target URL. Must target Gemini API.", {
      status: 400, // Bad Request
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  console.log(`Proxying request to: ${targetUrlString}`); // Log for debugging

  try {
    // 4. Forward the request to the Gemini API
    //    - Pass through the original method, headers, and body
    const response = await fetch(targetUrlString, {
      headers: req.headers, // Forward original headers
      method: req.method,   // Forward original method
      body: req.body,       // Forward original body (supports streaming)
      redirect: 'manual',   // Do not auto-follow redirects, let client handle 3xx responses
    });

    // 5. Set up CORS headers for the response
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*"); // Allow any origin
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); // Allowed methods
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, *"); // Allowed headers

    // 6. Handle OPTIONS preflight requests for CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204, // No Content
        headers: responseHeaders,
      });
    }

    // 7. Return the response from the Gemini API
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    // 8. Handle errors during the fetch (e.g., network issues, unreachable server)
    console.error(`Error fetching ${targetUrlString}:`, error);
    return new Response(`Failed to proxy request to ${targetUrlString}: ${error.message}`, {
      status: 502, // Bad Gateway
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

console.log("This address is used to help astrbot connect to the Gemini API faster");
// Start the server on port 8000 (local) or Deno Deploy's assigned port
serve(handler);
