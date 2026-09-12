# Тесты

Вид в $mol это функция состояния, поэтому сценарий пользователя пишется через методы вида: `app.task_title_new( 'Milk' )`, `app.task_add()`, ассерт на `app.tasks_left()`. Без селекторов, без браузера, без Playwright и Cypress, без ожиданий. Прогон в node идёт миллисекунды на тест, CI гоняет из коробки. Всё, что вид зовёт как `this.$.X`, в тесте подменяется через контекст, поэтому сеть, хранилища и таймеры замокать это две строки.

Файл `<имя>.test.ts` рядом с модулем. Попадает в `<модуль>/-/node.test.js` и `test.html`. CI (`hyoo-ru/mam_build`) гоняет node-тесты и валит сборку при падении.

```bash
node bog/myapp/app/-/node.test.js
```

Тысяча тестов идёт около минуты. Тишина полторы минуты ещё не зависание.

## Два уровня

**Сценарий пользователя.** Через методы вида, обязателен на каждую фичу.

**Геометрия и стили.** Ровно ли стоят блоки, не вылезло ли за экран. В node этого нет, нужен браузер: `test.html` плюс замер через CDP, или запись сессии `$bog_rec`. Делается для вёрстки, которую правили.

Тесты, проверяющие один метод модели, полезны, но не заменяют первого уровня: выпавший override даёт зелёные тесты модели и пустой экран.

## Сценарий через методы вида

```ts
namespace $ {
	$mol_test({

		'add task and complete it'( $ ) {
			const app = $bog_todo_app.make({ $ })

			app.task_title_new( 'Milk' )
			app.task_add()
			$mol_assert_equal( app.task_ids().length, 1 )

			app.Task_complete( app.task_ids()[0] ).checked( true )
			$mol_assert_equal( app.tasks_left(), 0 )
			$mol_assert_equal( app.Rows().rows().length, 1 )
		},

	})
}
```

- `namespace $`, не `$.$$`. Контекст `$` из аргумента, приложение через `Klass.make({ $ })`.
- Клик это вызов обработчика: `app.Submit().click( event )` или напрямую `app.submit()`.
- Проверять то, что видит пользователь: `pages()`, `rows()`, `sub()`, `title()` под-видов. Модель проверяется через экран.
- Ассерты: `$mol_assert_equal`, `$mol_assert_like` (глубокое), `$mol_assert_ok`, `$mol_assert_not`, `$mol_assert_fail( ()=> ..., 'message' )`.
- Без комментариев. Имя теста и есть описание.

## Через DOM

В node-бандле `$mol_dom_context` это jsdom, вид рендерится в настоящий DOM:

```ts
const app = $bog_myapp_app.make({ $ })
$.$mol_dom_context.document.body.appendChild( app.dom_node() )
app.dom_tree()
$mol_assert_equal( app.dom_node().querySelectorAll( '[bog_myapp_row]' ).length, 3 )
app.destructor()
```

Три браузерные глобали в node отсутствуют и роняют любое поле ввода и жест: перед тестом подставить `ShadowRoot` и `PointerEvent` из окна jsdom, добавить пустые `setPointerCapture`/`releasePointerCapture` элементам.

Прокликивание без селекторов: `$bog_rec_fuzz.run({ root: app, steps, seed })` обходит `sub_visible()` и дёргает объявленные `event()`. Падение оставляет запись для реплея.

## Моки

Производный контекст делается прототипом. `$mol_test_mocks.push( $ => { ... } )` подменяет сервисы на каждый тест:

```ts
$mol_test_mocks.push( $ => {
	class $mol_state_session_mock< Value > extends $.$mol_state_session< Value > {}
	$.$mol_state_session = $mol_state_session_mock
} )
```

`$mol_test_mocks` общий на весь тестовый бандл: каждый тест получает `Object.create( $$ )` и прогон всех моков подряд, в том числе из чужих модулей. Поэтому там живут только общие подмены без данных, как у самого `mol/`: `$mol_state_local_mock` хранит что дали, `$mol_locale_mock` отдаёт пустой словарь, `fetch` и `XMLHttpRequest` запрещены и бросают `fetch is forbidden in tests`.

Данные под конкретный тест подменяются внутри теста, контекст там уже свой. Вид зовёт `this.$.$mol_fetch.json( uri )`, тест подставляет наследника со статическим `json`:

```ts
'user names come from the response'( $ ) {
	$.$mol_fetch = class extends $.$mol_fetch {
		static override json( input: RequestInfo ) {
			if( String( input ).endsWith( '/users' ) ) return [ { id: 1, name: 'Ann' } ]
			return $mol_fail( new Error( 'network in a test: ' + input ) )
		}
	}
	const app = $my_users.make({ $ })
	$mol_assert_like( app.user_names(), [ 'Ann' ] )
},
```

Именно поэтому сервисы вызываются как `this.$.$mol_fetch`, а не `$mol_fetch`: подмена через `$` достаёт только вызовы `this.$.X`. Глобалы (`setTimeout`, `Date`) подменять на `globalThis`. Таймеры в тестах замоканы, время прокручивается `$mol_after_mock_warp()`.

## Тишина = падение

Упавший `$mol_assert` и зависший тест выглядят одинаково: ни строчки, процесс живёт на хендлах. Сначала проверить, не упал ли ассерт. Лимит на тест 1 секунда.

Негативный контроль обязателен, если прогон не показал `All tests passed`: сломать ассерт, убедиться, что падение видно. Не удалось прогнать, так и написать.

`test.html` монтирует приложение, отчёт одной строкой в консоли. После прогона `$mol_state_arg` оставляет ключи в URL страницы: финальный тест `$.$mol_state_arg.dict({})`.

## Async-хвосты

Тест закончился, `$` уничтожен, а через секунду в консоли `Not translated to ru: $key` или другой warn. Это голый `setTimeout` из вида, доживший до мёртвого контекста.

- В виде `new this.$.$mol_after_timeout( ms, cb )`, он отменяется с `$`.
- `grep -n 'setTimeout\|setInterval\|requestAnimationFrame' *.view.ts` перед тестированием.
- Метод, для которого нужно ждать таймер, не юнит. Проверять непосредственные поля, цепочку гонять через реплей.
- `@`-строки в юнит-тесте не читать: локаль в свежем `$` прогревается заново. Ассертить структуру.
- `$mol_locale.lang()` в тестах не переключать.
- `console.warn` не глушить.

## Giper Baza в тестах

- `remote_list()` запрещён: резолвит через статический `glob.Land`, который ждёт мастера. Читать `land.Pawn( $my_message ).Head( link.head() )` по `items()`.
- Крипта, `give()`, `encrypted( true )` только в фибре: объект ops с sync-методами и `await $mol_wire_async( ops ).step()` на шаг.
- Auth замокан, `await $.$giper_baza_auth.generate()` быстрый.
- Два юзера: две `$giper_baza_land.make({ $, link: ()=> land0.link(), auth: ()=> authX })` и `await $mol_wire_async( copy ).units_steal( source )`, образец `giper/baza/land/land.test.ts`.
