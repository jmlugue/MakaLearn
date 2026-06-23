# MakaLearn local setup

Use this guide to run MakaLearn on your computer after cloning the repository.

## 1. Install the prerequisites

Install these tools first:

- [Git](https://git-scm.com/downloads)
- [Node.js 20 LTS](https://nodejs.org/) (npm is included)

Check that they are available:

```bash
git --version
node --version
npm --version
```

## 2. Clone the project

Replace `<repository-url>` with the GitHub repository URL:

```bash
git clone <repository-url>
cd MakaLearn
```

If the folder has a different name, use that name in the `cd` command.

## 3. Install the dependencies

```bash
npm ci
```

Use `npm ci` for the initial setup because it installs the exact versions recorded in `package-lock.json`. When a teammate changes dependencies, pull the latest changes and run `npm ci` again.

## 4. Configure local environment variables

The app can run with local fallback data without Supabase credentials. Create a local environment file so it is ready for optional Supabase configuration.

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

Leave the values empty for local/demo mode:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit `.env.local`. It is intentionally ignored by Git. If Supabase access is needed later, obtain the project URL and publishable/anon key from the project owner; never place a service-role key in this file.

## 5. Start the website

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser. Allow camera access if you test Gesture Practice.

Stop the development server with `Ctrl+C`.

## 6. Check changes before pushing

```bash
npm run lint
npm run build
```

Both commands should finish successfully before opening a pull request.

## Updating your local copy

```bash
git pull
npm ci
npm run dev
```

Running `npm ci` after pulling is safe and ensures newly added or changed dependencies are installed.

## Common problems

### `npm` is blocked in Windows PowerShell

If PowerShell reports that `npm.ps1` is not digitally signed or script execution is disabled, use the Windows command shim:

```powershell
npm.cmd ci
npm.cmd run dev
```

### Port 3000 is already in use

Next.js normally offers another port. Use the URL printed in the terminal, or stop the other process and run the development server again.

### Dependencies appear broken

First make sure you are using Node.js 20 LTS, then reinstall from the lockfile:

```bash
npm ci
```

Avoid committing `node_modules`, `.next`, or `.env.local`; these are local/generated files and are already listed in `.gitignore`.
