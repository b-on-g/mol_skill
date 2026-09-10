# Стиль кода $mol

Выведено из приложений hyoo-ru: todomvc, talks, budget, password, survey, crus. Читать перед любым кодом.

## Имена

- Классы: `$bog_myapp_part`, путь через `_`. Папки без подчёркиваний.
- Свойства и методы: `snake_case`. `row_title`, `task_completed`, `chat_id_current`. Никакого camelCase.
- Под-компоненты в дереве с Большой буквы: `Row*`, `Title`, `Submit`. Значения с маленькой: `title`, `rows`.
- Свойства с `?` изменяемые: `value?`, `click?`, `checked?`.

## Комментарии

Не пишутся. Ни в дереве, ни в TS, ни в тестах. Код и имена говорят сами. Абзац над методом, объясняющий, зачем он, удаляется вместе с сомнением: если нужно объяснять, переименуй.

Единственное исключение: JSDoc в одну строку для публичного API библиотечного модуля. В TS парсятся только `/** */`, и `$имя` внутри любого комментария тащит модуль в бандл. Пример в комментарии пишется без `$`.

## Коммиты

MAM даёт каждой сущности короткое глобально уникальное имя, им и называется коммит:

```
$bog_myapp_nav: keyboard navigation
$bog_myapp_store: drop atom_bint, keep ints in atom_real
$mol_data_record: support recursion
```

Первая строка: имя модуля, двоеточие, что изменилось. Без «fix», «update», «refactor» в начале. Коммитить и пушить самому, не спрашивая.

## Дерево делает максимум

### Параметризованные компоненты через `*`

Каждый повторяющийся элемент это `Name*`. Данные привязаны к методам родителя:

```tree
<= Board $mol_list
	rows <= board_rows /
		<= Row* $bog_leaderboard_row
			place <= row_place* \
			name <= row_name* \
			score <= row_score* \
```

```ts
board_rows() {
	return this.board_keys().map( key => this.Row( key ) )
}

@ $mol_mem_key
row_place( key: string ) {
	return `#${ this.board_keys().indexOf( key ) + 1 }`
}
```

Никогда `.make({})` с замыканиями внутри вида: это обход реактивности.

### Делегирование `=>`

Если компонент получает доменный объект, его свойства пробрасываются в дереве:

```tree
$hyoo_budget_transfer_row $mol_view
	transfer $hyoo_budget_transfer
		amount? => amount?
		description? => description?
		can_change => editable
```

Если всё описано в дереве, `.view.ts` не нужен.

### Условные элементы через методы-массивы

```tree
body <= fields /
```

```ts
fields() {
	return [
		this.Master_block(),
		... this.ready() ? [ this.Password_block() ] : [ this.Hint() ],
	]
}
```

Убрать компонент в наследнике: `Tools null`.

### Ссылки через `arg *`

```tree
<= Settings_link $mol_link
	arg *
		settings \
		filter null
```

Каждый ключ на отдельной строке. `null` удаляет параметр, `\` оставляет как есть. Чтение: `this.$.$mol_state_arg.value( 'settings' )`.

## `.view.ts` тонкий

Туда попадает: фильтрация и сортировка, доменные объекты в ID, `pages()`, мутации, вычисляемые свойства для биндингов. Туда не попадает: создание компонентов, разметка, всё, что выражается `<=`/`=>`.

Методы 3–10 строк, плоские:

```ts
@ $mol_mem
links() {
	return this.User().chats()
		.filter( $mol_match_text( this.links_query(), chat => [ chat.title() ] ) )
		.map( chat => this.Chat_link( chat.id ) )
		.reverse()
}
```

`@ $mol_mem_key` на каждое `row_*`:

```ts
@ $mol_mem_key
task_completed( id: number, next?: boolean ) {
	return this.task( id, next === undefined
		? undefined
		: { ... this.task( id ), completed: next }
	)!.completed ?? false
}
```

Master-detail через `pages()`:

```ts
pages() {
	return [
		... roster ? [ this.Roster() ] : [],
		... chat ? [ this.Chat_page( chat ) ] : [],
	]
}
```

`auto()` для побочных эффектов при рендере. Глобальные сервисы только через `this.$`: `this.$.$mol_state_arg`, `this.$.$giper_baza_glob`. Это DI, тесты подменяют контекст.

Доменная модель отдельно от вида: `talks/domain/domain.ts`, вид работает с объектами, не с сырыми данными.

## Стили: только отклонения

`$mol_view` уже `display: flex`. Тема задаёт шрифты, цвета, отступы. Пишется только отличие.

```ts
$mol_style_define( $hyoo_budget_app, {
	'--mol_theme_hue': `500deg`,
	Menu: {
		flex: { basis: `20rem` },
	},
} )
```

Не писать: `display: 'flex'`, `gap`, `font.size` там, где тема уже задала, `padding` из четырёх сторон вместо `$mol_gap.block`.

### Токены

`$mol_theme.back/card/text/shade/focus/control/field/current/accent`, `$mol_gap.block/space/round`. Свои токены: `$mol_style_prop( 'bog_myapp', [ 'text_dim', 'accent_soft' ] as const )` в корневом файле пака `bog/myapp/myapp.ts`. В соседнем модуле порядок загрузки не гарантирован, аудит при этом зелёный.

### Формы записи `.view.css.ts`

- `as any` запрещён. Ошибка TS означает неверную форму, не нехватку типа.
- Shorthand в camelCase: `borderRadius`, `minWidth`, `boxSizing`, `whiteSpace`. Но `borderRadius` только строкой, токен идёт в развёрнутую: `border: { radius: $mol_gap.round }`.
- `padding`/`margin` объектом `{ top, right, bottom, left }`, не строкой `'0.5rem 1rem'`.
- Цвета `#rrggbbaa`, не `rgba()`. У `box.shadow` обязателен `spread`.
- `font.weight` числом или `'bold'`. `lineHeight` строкой. Нулевой размер числом: `minWidth: 0`.
- Единицы строкой: `width: '12rem'`. `$mol_style_unit.rem( n )` только когда единицу надо посчитать.
- Под-компоненты только на верхнем уровне объекта: `Title: { ... }`.
- Псевдо через строковые ключи `':hover'`, `'::before'`. Атрибуты через `'@': { my_attr: { true: { ... } } }`.
- Атрибут для стилизации объявляется в `attr *` компонента, с `^` первой строкой, иначе словарь базы заменяется целиком и пропадают `disabled`, `role`, `tabindex`.

### Когда raw `.view.css`

Файл `<имя>.view.css` рядом с модулем сборщик сам оборачивает в `$mol_style_attach`. Это тот же механизм, только читаемый. Туда идёт всё, что типизированный define не выражает:

- `@keyframes`, `@media`, `@font-face`
- `content` у `::before`/`::after`
- значения css-переменных для темы: `[bog_builderui_lights="dark"] { --bog_myapp_text_dim: #d4d4d8 }`
- селекторы на атрибуты хозяина: `html[bog_smalljs_boot="wait"] [bog_smalljs_app] > * { visibility: hidden }`

`$mol_style_attach( 'id', '...' )` в TS только для CSS, который генерится в рантайме из данных. Статическую строку в TS не класть.

Скоупить селектором на свой корень `[bog_myapp]`, чтобы не задеть другие $mol-приложения в том же бандле.

### Тема

Мол-тема ставится плагином на корневой компонент, он вешает атрибут на узел хозяина:

```tree
plugins /
	<= Theme $bog_theme_auto
		theme_light \$mol_theme_calm_light
		theme_dark \$mol_theme_calm_dark
```

Пресеты `bog/builderui` включаются атрибутами корня, значения переменных лежат в `bog/builderui/theme.css`:

```tree
attr *
	^
	bog_builderui_lights <= lights \system
	bog_builderui_base \zinc
	bog_builderui_theme \sky
```

Своя тема: css-переменные в raw `.css` под своим селектором, компоненты читают `var(--...)` через `$mol_style_prop`. Логику темы в TS не тащить, если её умеет CSS.

### Не зеркалить CSS в API

Свойство компонента заслуживает места, только если его нельзя достичь из статического CSS: значение из данных, реактивность, DOM-побочка. `fit`, `repeat`, `position`, `color` как пропсы это код в бандле у каждого потребителя ради того, что `.view.css.ts` уже умеет. Динамику отдавать через css-переменную `--bog_x`, не инлайновым стилем.

## Форматирование

- Пробелы внутри скобок: `this.task( id )`.
- Пробел перед `?`: `next?: string`, `value? <=> my_score? 0`.
- Табы. Пустая строка между методами.
- `@ $mol_mem` с пробелом.
- `undefined`, не `void 0`.
