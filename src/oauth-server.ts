export function startOAuthServer(port: number = 8080): Promise<string> {
  return new Promise(resolve => {
    const server = Bun.serve({
      port,
      async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === '/callback' && url.searchParams.has('code')) {
          const code = url.searchParams.get('code')!;
          server.stop();
          resolve(code);
          const htmlContent = await Bun.file('src/oauth-callback.html').text();
          return new Response(htmlContent, {
            headers: { 'Content-Type': 'text/html' },
          });
        }
        return new Response('Not found', { status: 404 });
      },
    });
    console.log(
      `OAuth callback server listening on http://localhost:${port}/callback`
    );
  });
}
