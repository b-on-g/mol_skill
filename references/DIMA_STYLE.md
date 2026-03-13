# Стиль кода Димы (hyoo-ru)

> Выведено из анализа реальных приложений: todomvc, talks, budget, password, game, survey, crus

---

## 1. view.tree — максимум декларативности

### Параметризованные компоненты через `*`

Каждый повторяющийся элемент — это `Component*` в дереве. Данные привязываются через `<=` к методам родителя:

```tree
<= Board $mol_list
	rows <= board_rows /
		<= Row* $bog_leaderboard_row
			place <= row_place* \
			name <= row_name* \
			score <= row_score* \
```

В .ts — маппинг ключей:
```ts
board_rows() {
	return this.board_keys().map( key => this.Row( key ) )
}

@$mol_mem_key
row_place( key: string ) {
	return `#${ this.board_keys().indexOf( key ) + 1 }`
}
```

**Никогда** не используется `.make({})` с замыканиями — это обход реактивности $mol.

### Делегирование свойств через `=>`

Если компонент получает доменный объект, его свойства пробрасываются прямо в дереве:

```tree
$hyoo_budget_transfer_row $mol_view
	transfer $hyoo_budget_transfer
		amount? => amount?
		description? => description?
		can_change => editable
```

Если всё описано в дереве — .view.ts файл **не нужен вообще**.

### Условные элементы — через методы, возвращающие массивы

```tree
body <= fields /
```

```ts
fields() {
	return [
		this.Master_block(),
		this.Context_block(),
		... this.ready() ? [ this.Password_block() ] : [ this.Hint() ],
	]
}
```

### Навигация — `arg *` для ссылок

```tree
<= Filter_all $mol_link
	arg * completed null

<= Settings_link $mol_link
	arg *
		settings \
```

Чтение параметров — `$mol_state_arg.value()` в .ts:
```ts
chat_id_current() {
	return this.$.$mol_state_arg.value( 'chat' ) ?? ''
}
```

---

## 2. view.ts — тонкий слой бизнес-логики

### Что попадает в .ts

- Фильтрация и сортировка списков
- Преобразование доменных моделей в ID-шки
- Навигация (`pages()`)
- Мутации (add, delete, send)
- Вычисляемые свойства для биндингов из дерева

### Что НЕ попадает в .ts

- Создание компонентов (делает дерево)
- Layout и визуальная структура (делает дерево)
- То, что можно выразить биндингами `<=` / `=>`

### Методы маленькие и плоские

3–10 строк, без глубокой вложенности:

```ts
@ $mol_mem
links() {
	return this.User().chats()
		.filter( $mol_match_text( this.links_query(), chat => [ chat.title() ] ) )
		.map( chat => this.Chat_link( chat.id ) )
		.reverse()
}
```

### `@$mol_mem_key` для данных параметризованных компонентов

Каждое свойство `row_*` — отдельный `@$mol_mem_key`. $mol кеширует, отслеживает зависимости, точечно обновляет:

```ts
@$mol_mem_key
task_completed( id: number, next?: boolean ) {
	return this.task( id, next === undefined
		? undefined
		: { ... this.task( id ), completed: next }
	)!.completed ?? false
}
```

### Навигация через `pages()`

Master-detail паттерн с `$mol_book2`:

```ts
pages() {
	return [
		... roster ? [ this.Roster() ] : [],
		... chat ? [ this.Chat_page( chat ) ] : [],
		... this.settings_opened() ? [ this.Settings() ] : [],
	]
}
```

---

## 3. view.css.ts — минимум стилей

### Принцип: стилизуй только отклонения от дефолтов

`$mol_view` уже `display: flex`. Тема задаёт шрифты, цвета, отступы. Писать нужно **только** то, что отличается.

### Хороший стиль

```ts
$mol_style_define( $hyoo_budget_app, {
	'--mol_theme_hue': `500deg`,
	Menu: {
		flex: { basis: `20rem` },
	},
} )
```

3 строки. Всё остальное — тема.

### Используй токены $mol

- `$mol_gap.block` — стандартный отступ блока
- `$mol_gap.round` — стандартный border-radius
- `$mol_theme.card` — цвет карточки
- `$mol_theme.shade` — приглушённый цвет текста

```ts
$mol_style_define( $hyoo_password, {
	padding: $mol_gap.block,
	Page: {
		background: { color: $mol_theme.card },
		border: { radius: $mol_gap.round },
		box: { shadow: [[ 0, 0, $mol_gap.block, 0, $mol_style_func.hsla( 0, 0, 0, 0.2 ) ]] },
	},
} )
```

### Типизированные единицы

```ts
const { rem, px, per } = $mol_style_unit

flex: { basis: rem(50) },
width: rem(12),
```

### Стилизация по атрибутам

```ts
'@': {
	hyoo_talks_embed: {
		'true': {
			background: { color: 'transparent' },
		},
	},
},
```

### Чего НЕ делать

- `display: 'flex'` — уже есть в $mol_view
- `gap: '.5rem'` — тема задаёт
- `font: { size: '1.25rem' }` — тема задаёт
- `padding: { top: '.5rem', bottom: '.5rem', left: '1rem', right: '1rem' }` → лучше `$mol_gap.block`

---

## 4. Архитектурные паттерны

### Доменная модель отдельно от представления

В серьёзных приложениях (talks, budget, survey) модели живут в отдельных файлах:

```ts
// talks/domain/domain.ts
class $hyoo_talks_domain { ... }

// talks/talk.view.ts
domain() {
	return this.$.$hyoo_talks_domain
}
chat( id ) {
	return this.domain().Chat( id )
}
```

View работает с доменными объектами, не с сырыми данными.

### `$mol_book2_catalog` для master-detail

Budget и survey используют `$mol_book2_catalog` — встроенный master-detail с роутингом:

```tree
$hyoo_budget_app $mol_book2_catalog
	param \fund
	menu_title @ \Funds
	Spread* <= Fund_page* $hyoo_budget_fund_book
		fund <= fund* $hyoo_budget_fund
```

```ts
spread_ids() {
	return this.person().fund_list().map( f => f.ref().description! ).reverse()
}
```

### `auto()` для фоновых задач

```ts
auto() {
	this.speech_to_text()
	this.autoscroll()
	this.update_last_seen_message()
}
```

`auto()` вызывается $mol автоматически при рендере. Здесь запускаются побочные эффекты.

### Контекст через `this.$`

Все глобальные сервисы доступны через `this.$`:

```ts
this.$.$mol_state_arg.value( 'chat' )
this.$.$mol_state_local.value( 'master', next )
this.$.$hyoo_crus_glob.home( $hyoo_budget_person )
```

Это не синглтоны — это DI через контекст, что позволяет тестировать и изолировать.

---

## 5. Форматирование кода

- Пробелы внутри скобок: `this.task( id )`, а не `this.task(id)`
- Пробел перед `?`: `next? : boolean`, `value? <=> my_score? 0`
- Табы для отступов
- Пустая строка между методами
- `@ $mol_mem` с пробелом (в .ts допускается и `@$mol_mem`)
- Без лишних комментариев — код самодокументируемый
- `void 0` вместо `undefined` в сравнениях (todomvc стиль, но не обязательно)
