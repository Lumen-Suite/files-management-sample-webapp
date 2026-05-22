# Architecture

<p align="center">
  <img src="images/lumen-logo.svg" alt="Lumen" width="100" />
</p>

This page explains how the sample app is put together and why each piece exists. You don't need to read this to use the app — but if you're curious how it works, or you want to extend it, this is the tour.

---

## The picture

```
+--------------------+       +----------------------+       +-----------------------+
|  Browser (5173)    |  -->  |  Express BFF (8787)  |  -->  |  Lumen Files API      |
|  Vite + React JSX  |       |  thin proxy          |       |  (Azure Container App)|
|  Tailwind 4        |       |  + helmet + CORS     |       |                       |
|                    |       |  + rate limit        |       |  13 endpoints         |
|  no auth, no token |       |  + Zod query + body  |       |  (Org persona)        |
|                    |       |  injects:            |       |                       |
|                    |       |   lumen-api-key      |       |                       |
|                    |       |   lumen-api-secret   |       |                       |
+--------------------+       +----------------------+       +-----------------------+
        |                              ^
        |                              |
        |                              +----- single root .env -----+
        |                                    (server vars + VITE_*)
        |
        |  upload step 2: PUT file bytes directly with single-use URL
        v
+-----------------------+
|  Azure Blob Storage   |
|  (Lumen platform)     |
|  needs CORS for :5173 |
+-----------------------+
```

There are three layers in the normal request path, left to right:

1. **The browser part** (the React app at `http://localhost:5173`). This is what you see and click on.
2. **The local Express server** at `http://localhost:8787`. A small program running on your computer that acts as a middleman.
3. **The Lumen Files API** out on the internet (hosted in Azure). The real source of file, folder, and archive data.

When you upload a file, a fourth box enters the picture: **Azure Blob Storage**. The browser writes the file's bytes there directly, bypassing the Express server. The "two-step upload" section below explains why.

Both halves of the app read from a single `.env` settings file at the project root.

> **Note:** **BFF** stands for "Backend For Frontend" — a small backend server dedicated to one specific frontend. It's the polite term for "tiny middleman server".

---

## Why a backend at all?

The short answer: **to keep your API secret hidden.**

Here's the long version. Vite and React projects bundle their settings (anything starting with `VITE_`) directly into the JavaScript file that gets sent to every browser. That means if we put `LUMEN_API_SECRET=...` into a `VITE_` variable, anyone visiting the site could open their browser's developer tools (F12) and copy your secret right out of the JavaScript code.

The Express server side-steps that completely. It stays on **your** machine (or, if you deploy it later, on your hosting provider's server). It holds the secret. When the React app asks for the files in a folder, it asks the Express server. The Express server then asks Lumen — with the secret attached. Lumen replies. The Express server hands the reply back to the React app.

The browser never sees the secret. Even if someone inspects every byte of the JavaScript that runs in your browser, the secret isn't there.

---

## The two-step upload (the headline demo)

This is the part of the sample most worth understanding. When you drop a file onto the upload zone, here is what actually happens, in plain English:

1. **The browser reads the file you dropped and calculates a fingerprint.** The fingerprint is called an **MD5 checksum** — a short code (16 bytes, written as a 24-character base64 string) that's basically a summary of the file's contents. If even one byte of the file changes, the fingerprint changes completely. This proves the file wasn't tampered with on the way to storage.

2. **The browser asks the Express server "I want to upload a file."** It sends just the small bits of text describing the file: its name, its file extension, and the fingerprint from step 1. The actual file contents are **not** sent yet.

3. **The Express server forwards that question to Lumen, and Lumen replies with a pre-signed URL.** A pre-signed URL is a single-use upload address that only works for this exact file, this exact size, this exact fingerprint, for the next few minutes. Think of it like a one-time-use coat-check ticket. Lumen calls this a **SAS URL** (Shared Access Signature).

4. **The browser uploads the actual file bytes directly to Azure storage** using that URL. The Express server is not involved in this step at all. The browser uses a standard `PUT` request and includes two important headers: `x-ms-blob-type: BlockBlob` (tells Azure what kind of blob to create) and `x-ms-blob-content-md5: <fingerprint>` (so Azure can verify it received exactly the right bytes).

5. **Azure verifies the fingerprint matches** the bytes it received. If they match, the upload is accepted. If they don't, Azure rejects it — proof that nothing got corrupted in transit. Lumen then kicks off a follow-up workflow (such as minting an NFT for the file, depending on your organization's policies), and gives back a `WorkflowID` you can use to track that work.

**Why this matters.** The file never goes through the Express server. That keeps the server small (its body-size limit is just 32 KB — enough for metadata, not enough for files) and means upload speed isn't limited by your local machine's CPU. A 100 MB file goes from your disk straight to the cloud, not through a Node.js process.

> **Heads up:** Because the file goes browser-to-Azure directly, **Azure storage's own CORS settings** matter — separate from the Express server's CORS. The Lumen platform needs to allow `http://localhost:5173` for `PUT` on the Files storage account. If you see a CORS error in the browser console mentioning `blob.core.windows.net`, that's the cause. See [SETUP.md](SETUP.md#troubleshooting-matrix).

---

## Folder map

```
/                          single root .env, package.json with workspaces
├── server/                Express BFF
│   ├── package.json
│   └── src/
│       ├── index.js              Express bootstrap, security middleware, route mounting
│       ├── lumenClient.js        axios instance with the api-key+secret interceptor
│       ├── middleware/
│       │   ├── envCheck.js       fails fast if .env is missing or unfilled
│       │   ├── errorHandler.js   converts upstream Lumen errors into { ok:false, status, error }
│       │   └── validateQuery.js  Zod schemas for query strings and request bodies
│       └── routes/
│           ├── directory.routes.js  /directoryItems, /directoryItems/logs, /archivedFiles
│           ├── file.routes.js       7 file routes (get, single-upload, batch-upload, edit, archive, restore, delete)
│           └── folder.routes.js     /folder, /folder/create
└── web/                   Vite + React
    ├── vite.config.js     envDir set to '..' so it reads root .env
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx                React entry
        ├── App.jsx                 router
        ├── index.css               Tailwind + Lumen design tokens
        ├── api/client.js           axios pointed at the local BFF
        ├── lib/
        │   ├── md5.js              file -> base64 MD5 helper (uses spark-md5)
        │   └── path.js             join, parent, breadcrumb helpers
        ├── components/             Header, Layout, Spinner, ErrorBanner, EmptyState,
        │                           Pagination, SearchSortBar, Breadcrumbs, DirectoryGrid,
        │                           ItemCard, UploadDropzone, CreateFolderModal,
        │                           ItemDetailModal, EditMetadataModal, ConfirmDialog,
        │                           ActivityLogsModal
        └── pages/                  Browse, ArchivedFiles, NotFound
```

In plain English: there are two main folders. `server/` holds the middleman server. `web/` holds the website (React) part. The `.env` file at the very top is shared by both.

---

## The 13 routes

The Express server exposes thirteen routes grouped into three families: **Browse** (listing directory contents, logs, and archives), **Files** (read, upload, edit, archive, restore, delete), and **Folders** (read, create). Plus a `/health` route for sanity-checking that the server is alive.

The full reference, including request shapes and `curl` examples, is in [API_REFERENCE.md](API_REFERENCE.md).

---

## Security choices

Each row below is a possible attack or mistake, and what we did to block it.

| Concern | Mitigation |
|---|---|
| Secret leakage | The API key and secret live in `.env` (which is in `.gitignore`, so it never goes to Git) and only on the server. The browser-side `VITE_*` variables are intentionally limited to the BFF URL — nothing sensitive. |
| Cross-origin attacks | CORS (Cross-Origin Resource Sharing) is a browser rule limiting which websites can call your server. We use an allowlist driven by `ALLOWED_ORIGIN`. The methods allowed on `/api` are `GET`, `POST`, `PATCH`, and `DELETE` — the four the Files API actually uses. |
| Abuse / runaway scripts | `express-rate-limit` caps `/api/*` at **200 requests per 15 minutes** per IP address. That's higher than the wallets sample because browsing folders and uploading in bursts is normal. If something starts hammering the server, it gets a `429 Too Many Requests` response. |
| Query and body fuzzing | Zod (a validation library) checks both query parameters AND request bodies against allowlists before forwarding to Lumen. Junk values get rejected with a `400 Bad Request` before they leave your machine. |
| File-bytes-through-middleware risk | Express's JSON body parser is capped at **32 KB**. The BFF never receives file bytes — only metadata — so the size limit is intentionally tiny. The file goes browser-to-Azure directly. |
| Error leakage | Errors from Lumen are normalized into a clean `{ ok, status, error }` shape. Stack traces (which can reveal internal details) never reach the browser. |

> **Heads up:** These mitigations are good for a local sample and small deployments. For real production traffic, see "Deploying this" below.

---

## Why we don't use the real Lumen design system here

Lumen has a full design system package called `@bayanichain/lumen-design-system`. We deliberately do **not** depend on it in this sample, because that package lives on GitHub Package Registry — meaning every public user would have to set up an `.npmrc` file with an authentication token before `npm install` would work. That would completely break the "anyone can run this in ten minutes" promise of this sample.

Instead, we mirror the four core Lumen design principles directly in plain Tailwind v4:

- **Flat and sharp** — no rounded corners (`border-radius: 0` everywhere, except the loading spinner ring which needs a circle).
- **Monochrome** — black, white, and gray only. The only color exceptions are `#ef4444` for errors and `#22c55e` for success.
- **Typographic** — the Sora font, with tight letter spacing (`tracking: -0.04em`).
- **Minimal** — no shadows, no gradients, 1-pixel solid borders only.

If you're building your own internal app and want to use the real design system, look at how `mvp-baas-org-webapp` wires it up.

---

## What's intentionally NOT here

This sample is deliberately small. We left things out for clarity:

- **No BridgePass or end-user login.** This sample shows the *organization's* view. The organization's API key is the only credential the app needs. There is no concept of "the user who uploaded this file" beyond the org itself.
- **No WorkflowID polling.** After an upload, Lumen returns a `WorkflowID` for the background job that mints an NFT for the file. The sample shows this ID in the success toast for transparency, but doesn't poll its status — that's out of scope.
- **No chunked upload for huge files.** The browser PUTs the whole file in one request. For a real production app handling multi-gigabyte files, you'd want chunked uploads with retry-per-chunk. This sample assumes a soft limit around 100 MB.
- **No database, no auth, no sessions.** The Express server holds zero state. Restart it any time without losing anything.

---

## Deploying this

The local-only flow works as-is. If you want to put this sample on the public internet, here's the short version:

1. **Frontend** — deploy to Vercel or Netlify (both free tiers). Set the environment variable `VITE_BFF_URL` to your backend's public URL.
2. **Backend** — deploy to Render, Railway, or Azure Container Apps. Set `LUMEN_API_KEY`, `LUMEN_API_SECRET`, and `ALLOWED_ORIGIN` (= your frontend's public URL).
3. **CORS update on the BFF** — make sure `ALLOWED_ORIGIN` matches the deployed frontend URL exactly. Update the Helmet CSP `connect-src` allowlist if it's pointing at a new host.
4. **CORS update on the Lumen storage account** — this one is unique to the Files sample. Because the browser uploads file bytes directly to Azure storage, the Lumen platform's storage account CORS must allow your real frontend's domain (not just `http://localhost:5173`) for the `PUT` method. Contact the Lumen team to add it.

> **Tip:** For a true production deployment, you'd also want centralized logging, distributed rate limiting (backed by Redis instead of in-memory), and TLS (HTTPS) at both hops. Those upgrades are out of scope for this sample but are well-trodden paths if you want them.
