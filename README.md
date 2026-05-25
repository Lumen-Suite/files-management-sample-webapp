# Lumen Files Management â€” Public Sample

<p align="center">
  <img src="docs/images/lumen-logo.svg" alt="Lumen" width="120" />
</p>

This is a small, friendly example application that shows the files your organization owns inside the **Lumen** platform. You can browse folders, upload new documents, edit their names and descriptions, archive things you don't need right now, and restore them later. You do **not** need to know how to code to run it. If you can install a program from a website and edit a text file, you can have this working on your computer in about ten minutes.

> **What this is for:** Two kinds of people. (1) Developers who want to see how the Lumen Dev **Files** APIs (the online services that hand out file and folder data) work. (2) Non-coders who want to manage their organization's files without writing any code themselves.

**What's under the hood (don't worry if these words mean nothing):** Vite + React (the part you see in the browser), Tailwind v4 (the visual styling), Express (a tiny server that runs on your own computer at port 8787), one settings file called `.env`, and one command to start everything: `npm start`. When you upload a file, the file bytes go **directly** to Azure storage using a single-use upload address â€” the tiny server in the middle only handles the small bits of text describing the file, never the file itself.

---

## Quickstart â€” 8 steps from zero to running

Follow these in order. Each step is small.

### Step 1 â€” Install Node.js

Node.js is the program that runs the code in this sample. Go to [nodejs.org](https://nodejs.org) and download the version labeled **"LTS"** (it stands for "Long-Term Support" â€” the stable one most people use). Run the installer. Click "Next" through every screen.

> **What you should see:** When the installer finishes, you can close it. Nothing visible happens on your screen â€” Node.js is a background tool, not an app with an icon.

### Step 2 â€” Get your Lumen credentials

You need two secret values from Lumen: an **API key** (a public-ish ID that says "this is my organization") and an **API secret** (a password that proves it). The full walkthrough is in [docs/GET_CREDENTIALS.md](docs/GET_CREDENTIALS.md).

> **Tip:** Keep both values in a safe place. The secret is usually only shown once.

### Step 3 â€” Download this project

The easiest way: on the project's GitHub page, click the green **"Code"** button, then **"Download ZIP"**. Unzip the file into a folder you can find later (your Documents folder is fine).

If you happen to already use Git (a tool programmers use to download code), you can instead open a terminal (the black-or-white window where you type commands) and run:

```
git clone https://github.com/Lumen-Suite/files-management-sample-webapp.git
cd files-management-sample-webapp
```

> **What you should see:** A new folder called `files-management-sample-webapp` somewhere on your computer.

### Step 4 â€” Make a copy of the settings file

The project comes with a template settings file named `.env.example`. You need to make a real copy of it called `.env` (just `.env`, no `.example`).

Open a terminal inside the project folder. Then run the command for your computer:

| Your computer | What to type |
|---|---|
| Windows (PowerShell) | `Copy-Item .env.example .env` |
| macOS or Linux | `cp .env.example .env` |

> **What you should see:** A new file called `.env` appears in the folder.

### Step 5 â€” Fill in your secrets

Open the new `.env` file in any text editor â€” Notepad on Windows, TextEdit on macOS, or VS Code if you have it. You'll see lines like `LUMEN_API_KEY=...` and `LUMEN_API_SECRET=...`. Replace the placeholder text after the `=` sign with the real values you got in Step 2.

> **Heads up:** No quotes. No spaces around the `=` sign. The line should look like `LUMEN_API_KEY=abc123-def456` and nothing else.

### Step 6 â€” Download the project's libraries

The app needs a bunch of small helper packages (libraries). Ask Node to download them by typing this in the terminal:

```
npm install
```

> **What you should see:** A lot of text scrolling. It takes one to two minutes the first time. When it stops, you'll be back at the normal terminal prompt with no red error messages.

### Step 7 â€” Start the app

Now turn on the app:

```
npm start
```

> **What you should see:** Two important lines, somewhere in the colored output:
>
> - `SRV ready on 8787` (your local server is running)
> - `WEB Local: http://localhost:5173` (the website part is ready)
>
> If you see both, the app is alive.

### Step 8 â€” Open the file browser in your browser

Open Chrome (or any browser) and go to:

[http://localhost:5173](http://localhost:5173)

The file browser opens at the root of your organization's storage. That's it â€” you're done.

---

## What you'll see

A grid of folders and files at the root of your organization's storage area. Along the top, a **breadcrumb path** (the trail of folder names you've clicked through, like `Home / reports / 2024`) shows where you are. Click a folder to step into it. Click a file to open a side panel with its full details â€” name, file type, owner, **checksum** (a short code that proves the file wasn't tampered with), and timestamps.

The toolbar has two action buttons. **Upload** opens a drag-and-drop zone where you can drop one or many files at once. **New folder** opens a small form to create a new folder at the current location.

There's also a separate **Archive** page at `/archive`. Archived files are ones you've soft-deleted â€” they don't appear in normal browsing but you can restore them any time. Permanent deletion is a separate, harder-to-undo action available from the file detail panel.

> **If your file browser is empty:** That means your organization has no files or folders yet, or this is a brand-new account. Use the **Upload** or **New folder** buttons to create the first ones.

---

## How it works (30-second version)

```
Your browser  ->  Local Express server  ->  Lumen Dev Files API
   :5173             :8787                   (Azure cloud)
       \
        \---- PUT file bytes directly ----> Azure Blob Storage
                                            (single-use SAS URL)
```

The **Express server** is a tiny program running on your own computer. Its only job is to attach your API key and secret to outgoing requests before sending them to Lumen, so those secrets never end up in the browser where someone could steal them.

But when you upload a file, the file bytes themselves take a **separate path**. The browser asks the Express server to ask Lumen for a **pre-signed URL** (a single-use upload address that only works for this exact file, for the next few minutes). Then the browser uploads the file directly to Azure storage using that URL. The Express server never touches the file's contents â€” only the small bits of text describing it.

**Why bother with the middle server?** If we put your API secret directly in the browser code, anyone visiting the site could open the developer tools and copy it. Keeping it server-side keeps you safe â€” even if you later put this app on the public internet.

**Why does the file binary skip the server?** Two reasons. First, efficiency: the file goes straight from your computer to Azure without making a detour through Node.js. That's faster and uses less of your computer's CPU. Second, scale: a real production server doesn't want to be a bottleneck for 100 MB files.

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Documentation

- [docs/SETUP.md](docs/SETUP.md) â€” the long, step-by-step installation guide for people who've never used a terminal before.
- [docs/GET_CREDENTIALS.md](docs/GET_CREDENTIALS.md) â€” where to find your Lumen API key and secret, and how to keep them safe.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) â€” a tour of what's in each folder and why, including the two-step upload flow.
- [docs/API_REFERENCE.md](docs/API_REFERENCE.md) â€” the thirteen routes the local server provides, for the technically curious.

---

## Top 5 things that go wrong

| What you saw | What it means | How to fix it |
|---|---|---|
| `port 8787 in use` | Another program is already using that network port (a numbered "lane" on your computer). | Open `.env`, change `SERVER_PORT=8787` to something like `SERVER_PORT=8788`, save, then run `npm start` again. |
| `LUMEN_API_KEY missing` | You haven't filled in your secrets yet. | Re-read Step 5 above and edit `.env`. |
| The file browser is empty | Your organization has no files or folders yet â€” not an error. | Click **New folder** or **Upload** to create the first ones. |
| Red banner saying `401` or `403` | Your API key or secret is wrong, or the key doesn't have file permission. | Double-check `.env`, save, stop the app (Ctrl+C in the terminal), and run `npm start` again. |
| Browser console says "CORS error" mentioning `blob.core.windows.net` during an upload | The Lumen storage account doesn't yet allow uploads from `http://localhost:5173`. This is unique to the Files sample â€” the file goes directly to Azure storage, not through the local server. | Contact the Lumen team and ask them to whitelist `http://localhost:5173` for `PUT` on the Files storage account. |

> **CORS** (Cross-Origin Resource Sharing) is a browser security rule that blocks websites on one address from talking to a server on a different address â€” unless the server explicitly allows it.

---

## License

MIT â€” see [LICENSE](LICENSE). That means: free to use, modify, and share.
