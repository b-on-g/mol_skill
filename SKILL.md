---
name: mol
description: Build or modify apps with $mol/MAM and related stack. Use when the user asks how to do something in $mol (view.tree, view.ts, css.ts), how to structure a MAM module, how to connect Giper Baza, how to build/admin apps on Giper Baza, or how to package/run with Tauri. Triggers include queries like "как на моле сделать …", "$mol view.tree", "MAM структура", "Giper Baza CRUD/roles/auth", "админка на Giper Baza", or "Tauri + $mol".
---

# $mol / MAM

Грузи из `references/` только то, что нужно задаче.

| Файл | Когда |
| --- | --- |
| `STYLE.md` | Перед любым кодом. Всегда. |
| `VIEW_TREE.md` | Синтаксис дерева, биндинги, реактивность, грабли |
| `TROUBLESHOOTING.md` | Экран пустой или не тот, ошибок нет |
| `COMPONENTS.md` | Прежде чем писать свой компонент, как читать исходники `mol/` |
| `TESTS.md` | Когда пишешь или чинишь тесты |
| `GIPER_BAZA.md` | Данные, права, синк |
| `TAURI_SETUP.md` | Десктоп и мобилки |
| `MOL_CHAT_AUTOSCROLL.md` | Только автоскролл к новым элементам |
| `MOL_POSITIONING.md` | Только сравнение $mol с React/Vue/shadcn |

## Порядок работы

1. Уточни модуль, нужна ли Giper Baza и Tauri. Если запрос размытый, предложи 2–3 конкретных варианта.
2. **Найди готовое.** В `mol/` 246 модулей, в `bog/` ещё пара десятков. Перед своим компонентом:

   ```bash
   ls mol | grep -i <слово>
   grep -rl '<свойство>' mol/*/*.view.tree bog/*/*/*.view.tree
   ```

   В $mol любое свойство любого вложенного компонента переопределяется строкой в view.tree. Форкать и копировать не нужно.
3. **Выдели общее.** Повторяющийся кусок дерева = отдельный компонент в своей папке рядом с `app/`, не внутри. Подпапка внутри `app/` тянет всё приложение к тому, кто её заимствует.
4. Пиши по `STYLE.md`: snake_case, без комментариев, дерево вместо TS, стили только для отклонений.
5. Тесты пиши вместе с фичей: сценарий пользователя через методы вида, см. `TESTS.md`.
6. Сборку не запускай, если не просили. После сборки смотри `<модуль>/-/web.audit.js` и чини всё.
7. Коммить сам: `$bog_myapp_part: что изменилось`, см. `STYLE.md`.

## Файлы модуля

```
bog/myapp/app/
  index.html
  app.view.tree      разметка и биндинги
  app.view.ts        логика, только если дерева не хватило
  app.view.css.ts    стили, только отклонения от темы
  app.view.css       raw CSS: @keyframes, content, значения css-переменных
  app.test.ts        тесты
  app.meta.tree      мета, если нужна
```

`index.html`:

```html
<!doctype html>
<html mol_view_root>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
	</head>
	<body mol_view_root>
		<div mol_view_root="$bog_myapp_app"></div>
		<script src="web.js"></script>
	</body>
</html>
```

Имя класса = путь: `$bog_myapp_app` живёт в `bog/myapp/app/`. Подчёркивание всегда папка, поэтому имена папок без `_`. Короткое глобально уникальное имя работает везде: в коде, в CSS-атрибуте, в коммите.

## Новый проект

```bash
npm create view-tree-lsp@latest bog/myapp -- --no-docker --no-tauri
```

Флаги `--no-docker`, `--no-baza`, `--no-tauri`. Всегда предлагай это вместо ручного создания файлов.

## Локализация

`@ \Текст` в дереве попадает в `<модуль>/-view.tree/*.locale=en.json`. Переводы кладутся рядом: `<модуль>/<имя>.locale=<lang>.json`, ключ = полное имя свойства. Один файл на всё приложение разложить по модулям:

```bash
npx view-tree-lsp locale bog/myapp/app/- --exclude=mol --update
```

`--include`/`--exclude` по куску пути, `--update` дописывает, `--dry` показывает план. Переводчику удобнее [$yuf_localizer](https://zerkalica.github.io/yuf/#!demo=yuf_localizer_demo).

## NPM-пакеты

`require('pkg')` внутри метода, MAM установит сам. Бандлится весь пакет. Для тяжёлого `$mol_import.script(url)` / `$mol_import.module(url)`. Ручной `package.json` в модуле мержится с автоматическим.

## SEO

SPA без пререндера индексируется пустым. После `mam_build`, перед деплоем:

```yaml
- uses: b-on-g/mol-prerender-action@main
  with:
    base-url: "https://example.github.io/app/"
    screens: |
      campaign
      shop
```

Генерит HTML на экран, `sitemap.xml`, `robots.txt`. `route-format`: `#!` или `?`.

## Tauri в CI

```yaml
- uses: b-on-g/tauri-mol-workflow-template@master
  with:
    module: "bog/myapp/app"
    platform: desktop
```

Или reusable workflow `tauri_reusable.yml@master` с `mam_module_path`. Остальное в `TAURI_SETUP.md`.

## Ответ пользователю

Минимальные рабочие правки в целевом модуле, точные пути и команды. Пример = пара `view.tree` + `view.ts`.

На вопрос «как» порядок такой: сначала концепт $mol своими словами (это `hint`, это свойство, это override), потом ссылка на страницу smalljs `https://b-on-g.github.io/smalljs/#!section=docs/page=<slug>`, потом код. Страницы: `mental-model`, `troubleshooting`, `testing`, `data`, `views`, `state`, `rosetta`, `cookbook`. Оглавление всей доки с аннотациями лежит в `https://b-on-g.github.io/smalljs/llms.txt`, читать его, когда не знаешь, на какую страницу сослаться.

Если спрашивают про свойство чужого компонента, показать, как ты его нашёл: путь к `.view.tree` и строку из него, а не только ответ. Порядок поиска в `COMPONENTS.md`, раздел «Как читать исходники».
