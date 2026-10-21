# 🔄 SuperGile

🇬🇧 **English** · 🇷🇺 [Русский](README.ru.md)

**Your YouGile tasks, right inside Super Productivity, and back.**

SuperGile is a [Super Productivity](https://super-productivity.com/) plugin that pulls in the tasks assigned to you in [YouGile](https://yougile.com) and keeps them in sync both ways. Finish a task in Super Productivity and it is marked done in YouGile. Set a deadline in YouGile and it shows up in your planner.

[![CI](https://github.com/SileboxUnderfined/SuperGile/actions/workflows/ci.yml/badge.svg)](https://github.com/SileboxUnderfined/SuperGile/actions/workflows/ci.yml)

---

## 🤔 Why

YouGile is great for teamwork: boards, columns, chats inside tasks. Super Productivity is great for personal focus: a daily plan, timers, pomodoro, time tracking. The catch is living in two places at once:

- 😩 YouGile tasks have to be copied over by hand;
- 🤷 every task has to be marked done twice;
- ⏱️ time spent gets lost or typed into YouGile from memory.

SuperGile removes that double work: YouGile stays the team's source of tasks, and Super Productivity stays your workspace.

## ✨ Features

- 📥 **Auto import.** New open tasks assigned to you appear in the project backlog on their own.
- ✅ **Done state both ways.** Ticking a task in Super Productivity sets the "completed" flag in YouGile, and vice versa.
- 📝 **Title and description.** The title syncs both ways; the description comes from YouGile (HTML is converted to Markdown).
- 📅 **Deadline.** A date or a date with time, both ways.
- ⏳ **Time estimate.** The planned time from YouGile's time tracking ↔ the task estimate in Super Productivity.
- ⏱️ **Time spent.** When you finish a task, Super Productivity offers to log the time, and SuperGile adds it to "spent" in YouGile.
- 🗑️ **Deletion.** A task deleted in YouGile disappears from Super Productivity too.
- 🔍 **Search.** Find any YouGile task by title and add it by hand.
- 📋 **Checklists** are shown on the task card.

### How fields map

| YouGile | Super Productivity | Direction |
| --- | --- | --- |
| Completed (`completed`) | Done | ↔️ |
| Title | Title | ↔️ |
| Description | Notes | ⬅️ from YouGile (can be switched to ↔️) |
| Deadline (date) | Due day | ↔️ |
| Deadline (date and time) | Due with time | ↔️ |
| Time tracking: plan | Time estimate | ↔️ |
| Time tracking: spent | Time spent | ➡️ when the task is done |
| Deleted | Task is removed | ⬅️ |

You can change the direction of each field in the provider settings in Super Productivity.

## 📦 Installation

1. Download `supergile-<version>.zip` from [Releases](https://github.com/SileboxUnderfined/SuperGile/releases).
2. In Super Productivity open **Settings → Plugins** and upload the zip.
3. Enable the plugin. In your project open **Project settings → Integrations** and add the **YouGile** provider.
4. Paste your API key (see below how to get one) and click "Test connection".

> 💡 Requires Super Productivity 19 or newer, which added two-way sync for plugins.
> Works in the desktop app and on mobile. In the browser version, requests may be blocked by CORS.

## 🔑 Getting an API key

YouGile issues keys for your login and password. The easiest way (needs [Node.js](https://nodejs.org/) 20+):

```bash
git clone https://github.com/SileboxUnderfined/SuperGile.git
cd SuperGile
npm run api-key
```

The script asks for your email and password, lists your companies and prints a key. The password goes only to YouGile and is never saved.

<details>
<summary>The same with curl</summary>

```bash
# 1. Find your company id
curl -X POST https://yougile.com/api-v2/auth/companies \
  -H 'Content-Type: application/json' \
  -d '{"login": "you@example.com", "password": "..."}'

# 2. Create a key
curl -X POST https://yougile.com/api-v2/auth/keys \
  -H 'Content-Type: application/json' \
  -d '{"login": "you@example.com", "password": "...", "companyId": "<company id>"}'
```

</details>

> 🔒 The key has the same rights as your account, so keep it private. It never expires; delete it with `DELETE /api-v2/auth/keys/{key}`. An account can have up to 30 keys.

## ⚙️ Settings

| Field | What it is for |
| --- | --- |
| API key | Required. Tells the plugin who you are and finds your tasks. |
| YouGile address | Leave empty for `https://yougile.com`. |
| Task link template | Where the link on a task card leads. Placeholders: `{host}`, `{id}`, `{idTaskCommon}`, `{idTaskProject}`. |
| Log time when a task is done | Shows a dialog that adds your tracked time to YouGile. |

## ⚠️ Limitations

- 🕐 **Polling, not instant events.** Changes from YouGile arrive every 3 minutes and only while Super Productivity is open. Changes from Super Productivity are sent right away.
- 🚦 **YouGile allows 50 requests per minute per company.** The plugin uses one request for your whole batch of tasks, but the limit is shared by all of the company's integrations.
- 👥 **Time spent is one number per task.** YouGile does not split it by person, so SuperGile adds your time to the total.
- 🧩 **Subtasks and checklists** are not synced yet; checklists are only shown on the card.
- 🔗 **The task link** opens YouGile by default, not the exact task. The direct link format is set with the template.
- 🔐 **The key is stored in the provider settings** of Super Productivity. If you use Super Productivity sync, it travels with the rest of your settings.

## 🛠️ Development

```bash
npm install
npm test           # tests (vitest)
npm run typecheck  # type check
npm run build      # build into dist/
npm run package    # build + zip into release/
```

The zip in `release/` can be uploaded to Super Productivity as is.

### Code layout

```
src/
├── plugin.ts            # entry point: registers the provider
├── manifest.json        # plugin description for Super Productivity
├── i18n/                # English and Russian texts
├── provider/
│   ├── config.ts        # settings form
│   ├── mapping.ts       # YouGile ↔ Super Productivity: fields and conversions
│   └── definition.ts    # the issue provider: import, updates, time tracking
├── yougile/
│   ├── client.ts        # YouGile REST API v2 client
│   └── types.ts         # API types
└── utils/               # time, dates, HTML ↔ Markdown
vendor/plugin-api/       # Super Productivity Plugin API types (MIT)
scripts/                 # build and API key helper
```

### 🌿 Branches and releases

- Every feature is built on its own `feature/...` branch and merged into `main`.
- On every push and pull request, GitHub Actions type-checks, runs the tests and builds the zip (downloadable from the run's artifacts).
- To release, bump `version` in `package.json`, commit, and push a tag:

  ```bash
  git tag v0.2.0
  git push origin v0.2.0
  ```

  The **Release** workflow builds the plugin and publishes a GitHub Release with the zip.
- Or without a tag: **Actions → Release → Run workflow**. It tags the commit with `v<package.json version>` itself.

## 📚 Links

- [YouGile REST API v2](https://yougile.com/api-v2#/)
- [Super Productivity plugin development](https://github.com/johannesjo/super-productivity/blob/master/docs/plugin-development.md)

## 📄 License

[MIT](LICENSE)
