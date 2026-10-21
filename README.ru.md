# 🔄 SuperGile

**Задачи из YouGile — прямо в Super Productivity, и обратно.**

SuperGile — плагин для [Super Productivity](https://super-productivity.com/), который подтягивает задачи, назначенные на вас в [YouGile](https://yougile.com), и держит их в синхронизации в обе стороны. Закрыли задачу в Super Productivity — она отмечена выполненной в YouGile. Поставили дедлайн в YouGile — он появился у вас в планировщике.

[![CI](https://github.com/SileboxUnderfined/SuperGile/actions/workflows/ci.yml/badge.svg)](https://github.com/SileboxUnderfined/SuperGile/actions/workflows/ci.yml)

---

## 🤔 Зачем это нужно

YouGile хорош для командной работы: доски, колонки, чаты в задачах. Super Productivity хорош для личной продуктивности: план на день, таймер, помодоро, учёт времени. Проблема в том, что жить приходится в двух местах сразу:

- 😩 задачи из YouGile приходится переписывать вручную;
- 🤷 отметить выполнение нужно дважды;
- ⏱️ затраченное время теряется или вбивается в YouGile по памяти.

SuperGile убирает эту двойную работу: YouGile остаётся источником задач для команды, а Super Productivity — вашим рабочим местом.

## ✨ Что умеет

- 📥 **Автоимпорт.** Новые незавершённые задачи, назначенные на вас, сами появляются в бэклоге проекта.
- ✅ **Выполнение в обе стороны.** Галочка в Super Productivity ставит флажок «выполнено» в YouGile, и наоборот.
- 📝 **Название и описание.** Название синхронизируется в обе стороны, описание приходит из YouGile (HTML превращается в Markdown).
- 📅 **Дедлайн.** Дата или дата со временем, в обе стороны.
- ⏳ **Оценка времени.** План из таймтрекинга YouGile ↔ оценка задачи в Super Productivity.
- ⏱️ **Затраченное время.** Когда вы закрываете задачу, Super Productivity предлагает записать время, и SuperGile прибавляет его к «затрачено» в YouGile.
- 🗑️ **Удаление.** Задача, удалённая в YouGile, пропадает и из Super Productivity.
- 🔍 **Поиск.** Любую задачу YouGile можно найти по названию и добавить вручную.
- 📋 **Чек-листы** видны в карточке задачи.

### Как сопоставляются поля

| YouGile | Super Productivity | Направление |
| --- | --- | --- |
| Выполнено (`completed`) | Готово | ↔️ |
| Название | Название | ↔️ |
| Описание | Заметки | ⬅️ из YouGile (можно включить ↔️) |
| Дедлайн (дата) | Срок (день) | ↔️ |
| Дедлайн (дата и время) | Срок (со временем) | ↔️ |
| Таймтрекинг: план | Оценка времени | ↔️ |
| Таймтрекинг: затрачено | Затраченное время | ➡️ при закрытии задачи |
| Удалена | Задача удаляется | ⬅️ |

Направление каждого поля можно поменять в настройках провайдера в Super Productivity.

## 📦 Установка

1. Скачайте `supergile-<версия>.zip` со страницы [Releases](https://github.com/SileboxUnderfined/SuperGile/releases).
2. В Super Productivity откройте **Настройки → Плагины** и загрузите zip.
3. Включите плагин. В проекте откройте **Настройки проекта → Интеграции** и добавьте провайдер **YouGile**.
4. Вставьте ключ API (как его получить, смотрите ниже) и нажмите «Проверить соединение».

> 💡 Нужен Super Productivity 19.2.0 или новее: в более старых версиях в API плагинов нет записи времени и пакетного обновления задач.
> Работает в desktop-версии и на телефоне. В браузерной версии запросы может заблокировать CORS.

## 🔑 Как получить ключ API

Ключ выдаётся по логину и паролю YouGile. Проще всего так (нужен [Node.js](https://nodejs.org/) 20+):

```bash
git clone https://github.com/SileboxUnderfined/SuperGile.git
cd SuperGile
npm run api-key
```

Скрипт спросит почту и пароль, покажет ваши компании и выдаст ключ. Пароль уходит только в YouGile и нигде не сохраняется.

<details>
<summary>То же самое через curl</summary>

```bash
# 1. Узнать id компании
curl -X POST https://yougile.com/api-v2/auth/companies \
  -H 'Content-Type: application/json' \
  -d '{"login": "you@example.com", "password": "..."}'

# 2. Создать ключ
curl -X POST https://yougile.com/api-v2/auth/keys \
  -H 'Content-Type: application/json' \
  -d '{"login": "you@example.com", "password": "...", "companyId": "<id компании>"}'
```

</details>

> 🔒 Ключ даёт те же права, что и ваш аккаунт. Не публикуйте его. У ключа нет срока действия, удалить его можно через `DELETE /api-v2/auth/keys/{key}`. На аккаунт можно создать до 30 ключей.

## ⚙️ Настройки

| Поле | Зачем |
| --- | --- |
| Ключ API | Обязательно. По нему плагин понимает, кто вы, и находит ваши задачи. |
| Адрес YouGile | Если пусто, используется `https://yougile.com`. |
| Шаблон ссылки на задачу | Куда ведёт ссылка из карточки. Подстановки: `{host}`, `{id}`, `{idTaskCommon}`, `{idTaskProject}`. |
| Записывать время при завершении | Показывает окно, которое добавляет затреканное время в YouGile. |

## ⚠️ Ограничения

- 🕐 **Опрос, а не мгновенные события.** Изменения из YouGile приходят раз в 3 минуты и только пока Super Productivity открыт. Изменения из Super Productivity уходят сразу.
- 🚦 **Лимит YouGile: 50 запросов в минуту на компанию.** Плагин тратит один запрос на всю пачку ваших задач, но лимит общий для всех интеграций компании.
- 👥 **Затраченное время — одно число на задачу.** В YouGile оно не делится по сотрудникам, поэтому SuperGile прибавляет ваше время к общему.
- 🧩 **Подзадачи и чек-листы** пока не синхронизируются: чек-листы только видны в карточке.
- 🔗 **Ссылка на задачу** по умолчанию открывает YouGile, а не конкретную задачу. Формат прямой ссылки настраивается шаблоном.
- 🔐 **Ключ хранится в настройках провайдера** Super Productivity. Если вы пользуетесь синхронизацией Super Productivity, он уйдёт вместе с остальными настройками.

## 🛠️ Разработка

```bash
npm install
npm test           # тесты (vitest)
npm run typecheck  # проверка типов
npm run build      # сборка в dist/
npm run package    # сборка + zip в release/
```

Готовый zip из `release/` можно сразу загрузить в Super Productivity.

### Как устроен код

```
src/
├── plugin.ts            # точка входа: регистрирует провайдер
├── manifest.json        # описание плагина для Super Productivity
├── i18n/                # тексты на английском и русском
├── provider/
│   ├── config.ts        # форма настроек
│   ├── mapping.ts       # YouGile ↔ Super Productivity: поля и преобразования
│   └── definition.ts    # сам issue provider: импорт, обновление, учёт времени
├── yougile/
│   ├── client.ts        # клиент YouGile REST API v2
│   └── types.ts         # типы API
└── utils/               # время, даты, HTML ↔ Markdown
vendor/plugin-api/       # типы Plugin API Super Productivity (MIT)
scripts/                 # сборка и получение ключа API
```

### 🌿 Ветки и релизы

- Каждая фича делается в отдельной ветке `feature/...` и сливается в `main`.
- На каждый push и pull request GitHub Actions проверяет типы, гоняет тесты и собирает zip (его можно скачать из артефактов запуска).
- Релиз: поднимите `version` в `package.json`, закоммитьте и поставьте тег:

  ```bash
  git tag v0.2.0
  git push origin v0.2.0
  ```

  Workflow **Release** соберёт плагин и опубликует GitHub Release с zip-файлом.
- Или без тега: **Actions → Release → Run workflow**. Тег `v<версия из package.json>` поставится сам.

## 📚 Полезные ссылки

- [YouGile REST API v2](https://yougile.com/api-v2#/)
- [Разработка плагинов Super Productivity](https://github.com/johannesjo/super-productivity/blob/master/docs/plugin-development.md)

## 📄 Лицензия

[MIT](LICENSE)
