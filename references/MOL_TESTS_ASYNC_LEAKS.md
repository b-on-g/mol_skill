# $mol_test — как не поймать `Not translated to X` и другие phantom-варнинги от async-хвостов

Когда пригодится: пишешь unit-тесты через `$mol_test`, всё формально проходит, но в консоли (браузерном логе `test.html` или в node) хвостом падают `Not translated to "ru": $module_key_text` (или другие wire-warn'ы) — уже ПОСЛЕ окончания теста. Ключи задекларированы через `@` в view.tree, локали содержат переводы, в живом приложении такого нет.

Если задача не про написание $mol_test — не грузи этот файл.

## Симптомы

- `console.warn`-ы про `Not translated to <lang>: $key` появляются между отчётами о прохождении тестов
- Ключ есть и в `<module>.view.tree` (`@`-декларация), и в `.locale=<lang>.json`
- Merged `<app>/-/web.locale=<lang>.json` тоже содержит ключ с корректным значением
- В браузере через `fetch('/.../web.locale=ru.json')` и `$mol_locale.texts('ru')[key]` — оба возвращают правильный перевод
- При этом при запуске тестов warn'ы стреляют

## Корневая причина

**Голый `setTimeout` / `setInterval` / `requestAnimationFrame` живёт вне жизненного цикла `$` и wire.**

Стандартный flow `$mol_test`:
1. Создаёт свежий `$` контекст (isolated) для каждого теста
2. Синхронно выполняет тело теста
3. По окончанию — уничтожает контекст, все `@$mol_mem`-fibers destroy'ятся, wire subscriptions обрубаются

Когда view-метод внутри теста делает `setTimeout(cb, ms)`, callback ставится в event-loop **браузера**, wire про него не знает. Тест завершается, `$` умирает, а через `ms` таймер срабатывает и callback выполняется уже в **мёртвом контексте**:

- Любой `.text()` внутри → `$mol_locale.text(key)` → `texts(lang)` — mem invalidated в мёртвом `$`, wire пытается пере-фетчить JSON
- В `$mol_locale.texts`-catch ловится уже-catched promise, `$mol_fail_catch` возвращает `false`, функция падает в `return {}` (fallback пустой dict)
- `text()` получает пустой dict, `target = undefined` → `console.warn('Not translated to ' + lang + ': ' + key)`

## Реальный кейс (raggu/web)

`gallery.start_upload('document')` шедулит цепочку `Upload.start → setTimeout(tick(1), 600) → tick(n) → setTimeout(tick(n+1))` (6 итераций) → на последнем шаге `complete()` → `gallery.upload_complete()` → внутри читает 3 `@`-локализованные строки (`uploaded_document_title`, `uploaded_domain`, `uploaded_desc`).

Тесты `gallery.start_upload: ...` и `gallery.upload.start: small file → no error` завершались за миллисекунды, а через ~4 секунды таймерная цепочка догоняла уже-destroy'нутый `$` и выдавала 3 warn'а на воздух.

## Правила чтобы не наступать

### 1. Проверяй view.ts на голый `setTimeout` / `setInterval` перед тем как тестировать

Grep:
```bash
grep -n "setTimeout\|setInterval\|requestAnimationFrame" module.view.ts
```

Если находишь — прикинь: методы, которые ты вызываешь из теста, попадают ли в эту async-цепочку. Если да — либо не тестируй этот путь unit-тестом, либо мокай таймеры.

### 2. В view.ts используй `$mol_after_timeout` / `$mol_after_frame` вместо голых таймеров

`$mol_after_timeout` — wire-aware. При destroy контекста таймер отменяется, callback не срабатывает.

```ts
// ❌ Плохо — течёт мимо жизненного цикла $
setTimeout( () => this.tick( n + 1 ), 600 )

// ✅ Хорошо — привязан к $, destroy отменяет
new this.$.$mol_after_timeout( 600, () => this.tick( n + 1 ) )
```

Тогда `$mol_test`, уничтожая контекст, автоматически отменит все pending-таймеры, и async-хвостов не будет.

### 3. Не тестируй unit-тестом методы, которые запускают async-цепочку

`start_upload` синхронно ставит state и запускает 6-шаговую последовательность — это по сути e2e-сценарий, а не unit. Юнит-тесту достаточно проверить, что вызов **не падает** и меняет непосредственные поля (`upload_kind`, `upload_showed`). Всё остальное — интеграционным браузерным сценарием с `await sleep(...)`.

Правило-шпаргалка: если для полного проигрывания метода нужно ждать таймер — этот тест не unit.

### 4. Для локализации: тест не должен обращаться к `@`-строкам в свежем $

Каждый `$mol_test`-тест создаёт свой `$`, и `$mol_locale`-mem-cache для нового контекста нужно снова прогревать через wire fetch. В transient-моменте retry-цикла texts может отдать `{}` → warn. Обходится минимизацией: не читай `@`-строки в unit-тестах, ассерть на структурные вещи (`length`, `role`, `instanceof`).

Если нужно проверить, что строка непустая — делай это интеграционным browser-only тестом, где локаль уже прогрета.

### 5. Тесты в браузере (`test.html`) полируют боевую URL

`$mol_state_arg` — статический класс, `.value(k, v)` пишет в реальный URL страницы. После прогона тестов юзер видит `?ds=law&mock=1`. Для устранения — либо оборачивай в try/finally save/restore, либо добавь финальный cleanup-тест `zz cleanup: reset URL` вроде `$.$mol_state_arg.dict({})` (см. `MOL_URL_STATE_LEAKS.md`).

Аналогично для `$mol_locale.lang(...)` — не переключай язык в тестах, потому что `warn`-mem инвалидируется на смене lang и пере-стреляет для всех уже-catched key'ев.

## Диагностика когда warn'ы всё-таки есть

1. **Проверь, что ключ реально в merged bundle:**
   ```bash
   grep <key> <app-module>/-/web.locale=<lang>.json
   ```
   Если нет — это не наша проблема, добавь `@` в view.tree или перевод в `.locale=<lang>.json`.

2. **Проверь в браузере через console:**
   ```js
   console.log('lang:', $mol_locale.lang())
   console.log('has:', $mol_locale.texts($mol_locale.lang())[key])
   ```
   Если `has` возвращает перевод — значит warn прилетел из **прошлого** момента (стал транзиентным).

3. **Смотри stack trace warn'а.** В devtools раскрой строчку — если видишь `setTimeout` внутри стека → таймер докрутился уже после теста. Это описанный выше кейс.

4. **Найди тест, который стартует цепочку.** По stack'у: `(anonymous) @ module.view.ts:97 → setTimeout → ... → (anonymous) @ app.test.ts:152`. Строка `app.test.ts:152` — тот самый тест.

5. **Решение:** либо убери проблемный тест (не unit-scope), либо в view.ts переведи `setTimeout` на `$mol_after_timeout`.

## Как НЕ надо

- ❌ `warn`-suppress через override `console.warn` — теряешь настоящие ошибки локализации в проде
- ❌ Добавлять локальный `<module>.locale=en.json` вручную для ключей, которые уже задекларированы через `@` в view.tree — auto-gen перезапишет / получишь дубли
- ❌ Переключать `$mol_locale.lang(...)` внутри тестов ради "проверки локали" — вызывает cascade re-warn'ов даже для валидных ключей
- ❌ Оставлять голый `setTimeout` в view.ts там где нужен wire-aware таймер — источник phantom-багов в тестах и в проде (memory leak на destroy'ed компонентах)
