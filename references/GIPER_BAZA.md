# Giper Baza

Локальная CRDT-база в браузере, синкается с мастером и другими пирами сама. Сущности это классы над `$giper_baza_dict`, поля это поуны.

## Понятия

- **Glob** статический: `this.$.$giper_baza_glob`. `home()` данные домашнего ленда, `land_grab( preset )` новый ленд, `Land( link )` ленд по ссылке.
- **Land** автономный раздел со своими правами, синкается отдельно. `land.Data( Type )` корневой поун типа, `land.Pawn( Type ).Head( link )` конкретный.
- **Auth** приватный ключ, **Pass** публичный, **Lord** id пользователя (хеш от Pass). `this.$.$giper_baza_auth.current().pass()`.
- **Ранги**: `$giper_baza_rank_deny`, `_read`, `_post( rate )`, `_pull( rate )`, `_rule`. `rate`: `just` без PoW, `fast`, `slow` полсекунды, `long` секунда, `late` дни.
- **Пресет** `[[ pass | null, rank ]][]`. `null` это все.

## Схема

```ts
namespace $ {
	export class $bog_todo_task extends $giper_baza_dict.with({
		Title: $giper_baza_atom_text,
		Done: $giper_baza_atom_bool,
		Order: $giper_baza_atom_real,
		Due: $giper_baza_atom_time,
		Tags: $giper_baza_list_str,
		Image: $giper_baza_atom_link_to( ()=> $giper_baza_file ),
	}) {}

	export class $bog_todo_store extends $giper_baza_dict.with({
		Tasks: $giper_baza_list_link_to( ()=> $bog_todo_task ),
		Settings: $giper_baza_dict_to( $giper_baza_atom_text ),
	}) {}
}
```

Атомы: `atom_text`, `atom_bool`, `atom_real`, `atom_time`, `atom_dura`, `atom_span`, `atom_blob`, `atom_link`, `atom_link_to( ()=> T )`, `atom_tree`, `atom_dict`, `atom_list`. Коллекции: `list_str`, `list_link_to( ()=> T )`, `dict`, `dict_to( T )`.

- **Схема чистая.** Никаких `@ $mol_mem`, `@ $mol_action`, static-методов на сущности. CRUD живёт в виде. Статические экшены на сущности теряют эффекты под нагрузкой: синкается один трек из тридцати.
- **`atom_bint` не переживает круг**: `val( 4200n )` записывается, читается `null`. Целые в `atom_real`.
- `$giper_baza_entity` даёт `Title` и `title()` с `@ $mol_mem`, который протухает после записи. Своё `Title: $giper_baza_atom_text` на `$giper_baza_dict.with`.

## Чтение и запись из вида

```ts
namespace $.$$ {
	export class $bog_todo_app extends $.$bog_todo_app {

		store() {
			return this.$.$giper_baza_glob.home().land().Data( $bog_todo_store )
		}

		tasks() {
			return this.store().Tasks()?.remote_list() ?? []
		}

		@ $mol_mem_key
		task_title( link: string, next?: string ) {
			return this.task( link ).Title( next )?.val( next ) ?? ''
		}

		@ $mol_action
		task_add() {
			const task = this.store().Tasks( 'auto' )!.make( null )
			task.Title( 'auto' )!.val( this.title_new() )
			this.title_new( '' )
		}

		@ $mol_action
		task_drop( link: string ) {
			this.store().Tasks( 'auto' )!.cut( this.task( link ).link() )
		}

	}
}
```

- Чтение: `Field()?.val()`. Запись: `Field( 'auto' )!.val( next )` или `Field( null )!`, `auto` создаёт поун при отсутствии.
- Списки: `items()`, `remote_list()`, `add`, `cut`, `move`, `wipe( index )`, `splice`, `make( preset | null )`. `make( null )` кладёт в тот же ленд, `make( preset )` заводит отдельный ленд с правами.
- Словари: `dive( key, Type, auto )`, `keys()`, `has( key, false )` удаляет. У `dict_to`: `key( k, auto )`.
- Ссылка на файл: `Field( 'auto' )!.ensure( null )` вернёт стор, записать в него, потом обязательно `Field( 'auto' )!.remote( store )`. Без `remote` ссылка не синкается.
- Физического удаления нет, база append-only. Удалять ссылку из списка или ставить флаг.

## `@ $mol_mem` и объекты Базы

- **Методы, возвращающие land, pawn, list, без `@ $mol_mem`.** Иначе деструктор → `Circular subscription`. Кэш уже есть внутри `glob.Land()`.
- **Аксессор к атому без `@ $mol_mem`.** `foo( next ) { return this.Foo( next )?.val( next ) ?? '' }` с декоратором протухает после первой записи: запись замораживает зависимости, чужой юнит ячейку не будит. Ровно так протухает узел, который правил ты сам, при со-редактировании. `val()` внутри и так ячейка.
- `@ $mol_mem` на вычисляемых значениях: отфильтрованный список, сумма, флаг.
- Держать home-ленд живым при смене экрана: читать `this.store()` в `auto()` корня.

## Синк и права

- `land.sync()` не нужен, синк запускает чтение данных. Но `pass_rank()`/`lord_rank()` ленд не тянут и на холоде отдают `rank_read`. Экран «нет прав, не рендерю» зависает навсегда. Прочитать любое поле до проверки ранга.
- Отдельные ленды через `ensure( preset )` не подтягиваются сами: обёртка над `atom_link_to` с `land().sync()` в `remote()` на чтении, в схеме, не в виде.
- **Пресет с `null` = незашифрованный ленд.** Что пишет аноним, читают все, кто знает ссылку. Приватность = писать может только тот, кому выдан гифт.
- `land.give( pass, rank )` выдаёт права, `land.encrypted( true )` включает шифрование, `land.units_saving()` подписывает юниты. Без `units_saving()` после `land_grab` в консоли другие получат ранг 16.
- Доверие по автору: открытый ленд `[[ null, rank_post( 'fast' ) ]]`, читатель фильтрует `atom.units_of( null )` по `unit.lord()`, а не берёт `val()`. Увольнение по `unit.time()`, не удалением из списка.
- Модуль-библиотека мастеров не трогает. Прибить мастера имеет право только приложение в своём entry `.view.ts`:

  ```ts
  $giper_baza_yard.masters_default.length = 0
  $giper_baza_yard.masters = (): string[] => [ 'wss://my.master/' ]
  ```

  Пустой массив выключает синк.

## Фибры

- **Новый ленд, блоб, крипта только в фибре.** `ensure` бросает промис на PoW. Из async-функции вызов перезапускается с нуля и каждый раз заводит новый PoW: лог повторяет одну строку без прогресса. Писать обычным sync-методом и звать `await $mol_wire_async( this ).save( args )`. `@ $mol_action` тут не подходит: он открывает свою фибру на каждый вызов, и кэш PoW не работает.
- Всё, что должно лечь в одну фибру (grab, сущности, pack), в один метод и одну обёртку.
- Загрузка `.baza` из файла: `@ $mol_mem baza_ready()`, который читает `$mol_file.buffer()`, `$mol_wire_sync( $giper_baza_pack ).from( buf )`, `glob.apply_pack( pack )` и возвращает `true`. Ячейка ретраит промисы. `@ $mol_action boot()` не ретраит и молча проваливается.
- Авторегистрация: `@ $mol_mem` в `auto()`, который проверяет условия и делает идемпотентную запись. Не в клик.
- В обработчике подвисающие чтения первыми, мутации после.

## Консоль браузера

Из консоли нет фибры, `land_grab` падает с `Promise`. Оборачивать:

```js
;( async ()=> {
	const king = await $giper_baza_auth.generate()
	$giper_baza_auth.embryos.push( king.toString() + king.toStringPrivate() )
	const land = await $mol_wire_async( $giper_baza_glob ).land_grab([[ null, $giper_baza_rank_post( 'slow' ) ]])
	await $mol_wire_async( land ).units_saving()
	const pack = $giper_baza_pack.make( land.diff_parts() )
	const a = document.createElement( 'a' )
	a.href = URL.createObjectURL( pack.toBlob() )
	a.download = 'seed.baza'
	a.click()
	alert( land.link().str )
})()
```

Файл `.baza` кладётся в модуль и едет в бандл сам.

## Изоляция

Yard один на страницу, отдельного мастера на ленд не бывает. Два приложения на одном origin делят IndexedDB. Мастера между собой не реплицируются: перенос лендов делает клиент, открыв страницу с пином на источник, потом с пином на приёмник.
