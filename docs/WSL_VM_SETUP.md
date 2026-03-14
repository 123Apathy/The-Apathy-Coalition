# PopeBot WSL VM Setup

This is the recommended way to run PopeBot on a Windows PC with a VM-style safety boundary.

Instead of running PopeBot directly on Windows, run it inside **WSL2 Ubuntu** and keep your Docker/Linux tooling there. This is lighter than a full Hyper-V or VirtualBox VM, but it still gives you a separate Linux runtime for PopeBot.

## Why this setup

- PopeBot is Docker-heavy and Linux-native in its deployment model
- WSL2 is easier to maintain than a full manual VM
- Docker, GitHub Actions runner behavior, and Linux tooling fit more naturally there
- It reduces the exposure of your normal Windows environment

This is still not a perfect sandbox, but it is a much better install posture than running everything directly on your everyday Windows host.

## 1. Install WSL2

Open an **elevated PowerShell** window and run:

```powershell
wsl --install -d Ubuntu
```

Then reboot if Windows asks you to.

After reboot, launch Ubuntu once and finish the first-time Linux user setup.

## 2. Install Docker Desktop

Install Docker Desktop for Windows and enable:

- WSL2 backend
- Ubuntu integration

After this, `docker` and `docker compose` should work from inside your Ubuntu WSL shell.

## 3. Install required tools inside Ubuntu

Inside WSL Ubuntu:

```bash
sudo apt update
sudo apt install -y git curl gh
```

Install Node.js 22 with your preferred method. For example using NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## 4. Use the PopeBot project from Windows storage

This repo is currently at:

```text
D:\Popebot
```

Inside WSL, that path becomes:

```text
/mnt/d/Popebot
```

## 5. First-time PopeBot setup

Inside WSL Ubuntu:

```bash
cd /mnt/d/Popebot
npm install
npm run setup
npm run build
docker compose up -d
```

If you are using Ollama locally on Windows, point PopeBot's custom provider settings at the Windows host from containers using:

```text
http://host.docker.internal:11434/v1
```

## 6. Create a desktop shortcut

From Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create-popebot-shortcut.ps1
```

That creates a desktop shortcut named:

```text
PopeBot (WSL)
```

## 7. Launch PopeBot

Use the desktop shortcut, or run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-popebot-wsl.ps1 -OpenBrowser
```

This will:

- open PopeBot inside the WSL Ubuntu environment
- run `docker compose up -d`
- leave you in an interactive shell
- optionally open the browser to `http://localhost`

## Notes

- Default WSL distro assumed by the launcher: `Ubuntu`
- Default app URL assumed by the launcher: `http://localhost`
- If your distro name or project path is different, pass `-Distro` or `-ProjectPath`

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-popebot-wsl.ps1 -Distro Ubuntu-24.04 -ProjectPath D:\Popebot -AppUrl http://localhost -OpenBrowser
```

## Safety posture

This setup improves separation, but you should still treat PopeBot as privileged engineering automation:

- keep it off your most sensitive personal machine if possible
- review PRs manually
- keep auto-merge restrictive
- avoid exposing local dev ports publicly unless needed
- use minimum-scope GitHub tokens
