# MemoryNode portal

This Vite application is the public landing page for MemoryNode. It presents the local-first product and includes a browser-only simulator of the governed-memory lifecycle.

## Local development

```bash
npm install
npm run dev
```

Run `npm run build` before publishing the static portal.

The portal is a presentation surface, not the packaged local governance console. The `memorynode` runtime includes that console, the FastAPI backend, SDK, CLI, stdio MCP, and loopback-only bearer-token-protected HTTP MCP. Check the installed package with `memorynode version` when release availability matters.

MemoryNode is licensed under the [MIT License](../LICENSE).
