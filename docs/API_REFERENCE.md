# API Reference

<p align="center">
  <img src="images/lumen-logo.svg" alt="Lumen" width="100" />
</p>

This page lists the thirteen internet addresses (routes) the local Express server provides. The website part of the app uses them automatically when you click around — **you don't need to call them by hand** unless you're curious, debugging, or building something on top of this sample.

> **Note:** A **route** is a specific URL path the server responds to. For example, `GET /api/directoryItems?path=/` is a route. **GET** means "ask for data". **POST** means "create something new". **PATCH** means "update part of an existing thing". **DELETE** means "remove something".

Every `/api/*` route quietly forwards the request to the real Lumen Files API with your `lumen-api-key` and `lumen-api-secret` headers attached by the server — never by the browser.

**Base URL when running locally:** `http://localhost:8787`

> **Tip:** A **base URL** is the part of the address that goes in front of every route. So `GET /api/directoryItems` actually lives at `http://localhost:8787/api/directoryItems` when you run the app on your own computer.

> **Why `?path=...` everywhere?** Lumen's real API uses hierarchical URLs like `/directoryItems/{the/full/path}`. To avoid Express confusing the slashes in your path with route boundaries, every route in this sample takes the file or folder path as a `?path=` query parameter. The Express server URL-encodes it and tacks it onto the upstream URL.

The routes are grouped into three families: **Browse** (list directory contents, activity logs, archives), **Files** (read, upload, edit, archive, restore, delete), and **Folders** (read, create).

---

## Browse routes

### Route 1 — List items in a directory

#### `GET /api/directoryItems`

Returns a paginated list (split across pages) of folders and files at a given path.

#### Query parameters

| Name | Type | Default | What it does |
|---|---|---|---|
| `path` | string (1 to 1024 chars) | — (required) | The folder path you want to list. Use `/` for the root. Allowed characters: letters, digits, `_`, `-`, `.`, `/`, `%`, `(`, `)`, and spaces. |
| `pageNumber` | integer (1 to 10000) | 1 | Which page of results to return. |
| `pageSize` | integer (1 to 100) | 10 | How many rows per page. |
| `search` | string (up to 200 chars) | — | Full-text search across item names. |
| `sort[0][field]` | string | — | One of: `Name`, `_ts`, `FileExtension`, `CreatedAt`, `UpdatedAt`, `OwnerAddress`. |
| `sort[0][order]` | `asc` or `desc` | — | Sort direction (ascending or descending). |

#### Example

You can test the route by hand with `curl` (a command-line tool that fetches URLs):

```
curl "http://localhost:8787/api/directoryItems?path=/&pageNumber=1&pageSize=5"
```

> **What you should see:** A blob of JSON (a structured text format) listing the folders and files at the root.

#### Response shape

```json
{
  "DirectoryItems": [
    {
      "id": "abc-123",
      "Name": "Q4 reports",
      "FileExtension": "",
      "Path": "/Q4 reports",
      "OwnerAddress": "0x1234...abcd",
      "CreatedAt": "2024-10-01T00:00:00Z",
      "UpdatedAt": "2024-10-01T00:00:00Z"
    }
  ],
  "Pagination": { "TotalRowCount": 42, "TotalPage": 5, "CurrentPage": 1 }
}
```

#### What it wraps

`GET {LUMEN_API_BASE_URL}/directoryItems/{path}` (path is URL-encoded by the server before forwarding)

---

### Route 2 — Activity logs for a path

#### `GET /api/directoryItems/logs`

Returns a paginated history of actions (create, rename, archive, restore, delete) performed on items at a given path.

#### Query parameters

Same shape as Route 1: `path` (required), `pageNumber`, `pageSize`, `search`, `sort[0][field]`, `sort[0][order]`.

#### Example

```
curl "http://localhost:8787/api/directoryItems/logs?path=/Q4%20reports&pageNumber=1&pageSize=10"
```

> **What you should see:** A JSON object with a list of log entries, each describing what happened, when, and who did it.

#### Response shape

```json
{
  "Logs": [
    {
      "id": "log-001",
      "Action": "CREATE",
      "PerformedBy": "0xabcd...1234",
      "Timestamp": "2024-10-01T12:34:56Z"
    }
  ],
  "Pagination": { "TotalRowCount": 3, "TotalPage": 1, "CurrentPage": 1 }
}
```

#### What it wraps

`GET {LUMEN_API_BASE_URL}/directoryItems/logs/{path}`

---

### Route 3 — List archived items

#### `GET /api/archivedFiles`

Returns a paginated list of items that have been archived (soft-deleted) at or under a given path.

#### Query parameters

Same shape as Route 1.

#### Example

```
curl "http://localhost:8787/api/archivedFiles?path=/&pageNumber=1&pageSize=10"
```

> **What you should see:** A JSON object listing archived items, each with both its original ID (`DirectoryItemID`) and its archive ID (`ArchivedID`) — you'll need both to restore it later.

#### Response shape

```json
{
  "ArchivedFiles": [
    {
      "DirectoryItemID": "abc-123",
      "ArchivedID": "arch-789",
      "Name": "old-report.pdf",
      "Path": "/Q4 reports/old-report.pdf",
      "ArchivedAt": "2024-11-15T08:00:00Z"
    }
  ],
  "Pagination": { "TotalRowCount": 7, "TotalPage": 1, "CurrentPage": 1 }
}
```

#### What it wraps

`GET {LUMEN_API_BASE_URL}/archivedFiles/{path}`

---

## File routes

### Route 4 — Get one file's metadata

#### `GET /api/file`

Returns the full metadata record for a single file at a given path.

#### Query parameters

| Name | Type | Default | What it does |
|---|---|---|---|
| `path` | string (1 to 1024 chars) | — (required) | The full path to the file, including its name and extension. |

#### Example

```
curl "http://localhost:8787/api/file?path=/Q4%20reports/summary.pdf"
```

> **What you should see:** A JSON object describing one file.

#### Response shape

```json
{
  "id": "file-xyz",
  "Name": "summary",
  "FileExtension": "pdf",
  "Path": "/Q4 reports/summary.pdf",
  "OwnerAddress": "0x1234...abcd",
  "Checksum": "MTIzNDU2Nzg5MGFiY2RlZg==",
  "Description": "Quarterly summary",
  "CreatedAt": "2024-10-01T00:00:00Z",
  "UpdatedAt": "2024-10-01T00:00:00Z"
}
```

#### What it wraps

`GET {LUMEN_API_BASE_URL}/file/{path}`

---

### Route 5 — Upload one file (step 1 of two)

#### `POST /api/file/create`

Reserves a spot for a new file and gives you back a single-use upload URL. **This is step 1 of the two-step upload.** You still have to PUT the actual file bytes to the returned `SASURL` afterwards — that's step 2.

#### Query parameters

| Name | Type | Default | What it does |
|---|---|---|---|
| `path` | string | — (required) | The folder path where the new file should live. |

#### Request body

| Field | Type | What it does |
|---|---|---|
| `Name` | string (1 to 255 chars) | File name without the extension. |
| `FileExtension` | string (1 to 32 chars) | The extension only, e.g. `pdf` or `png`. |
| `Checksum` | string | Base64-encoded MD5 of the file bytes (a 24-character string ending in `==`). |
| `Description` | string (optional, up to 2000 chars) | Free-text description. Defaults to empty. |

> **Heads up:** The `Checksum` must be base64-encoded MD5 — that's the format Lumen compares against. If you compute it as a 32-character hex string, convert it to base64 first. The browser-side helper `web/src/lib/md5.js` does this for you.

#### Example

```
curl -X POST "http://localhost:8787/api/file/create?path=/Q4%20reports" \
  -H "Content-Type: application/json" \
  -d '{"Name":"summary","FileExtension":"pdf","Checksum":"MTIzNDU2Nzg5MGFiY2RlZg==","Description":"Quarterly summary"}'
```

> **What you should see:** A JSON response containing a `SASURL` (the single-use upload address — an Amazon S3 presigned URL; the field keeps its older name `SASURL`), a `WorkflowID` (the ID of the background mint workflow Lumen starts), and a `File` object with the new file's metadata.

#### Response shape

```json
{
  "SASURL": "https://<bucket>.s3.<region>.amazonaws.com/...?X-Amz-Algorithm=AWS4-HMAC-SHA256&...&X-Amz-Signature=...",
  "WorkflowID": "wf-12345",
  "File": {
    "id": "file-new-1",
    "Name": "summary",
    "FileExtension": "pdf",
    "Path": "/Q4 reports/summary.pdf"
  }
}
```

#### Step 2 — PUT the file bytes

After this route returns, the browser must PUT the actual file bytes to `SASURL` (an S3 presigned URL) in one request, with one header:

```
Content-Type: <the file's MIME type, or application/octet-stream>
```

No auth headers (the signature in the URL is the permission) and no checksum header. One PUT, not a multipart upload. The upload URL expires after 60 minutes.

After the file lands, Lumen compares the `Checksum` you sent in step 1 with the stored file. If they don't match, Lumen's background workflow fails and the file never appears in your folder.

#### What it wraps

`POST {LUMEN_API_BASE_URL}/file/create/{path}`

---

### Route 6 — Upload many files in one go (batch)

#### `POST /api/files/create`

Same idea as Route 5, but reserves spots for **1 to 50** files at once and returns an array of upload URLs. The browser then PUTs each file's bytes in parallel.

#### Query parameters

| Name | Type | Default | What it does |
|---|---|---|---|
| `path` | string | — (required) | The folder path where the new files should live. |

#### Request body

| Field | Type | What it does |
|---|---|---|
| `Files` | array (1 to 50 items) | Each item has the same shape as the body of Route 5: `Name`, `FileExtension`, `Checksum`, optional `Description`. |

#### Example

```
curl -X POST "http://localhost:8787/api/files/create?path=/Q4%20reports" \
  -H "Content-Type: application/json" \
  -d '{"Files":[{"Name":"a","FileExtension":"pdf","Checksum":"AAAAAAAAAAAAAAAAAAAAAA=="},{"Name":"b","FileExtension":"pdf","Checksum":"BBBBBBBBBBBBBBBBBBBBBB=="}]}'
```

> **What you should see:** A JSON array with one `{ SASURL, WorkflowID, File }` entry per file, in the same order as your input.

#### Step 2 — PUT each file's bytes

Same as Route 5, but you do it once per file. The sample app uploads up to 3 in parallel for speed.

> **Heads up:** Partial failures are possible. If 2 of 5 PUTs fail, the failed slots stay empty in Lumen but the successful 3 are committed. The sample shows per-file progress and an error indicator on the failed rows.

#### What it wraps

`POST {LUMEN_API_BASE_URL}/files/create/{path}`

---

### Route 7 — Edit a file's name or description

#### `PATCH /api/file/metadata`

Updates a file's name and/or description. You don't have to send both — but you must send **at least one**.

#### Query parameters

| Name | Type | Default | What it does |
|---|---|---|---|
| `path` | string | — (required) | The full path to the file you're updating. |

#### Request body

| Field | Type | What it does |
|---|---|---|
| `NewDirectoryItemName` | string (optional, 1 to 255 chars) | The new name (without extension). |
| `Description` | string (optional, up to 2000 chars) | The new description. |

> **Heads up:** Sending an empty body (or both fields missing) returns a `400 Bad Request` from the Zod validator. At least one must be present.

#### Example

```
curl -X PATCH "http://localhost:8787/api/file/metadata?path=/Q4%20reports/summary.pdf" \
  -H "Content-Type: application/json" \
  -d '{"NewDirectoryItemName":"summary-final","Description":"Locked Q4 summary"}'
```

> **What you should see:** A JSON object containing the old and new file records, so the UI can confirm what changed.

#### Response shape

```json
{
  "Old": { "Name": "summary", "Description": "Quarterly summary" },
  "New": { "Name": "summary-final", "Description": "Locked Q4 summary" }
}
```

#### What it wraps

`PATCH {LUMEN_API_BASE_URL}/file/metadata/{path}`

---

### Route 8 — Archive a file (soft delete)

#### `DELETE /api/file/archive`

Moves a file to the archive. It disappears from normal browsing but can be restored later (Route 9). The opposite of permanent delete.

#### Query parameters

| Name | Type | Default | What it does |
|---|---|---|---|
| `path` | string | — (required) | The full path to the file you're archiving. |

#### Example

```
curl -X DELETE "http://localhost:8787/api/file/archive?path=/Q4%20reports/old-draft.pdf"
```

> **What you should see:** A JSON acknowledgement with the new archive record (including the `ArchivedID` you'll need to restore it).

#### Response shape

```json
{
  "DirectoryItemID": "abc-123",
  "ArchivedID": "arch-789",
  "ArchivedAt": "2024-11-15T08:00:00Z"
}
```

#### What it wraps

`DELETE {LUMEN_API_BASE_URL}/file/archive/{path}`

---

### Route 9 — Restore a file from the archive

#### `PATCH /api/file/restore`

Brings an archived file back to its original location.

> **Heads up:** The `path` in the query is the **archived** path, not the original. You'll get both this and the original `DirectoryItemID` / `ArchivedID` from Route 3 (`GET /api/archivedFiles`).

#### Query parameters

| Name | Type | Default | What it does |
|---|---|---|---|
| `path` | string | — (required) | The archived path of the item being restored. |

#### Request body

| Field | Type | What it does |
|---|---|---|
| `DirectoryItemID` | string | The original ID of the file before archive. |
| `ArchivedID` | string | The archive record's ID, from Route 3. |

#### Example

```
curl -X PATCH "http://localhost:8787/api/file/restore?path=/archive/old-draft.pdf" \
  -H "Content-Type: application/json" \
  -d '{"DirectoryItemID":"abc-123","ArchivedID":"arch-789"}'
```

> **What you should see:** A JSON object confirming the file is back at its original path.

#### What it wraps

`PATCH {LUMEN_API_BASE_URL}/file/restore/{path}`

---

### Route 10 — Permanently delete a file

#### `DELETE /api/file/delete`

Removes a file completely. There is no undo. Use archive (Route 8) for anything you might want back.

#### Query parameters

| Name | Type | Default | What it does |
|---|---|---|---|
| `path` | string | — (required) | The full path to the file you're permanently deleting. |

#### Example

```
curl -X DELETE "http://localhost:8787/api/file/delete?path=/Q4%20reports/summary.pdf"
```

> **What you should see:** A JSON acknowledgement that the file is gone.

> **WARNING:** This action cannot be undone. The sample's UI uses a red-toned confirmation dialog (versus yellow for archive) to make this obvious.

#### What it wraps

`DELETE {LUMEN_API_BASE_URL}/file/delete/{path}`

---

## Folder routes

### Route 11 — Create a folder

#### `POST /api/folder/create`

Creates a new folder at the given parent path.

#### Query parameters

| Name | Type | Default | What it does |
|---|---|---|---|
| `path` | string | — (required) | The parent folder path where the new folder will be created. |

#### Request body

| Field | Type | What it does |
|---|---|---|
| `Name` | string (1 to 255 chars) | The new folder's name. |
| `Path` | string (1 to 1024 chars) | The full target path of the new folder. |
| `FolderType` | `collection` or `directory` | Pick one. `collection` is a top-level grouping; `directory` is a regular nested folder. The sample defaults to `directory`. |

#### Example

```
curl -X POST "http://localhost:8787/api/folder/create?path=/Q4%20reports" \
  -H "Content-Type: application/json" \
  -d '{"Name":"drafts","Path":"/Q4 reports/drafts","FolderType":"directory"}'
```

> **What you should see:** A JSON object with the new folder's metadata.

#### What it wraps

`POST {LUMEN_API_BASE_URL}/folder/create/{path}`

---

### Route 12 — Get one folder's details

#### `GET /api/folder`

Returns the metadata record for a single folder.

#### Query parameters

| Name | Type | Default | What it does |
|---|---|---|---|
| `path` | string | — (required) | The full path to the folder. |

#### Example

```
curl "http://localhost:8787/api/folder?path=/Q4%20reports"
```

> **What you should see:** A JSON object describing the folder.

#### Response shape

```json
{
  "id": "folder-123",
  "Name": "Q4 reports",
  "Path": "/Q4 reports",
  "FolderType": "directory",
  "CreatedAt": "2024-10-01T00:00:00Z"
}
```

#### What it wraps

`GET {LUMEN_API_BASE_URL}/folder/{path}`

---

## Health check (outside `/api`)

### Route 13 — Server alive check

#### `GET /health`

A tiny endpoint to confirm the server is alive. Not under `/api`, so it's not affected by the rate limiter or Zod validation.

#### Example

```
curl "http://localhost:8787/health"
```

> **What you should see:**
>
> ```json
> { "ok": true, "service": "fms-server" }
> ```

Use this when you suspect the server isn't running and want a quick yes/no answer before debugging anything bigger.

---

## Error responses

When something goes wrong, every `/api/*` route comes back with the same shape — and the HTTP status code (a 3-digit number that tells you what kind of problem it is) from the upstream Lumen call (or from the local validator):

```json
{
  "ok": false,
  "status": 401,
  "error": "Invalid API key"
}
```

> **Note:** **HTTP status codes** are standard 3-digit numbers. Anything starting with `2` means success. `4xx` means the client (you) did something wrong. `5xx` means the server had a problem.

### Common statuses

| Status | What it means | How to fix it |
|---|---|---|
| 400 | Bad input — either a query parameter (`pageSize=9999`, an unknown sort field, an invalid path character) **or** a bad request body (missing required field, MD5 not in base64, metadata patch with both fields empty). Zod rejected it locally before the request ever reached Lumen. | Read the `error` message — it names the field that failed. Fix the query string or body and retry. |
| 401 | Your `LUMEN_API_KEY` or `LUMEN_API_SECRET` is invalid. | Re-check both values in `.env`, save, then restart with `npm start`. |
| 403 | Your API key is valid but doesn't have permission for the **FILES** module on your organization. | Contact the Lumen team to enable the FILES module. |
| 404 | The path you asked for doesn't exist (e.g., a typo in a folder name). | Double-check the path. Use Route 1 to list what actually exists at the parent. |
| 429 | You hit the local rate limit (**200 requests per 15 minutes** per IP). | Slow down. Wait a few minutes and try again. |
| 500 | Something upstream failed. | Check the terminal where `npm start` is running for more detail. |
