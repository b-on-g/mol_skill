# Практическое руководство по $mol

> Быстрый старт для разработки приложений на высокоуровневом фреймворке $mol с поддержкой Giper Baza

## Содержание

1. [Запуск проекта](#1-запуск-проекта)
2. [Подключение внешних NPM-пакетов](#2-подключение-внешних-npm-пакетов)
3. [Синтаксис view.tree](#3-синтаксис-viewtree)
4. [Создание приложения с нуля](#4-создание-приложения-с-нуля)
5. [Встроенные компоненты](#5-встроенные-компоненты)
6. [Архитектура проекта](#6-архитектура-проекта)
7. [Ключевые отличия от других технологий](#7-ключевые-отличия)
8. [Best Practices](#8-best-practices)
9. [Интеграция с Giper Baza](#9-интеграция-с-giper-baza)

---

## 1. Запуск проекта

### Установка и первый запуск

```bash
# Клонирование стартового репозитория MAM
git clone https://github.com/hyoo-ru/mam.git ./mam && cd mam

# Установка зависимостей и запуск dev-сервера
npm install && npm start
```

После сборки приложение откроется автоматически (обычно `http://localhost:9080/`). Сборщик MAM отслеживает изменения файлов и автоматически пересобирает бандлы.

### Структура проекта

MAM строит проект по папкам-модулям. Каждый модуль - это отдельная папка:

```
mam/
  my/                    # Ваш namespace
    survey/              # Название проекта
      app/               # Главное приложение
        index.html       # Точка входа
        app.view.tree    # Декларативная верстка
        app.view.ts      # Логика компонента
        app.view.css.ts  # Типизированные стили
        app.meta.tree    # Мета-настройки
      person/            # Модуль "Персона"
        person.ts        # Модель данных
      meet/              # Модуль "Встреча"
        meet.ts
```

**Важно:**

- `index.html` должен лежать внутри модуля (не в корне namespace)
- MAM автоматически генерирует `package.json` если его нет
- Имена файлов определяют их назначение:
    - `*.node.ts` - серверный код
    - `*.web.ts` - браузерный код
    - `*.test.ts` - тесты

> **КРИТИЧНО: Подчёркивания = разделители папок!**
>
> MAM резолвит зависимости по именам классов `$a_b_c` → ищет папку `/a/b/c/`.
> Каждое `_` в имени класса означает вложенную папку.
>
> **Правильно:**
> ```
> my/app/attack/timer/     → $my_app_attack_timer
> my/app/game/field/       → $my_app_game_field
> ```
>
> **Неправильно:**
> ```
> my/app/attack_timer/     → MAM ищет /my/app/attack/timer/, не находит!
> my/app/game_field/       → MAM ищет /my/app/game/field/, не находит!
> ```
>
> Имена папок модулей **НЕ МОГУТ** содержать `_`. Если нужно многословное имя — используй вложенные папки.
> Если модуль не попадает в бандл несмотря на то что используется — проверь что структура папок соответствует имени класса.

### Точка входа (index.html)

```html
<!doctype html>
<html mol_view_root>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="mobile-web-app-capable" content="yes" />
	</head>
	<body mol_view_root>
		<div mol_view_root="$my_survey_app"></div>
		<script src="web.js"></script>
	</body>
</html>
```

Атрибут `mol_view_root="$my_survey_app"` автоматически монтирует компонент при загрузке.

---

## 2. Подключение внешних NPM-пакетов

### Метод 1: Прямой require

```typescript
@$mol_mem
todayDate() {
    const moment = require('moment') as typeof import('moment')
    return moment().format('DD.MM.YYYY')
}
```

MAM автоматически установит пакет при первой сборке.

### Метод 2: Динамическая загрузка

Для проблемных пакетов используйте динамическую загрузку:

```typescript
// Загрузка скрипта
await $mol_import.script('https://cdn.example.com/lib.js')

// Загрузка ESM-модуля
const { equals } = await $mol_import.module('https://esm.sh/ramda')
```

### Метод 3: Ручной package.json

Создайте `package.json` в модуле:

```json
{
	"dependencies": {
		"lodash": "^4.17.21"
	}
}
```

MAM объединит его с автоматически сгенерированным.

---

## 3. Синтаксис view.tree

### Основы

в $mol все `view` по умолчанию — `flex` в строку из за этого блоки могут растягиватся и расползаться

`view.tree` - декларативный язык для описания компонентов:

```tree
$my_heroes $mol_view
    sub /
        <= Title $mol_view
        <= Subtitle $mol_view
        <= Rows $mol_list
```

### Специальные символы

- `<=` - односторонняя привязка (свойство берет значение)
- `<=>` - двусторонняя привязка (синхронизация)
- `/` - пустой список
- `*` - словарь
- `@` - локализация
- `\` - сырая строка

### Примеры

#### Односторонняя привязка

```tree
$my_app $mol_page
    title <= app_title @ \My Application
    body /
        <= Content $mol_view
```

#### Двусторонняя привязка

```tree
$my_form $mol_page
    sub /
        <= Name $mol_string
            value? <=> name? \
            hint \Enter your name
```

Здесь `value?` поля ввода синхронизируется с методом `name()` в TS.

#### Списки

```tree
$my_list $mol_list
    rows /
        <= Item* $mol_view
            sub /
                <= item_content* \
```

`*` создает мультисвойство - один компонент на каждый элемент.

#### Условный рендеринг

```tree
$my_page $mol_page
    tools /
        <= ToolButton $mol_button

$my_page_simple $my_page
    ToolButton null
```

Присвоение `null` исключает компонент из рендеринга.

#### Локализация

```tree
<= greeting @ \Hello, World!
```

Текст попадает в файл `web.locale=en.json` и может быть переведен.

---

## 4. Создание приложения с нуля

### Шаг 1: Создание структуры

```bash
cd mam
mkdir -p my/hello
cd my/hello
```

Создайте файлы:

#### index.html

```html
<!doctype html>
<html mol_view_root>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
	</head>
	<body mol_view_root>
		<div mol_view_root="$my_hello"></div>
		<script src="web.js"></script>
	</body>
</html>
```

#### hello.view.tree

```tree
$my_hello $mol_page
    title @ \Greeting App
    body /
        <= Form $mol_form
            form_fields /
                <= Name $mol_string
                    hint @ \Enter your name
                    value? <=> name? \
                <= Message $mol_view
                    sub /
                        <= greeting \
```

#### hello.view.ts

```typescript
namespace $.$$ {
	export class $my_hello extends $.$my_hello {
		@$mol_mem
		greeting() {
			const name = this.name()
			return name ? `Hello, ${name}!` : 'Please enter your name'
		}
	}
}
```

#### hello.view.css.ts

```typescript
namespace $.$$ {
	$mol_style_define($my_hello, {
		Message: {
			padding: $mol_gap.block,
			font: {
				size: '1.5rem',
				weight: 'bold',
			},
			color: $mol_theme.accent,
		},
	})
}
```

### Шаг 2: Запуск

```bash
npm start my/hello
```

Откройте `http://localhost:9080/my/hello/`

### Шаг 3: Добавление тестов

#### hello.test.ts

```typescript
namespace $.$$ {
	$mol_test({
		'Generates greeting for name'() {
			const app = new $my_hello()

			$mol_assert_equal(app.greeting(), 'Please enter your name')

			app.name('Alice')
			$mol_assert_equal(app.greeting(), 'Hello, Alice!')
		},
	})
}
```

Тесты запускаются автоматически при сборке.

---

## 5. Встроенные компоненты

### Кнопки

```tree
<= Submit $mol_button_major
    click? <=> submit?
    sub / <= label @ \Submit

<= Cancel $mol_button_minor
    click? <=> cancel?
    sub / <= cancel_label @ \Cancel
```

### Поля ввода

```tree
<= Email $mol_string
    hint @ \Email
    value? <=> email? \

<= Age $mol_number
    hint @ \Age
    value? <=> age? 0

<= Bio $mol_textarea
    hint @ \Tell about yourself
    value? <=> bio? \
```

### Списки

```tree
$my_items $mol_list
    rows /
        <= Item* $mol_row
            sub /
                <= item_title* \
                <= item_delete* $mol_button
                    click? <=> item_remove*? null
                    sub / <= delete_icon $mol_icon_cross
```

### Страницы и навигация

```tree
$my_app $mol_page
    title @ \My Application
    tools /
        <= Settings $mol_button_minor
            click? <=> show_settings?
            sub / <= settings_icon $mol_icon_settings
    body /
        <= Content $mol_deck
            pages /
                <= Home $my_home_page
                <= Profile $my_profile_page
```

### Формы

```tree
$my_form $mol_form
    form_fields /
        <= Name $mol_string
            value? <=> name? \
        <= Email $mol_string
            value? <=> email? \
        <= Submit $mol_button_major
            click? <=> submit?
            sub / <= submit_label @ \Submit
```

### Выбор (Select)

```tree
<= City $mol_select
    value? <=> selected_city? \
    dictionary *
        moscow @ \Moscow
        spb @ \Saint Petersburg
        nsk @ \Novosibirsk
```

### Чекбоксы и переключатели

```tree
<= Accept $mol_check
    checked? <=> accepted? false
    label @ \I accept terms

<= Theme $mol_switch
    value? <=> dark_mode? false
    label @ \Dark Mode
```

### Календарь

```tree
<= DatePicker $mol_calendar
    value? <=> selected_date? null
```

### Таблицы (виртуальные)

```tree
$my_table $mol_grid
    head_ids /
        \name
        \email
        \age
    row_ids <= user_ids /string
    Cell_content*2*2 <= cell*2*2 \
```

---

## 6. Архитектура проекта

### Паттерн: Модель-Представление

#### Определение модели (person.ts)

```typescript
namespace $ {
	export class $my_person extends $giper_baza_entity.with({
		Email: $giper_baza_atom_text,
		Age: $giper_baza_atom_bint,
		Friends: $giper_baza_list_link_to(() => $my_person),
	}) {
		is_adult() {
			const age = this.Age()?.val()
			return age !== null && age >= 18n
		}
	}
}
```

#### Использование в UI (app.view.ts)

```typescript
namespace $.$$ {
	export class $my_app extends $.$my_app {
		@$mol_mem
		current_user() {
			return this.glob().home().land().Node($my_person).Data()
		}

		@$mol_mem
		user_email() {
			return this.current_user().Email()?.val() ?? ''
		}

		@$mol_action
		user_email(next: string) {
			this.current_user().Email(null)!.val(next)
		}
	}
}
```

### Реактивность

Декораторы для методов:

- `@$mol_mem` - кэшированное свойство (пересчитывается при изменении зависимостей)
- `@$mol_mem_key` - кэшированное свойство с параметром
- `@$mol_action` - действие (модификация состояния)

```typescript
export class $my_counter extends $.$my_counter {
	@$mol_mem
	count() {
		return 0
	}

	@$mol_action
	increment() {
		this.count(this.count() + 1)
	}

	@$mol_mem
	doubled() {
		return this.count() * 2 // Автоматически обновится
	}
}
```

### Композиция компонентов

```tree
$my_user_card $mol_view
    sub /
        <= Avatar $mol_image
            uri <= avatar_url \
        <= Name $mol_view
            sub / <= name \
        <= Email $mol_view
            sub / <= email \

$my_users_list $mol_list
    rows /
        <= User* $my_user_card
            avatar_url <= user_avatar* \
            name <= user_name* \
            email <= user_email* \
```

---

## 7. Ключевые отличия

### $mol vs React/Angular

| Аспект              | $mol           | React          | Angular                  |
| ------------------- | -------------- | -------------- | ------------------------ |
| **Размер бандла**   | ~100KB         | ~300KB+        | ~500KB+                  |
| **Виртуальный DOM** | Нет            | Да             | Нет                      |
| **Реактивность**    | Автоматическая | Ручная (hooks) | RxJS                     |
| **Роутинг**         | Встроен        | Внешний        | Встроен                  |
| **Стили**           | Типизированные | CSS-in-JS      | CSS/SCSS                 |
| **Подход**          | Декларативный  | Функциональный | Объектно-ориентированный |

#### Преимущества $mol:

1. **Автоматическая реактивность**: Не нужны `useState`, `useEffect`, подписки
2. **Ленивость**: Компоненты создаются только при необходимости
3. **Типобезопасность**: Стили и компоненты проверяются TypeScript
4. **Минимализм**: В 3 раза меньше кода чем React+Redux+Router
5. **Нет магии**: Все механизмы открыты и переопределяемы

#### Пример сравнения

**React:**

```tsx
function Counter() {
	const [count, setCount] = useState(0)

	useEffect(() => {
		document.title = `Count: ${count}`
	}, [count])

	return (
		<div>
			<p>Count: {count}</p>
			<button onClick={() => setCount(count + 1)}>+</button>
		</div>
	)
}
```

**$mol:**

```tree
$my_counter $mol_view
    sub /
        <= Count $mol_view
            sub / <= count \
        <= Increment $mol_button
            click? <=> increment?
            sub / <= label \+
```

```typescript
namespace $.$$ {
	export class $my_counter extends $.$my_counter {
		@$mol_mem count() {
			return 0
		}
		@$mol_action increment() {
			this.count(this.count() + 1)
		}
	}
}
```

Заголовок страницы обновится автоматически без `useEffect`.

---

## 8. Best Practices

### Структура модулей

```
my/project/
  app/
    index.html
    app.view.tree
    app.view.ts
    app.view.css.ts
    app.meta.tree
  user/
    user.ts           # Модель
  task/
    task.ts           # Модель
  components/
    header/
      header.view.tree
      header.view.ts
```

### Именование

- **Namespace**: уникальный (`my`, `company`)
- **Модули**: lowercase (`user`, `task`). **Папки модулей НЕ содержат `_`!**
- **Компоненты**: `$namespace_module_component` — каждый `_` = уровень вложенности папок
- **Свойства**: camelCase (`userName`, `taskList`)
- **Резолв зависимостей**: `$foo_bar_baz` → MAM ищет `/foo/bar/baz/`. Подчёркивание всегда = папка.

### Реактивные свойства

```typescript
export class $my_form extends $.$my_form {
	// Геттер + сеттер
	@$mol_mem
	name(next?: string) {
		if (next !== undefined) {
			// Валидация
			if (!next.trim()) throw new Error('Name required')
			// Сохранение
			this.user().Name(null)!.val(next)
		}
		return this.user().Name()?.val() ?? ''
	}
}
```

### Стилизация

Стили **ТОЛЬКО** через `.view.css.ts` с `$mol_style_define`. Без `as any`!

```typescript
$mol_style_define($my_card, {
	display: 'flex',
	flexDirection: 'column',
	gap: $mol_gap.block,
	padding: $mol_gap.block,
	background: {
		color: $mol_theme.card,
	},
	border: {
		radius: $mol_gap.round,
	},

	// Вложенные элементы (суб-компоненты)
	Title: {
		font: {
			size: '1.25rem',
			weight: 'bold',
		},
	},
})
```

#### Правила типизированных стилей — $mol_style_define

**КРИТИЧНО: `as any` ЗАПРЕЩЁН.** Если TypeScript ругается — значит неправильный формат свойства. Ниже правильные паттерны.

##### Shorthand-свойства (camelCase, НЕ вложенные объекты!)

```typescript
// ✅ ПРАВИЛЬНО — camelCase shorthand
borderRadius: '12px',
borderRadius: $mol_gap.round,
minWidth: '15rem',
minHeight: '100vh',
maxWidth: '300px',
maxHeight: '50vh',
boxSizing: 'border-box',
whiteSpace: 'nowrap',
textAlign: 'center',
textOverflow: 'ellipsis',
boxShadow: '0 4px 12px #00000066',
textShadow: '0 1px 2px rgba(0,0,0,0.5)',
gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
userSelect: 'none',
touchAction: 'none',
pointerEvents: 'none',

// ❌ НЕПРАВИЛЬНО — так НЕ работает!
min: { width: '15rem' },          // → используй minWidth
max: { width: '300px' },          // → используй maxWidth
box: { sizing: 'border-box' },    // → используй boxSizing
white: { space: 'nowrap' },       // → используй whiteSpace
text: { align: 'center' },        // → используй textAlign
border: { radius: '12px' },       // → используй borderRadius (без as any!)
```

##### Вложенные объекты — только для сгруппированных CSS-свойств

```typescript
// ✅ Группа font
font: {
	size: '1rem',
	weight: 'bold',
	style: 'italic',
},

// ✅ Группа flex
flex: {
	direction: 'column',
	wrap: 'wrap',
	grow: 1,
	shrink: 0,
	basis: '120px',
},

// ✅ Группа background
background: {
	color: $mol_theme.card,
	image: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
},

// ✅ Группа border (без radius! radius → borderRadius)
border: {
	width: '2px',
	style: 'solid',
	color: '#9e9e9e',
},

// ✅ Группа margin/padding (НЕ shorthand-строки!)
margin: { top: '1rem', bottom: '1rem' },
padding: { top: '0.5rem', bottom: '0.5rem', left: '1rem', right: '1rem' },

// ✅ Группа overflow
overflow: { x: 'hidden', y: 'auto' },

// ✅ Группа justify/align
justify: { content: 'center' },
align: { items: 'center', self: 'center' },

// ✅ Группа text
text: { overflow: 'ellipsis' },

// ✅ Группа animation
animation: {
	name: 'bounce',
	duration: '0.6s',
	timingFunction: 'ease-out',
},

// ✅ Группа aspect
aspect: { ratio: '1' },
```

##### Padding/margin — ЗАПРЕЩЕНЫ shorthand-строки!

```typescript
// ❌ НЕПРАВИЛЬНО — строка-шортхенд не проходит типизацию
padding: '0.5rem 1rem',
padding: '0.25rem 0.75rem',

// ✅ ПРАВИЛЬНО — объект Directions<Length>
padding: '1rem',                    // одинаково со всех сторон — ОК
padding: $mol_gap.block,            // токен — ОК
padding: { top: '0.5rem', bottom: '0.5rem', left: '1rem', right: '1rem' },
```

##### Цвета — ЗАПРЕЩЕНЫ rgba() строки в типизированных позициях!

```typescript
// ❌ НЕПРАВИЛЬНО — rgba() не проходит тип $mol_style_properties_color
background: { color: 'rgba(156,39,176,0.3)' },
color: 'rgba(255,255,255,0.7)',

// ✅ ПРАВИЛЬНО — hex с альфа-каналом
background: { color: '#9c27b04d' },   // rgba(156,39,176,0.3) → #9c27b04d
color: '#ffffffb3',                     // rgba(255,255,255,0.7) → #ffffffb3

// ✅ Тема-токены
background: { color: $mol_theme.card },
color: $mol_theme.text,
color: $mol_theme.shade,
```

> **Конвертация rgba → hex:** `rgba(R,G,B,A)` → `#RRGGBBAA` где AA = Math.round(A * 255).toString(16)

##### box-shadow — обязательно поле spread!

```typescript
// ❌ НЕПРАВИЛЬНО — без spread не пройдёт тип
box: { shadow: [{ x: 0, y: '4px', blur: '12px', color: '#000' }] },

// ✅ ПРАВИЛЬНО — spread обязателен
box: { shadow: [{ x: 0, y: '4px', blur: '12px', spread: 0, color: '#0000004d' }] },
```

##### Суб-компоненты — ТОЛЬКО на верхнем уровне!

```typescript
// ❌ НЕПРАВИЛЬНО — вложенные суб-компоненты внутри других
$mol_style_define($my_widget, {
	Header: {
		Icon: { ... },     // ← НЕ работает! Icon внутри Header
		Level: { ... },    // ← НЕ работает!
	},
})

// ✅ ПРАВИЛЬНО — все суб-компоненты на верхнем уровне
$mol_style_define($my_widget, {
	Header: {
		display: 'flex',
		justify: { content: 'space-between' },
	},
	Icon: {
		font: { size: '1.5rem' },
	},
	Level: {
		font: { size: '0.75rem' },
	},
})
```

##### Стили по CSS-классам и атрибутам

```typescript
// Стили для любого $mol_view внутри компонента
$mol_view: {
	padding: { top: '0.25rem', bottom: '0.25rem', left: 0, right: 0 },
},

// Стили по кастомным атрибутам (@)
'@': {
	my_custom_attr: {
		true: { display: 'flex' },
		false: { display: 'none' },
		some_value: { color: '#ffd700' },
	},
},

// Hover/pseudo — через строковые ключи
':hover': {
	transform: 'scale(1.02)',
},
```

##### Кастомные атрибуты — attr в view.tree

Чтобы использовать кастомный атрибут на компоненте, он ДОЛЖЕН быть объявлен в `attr *` самого компонента:

```tree
- Если нужен кастомный attr на $mol_button_minor:
$my_custom_button $mol_button_minor
	attr *
		^                              - ^ наследует parent attrs (disabled, role, tabindex, title)
		my_custom_state <= active false
```

Без `^` (наследования) пропадут обязательные атрибуты родителя и TypeScript выдаст ошибку.

##### Доступные токены

```typescript
// Тема
$mol_theme.back       // фон страницы
$mol_theme.card       // фон карточки
$mol_theme.text       // основной текст
$mol_theme.shade      // приглушённый текст
$mol_theme.focus      // акцент/фокус
$mol_theme.control    // кнопки/контролы
$mol_theme.field      // поля ввода
$mol_theme.current    // текущий/выделенный
$mol_theme.accent     // акцентный цвет

// Отступы
$mol_gap.block        // стандартный отступ блока
$mol_gap.space        // стандартный gap
$mol_gap.round        // стандартный border-radius
```

### Тестирование

```typescript
$mol_test({
	'User email validation'() {
		const app = new $my_app()

		// Успешная валидация
		app.user_email('test@example.com')
		$mol_assert_equal(app.user_email(), 'test@example.com')

		// Неуспешная валидация
		$mol_assert_fail(() => app.user_email('invalid'), 'Invalid email')
	},

	'Task creation'() {
		const app = new $my_app()
		const before = app.tasks().length

		app.task_add('New task')

		$mol_assert_equal(app.tasks().length, before + 1)
		$mol_assert_equal(app.tasks()[0].Title()?.val(), 'New task')
	},
})
```

### Обработка ошибок

```typescript
export class $my_form extends $.$my_form {
	@$mol_mem
	error() {
		try {
			this.validate()
			return ''
		} catch (error) {
			return String(error)
		}
	}

	validate() {
		if (!this.name()) throw new Error('Name required')
		if (!this.email()) throw new Error('Email required')
	}
}
```

### Асинхронность

```typescript
export class $my_data_loader extends $.$my_data_loader {
	@$mol_mem
	async data() {
		const response = await fetch('/api/data')
		return await response.json()
	}

	// В UI автоматически показывается loader
	// пока промис не разрешится
}
```

---

## 9. Интеграция с Giper Baza

### Краткая справка

**Giper Baza** - распределённая CRDT-база данных с автоматической синхронизацией.

**Основные концепции:**

- **Glob** - глобальная база
- **Land** - раздел с правами
- **Node** - узел данных
- **Atom/List/Dict** - типы данных

### Подключение

```typescript
namespace $.$$ {
	export class $my_app extends $.$my_app {
		@$mol_mem
		glob() {
			return new $giper_baza_glob()
		}

		@$mol_mem
		current_user() {
			return this.glob().home().land().Node($my_user).Data()
		}
	}
}
```

### Пример: Todo приложение

#### Модель задачи

```typescript
namespace $ {
	export class $my_task extends $giper_baza_entity.with({
		Done: $giper_baza_atom_bool,
		CreatedAt: $giper_baza_atom_time,
	}) {
		toggle() {
			const done = this.Done()?.val() ?? false
			this.Done(null)!.val(!done)
		}
	}
}
```

#### UI компонент

```tree
$my_todo_app $mol_page
    title @ \Todo List
    body /
        <= Form $mol_form
            form_fields /
                <= Input $mol_string
                    hint @ \New task
                    value? <=> new_task? \
                    submit? <=> task_add?
        <= List $mol_list
            rows /
                <= Task* $mol_row
                    sub /
                        <= task_check* $mol_check
                            checked? <=> task_done*? false
                        <= task_title* \
                        <= task_delete* $mol_button
                            click? <=> task_remove*?
                            sub / <= delete_icon $mol_icon_cross
```

#### Логика

```typescript
namespace $.$$ {
	export class $my_todo_app extends $.$my_todo_app {
		@$mol_mem
		tasks_list() {
			return this.current_user().Tasks(null)!
		}

		@$mol_mem
		tasks() {
			return this.tasks_list().remote_list()
		}

		@$mol_mem
		task_ids() {
			return this.tasks().map(t => t.link().toString())
		}

		@$mol_mem_key
		task(id: string) {
			return this.tasks().find(t => t.link().toString() === id)!
		}

		@$mol_mem_key
		task_title(id: string) {
			return this.task(id).Title()?.val() ?? ''
		}

		@$mol_mem_key
		task_done(id: string, next?: boolean) {
			const task = this.task(id)
			if (next !== undefined) {
				task.Done(null)!.val(next)
			}
			return task.Done()?.val() ?? false
		}

		@$mol_action
		task_add() {
			const title = this.new_task().trim()
			if (!title) return

			const preset = [[null, $giper_baza_rank_read]]
			const task = this.tasks_list().make(preset)!

			task.Title(null)!.val(title)
			task.Done(null)!.val(false)
			task.CreatedAt(null)!.val(new $mol_time_moment())

			this.new_task('')
		}

		@$mol_action
		task_remove(id: string) {
			const task = this.task(id)
			this.tasks_list().cut(task.link())
		}
	}
}
```

### Синхронизация

Giper Baza автоматически синхронизирует данные между клиентами. Настройка не требуется - изменения реплицируются в реальном времени.

Для деталей см. [GIPER_BAZA_GUIDE.md](./GIPER_BAZA_GUIDE.md)

---

## Отладка и диагностика

### web.audit.js

**ВАЖНО**: При работе с $mol всегда проверяйте файл `-/web.audit.js`:

```bash
# После сборки откройте
open http://localhost:9080/my/app/-/web.audit.js
```

Этот файл содержит диагностическую информацию:

- Предупреждения компилятора
- Неиспользуемые зависимости
- Проблемы с типами
- Рекомендации по оптимизации

**Исправляйте все проблемы из web.audit.js** перед деплоем!

### Отладка в браузере

1. **Source Maps**: MAM генерирует source maps - отладка в исходниках TS
2. **Инспектор элементов**: Все компоненты имеют читаемые имена
3. **Console**: `this.$.$my_app` доступен глобально

### Типичные проблемы

#### Компонент не обновляется

**Причина**: Метод не помечен `@$mol_mem`

**Решение**:

```typescript
// Было
user_name() {
    return this.user().Name()?.val()
}

// Стало
@$mol_mem
user_name() {
    return this.user().Name()?.val()
}
```

#### Circular subscription / зависание / бесконечный цикл

**Ошибка**: `Error: Circular subscription` из `$mol_wire_pub_sub.promote()`, или браузер зависает без ошибки.

**Причина**: Побочные эффекты (side-effects) внутри `@$mol_mem` атома.

**Главное правило:**

> `@$mol_mem` = **чистое вычисление**. Только ЧИТАЙ другие атомы, создавай объекты, возвращай значение.
>
> `@$mol_action` = **действие**. Можно ПИСАТЬ в атомы, вызывать API, запускать таймеры.
>
> **НИКОГДА** не вызывай функции с побочными эффектами (запись в атомы, async, API-вызовы, таймеры, DOM-операции) изнутри `@$mol_mem`.

**Как `$mol_mem` работает под капотом:**

`@$mol_mem` создаёт реактивный "fiber" (через `$mol_wire_solo`). При вычислении атом **подписывается** на все атомы которые читает. Если внутри `@$mol_mem` **записать** в другой атом — это инвалидирует зависимости, что вызывает пересчёт, что снова записывает → бесконечный цикл или "Circular subscription".

`@$mol_action` создаёт одноразовый "task fiber" (через `$mol_wire_task`). Он **НЕ подписывается** на зависимости, поэтому безопасен для записи.

**Примеры ошибок и их исправление:**

```typescript
// ❌ СЛОМАНО: side-effect внутри @$mol_mem
@ $mol_mem
current_screen() {
    const screen = this.current_screen_id()
    this.update_back_button()  // ← ПИШЕТ в DOM/API = side-effect!
    if (screen === 'menu') return [this.Menu()]
    return [this.Battle()]
}

// ✅ ИСПРАВЛЕНО: убрали side-effect
@ $mol_mem
current_screen() {
    const screen = this.current_screen_id()
    // Только читаем и возвращаем — никаких записей
    if (screen === 'menu') return [this.Menu()]
    return [this.Battle()]
}
```

```typescript
// ❌ СЛОМАНО: @$mol_mem фабрика вызывает async метод с записью
@ $mol_mem
shop() {
    const shop = new $my_shop()
    shop.check_pending_payments()  // ← async, пишет loading(true) = side-effect!
    return shop
}

// ✅ ИСПРАВЛЕНО: фабрика только создаёт и настраивает объект
@ $mol_mem
shop() {
    const shop = new $my_shop()
    shop.energy_system = () => this.energy_system()
    return shop
}
```

```typescript
// ❌ СЛОМАНО: @$mol_mem фабрика вызывает init() с побочными эффектами
@ $mol_mem
telegram() {
    const tg = new $my_telegram()
    tg.init()                    // ← вызывает wa.ready(), wa.expand() = side-effects
    tg.setup_back_button(...)    // ← регистрирует callback = side-effect
    tg.bind_to_player(store)     // ← ПИШЕТ player.nickname() = side-effect!
    return tg
}

// ✅ ИСПРАВЛЕНО: фабрика только создаёт объект, init через отдельный action
@ $mol_mem
telegram() {
    return new $my_telegram()
}

@ $mol_action
init_telegram() {
    const tg = this.telegram()
    tg.init()
    tg.setup_back_button(() => this.handle_back())
    tg.bind_to_player(this.player_store())
}
```

**Чек-лист: что МОЖНО и НЕЛЬЗЯ в `@$mol_mem`:**

| Можно ✅ | Нельзя ❌ |
|----------|-----------|
| Читать другие атомы | Писать в другие атомы |
| `new SomeClass()` | `someAtom(newValue)` |
| Чистые вычисления | `fetch()`, `async/await` |
| `return value` | `setInterval`, `setTimeout` |
| Привязки: `obj.prop = () => this.x()` | DOM-операции |
| | `localStorage.setItem()` |

**Обработчики кнопок (click handlers):**

`view.tree` генерирует `@$mol_mem` на базовом классе для `click? <=> handler? null`. Чтобы обработчик мог безопасно писать в атомы, переопределяйте его с `@$mol_action`:

```typescript
// view.tree генерирует @$mol_mem на базовом классе
// В $$ классе переопределяем с @$mol_action:
@ $mol_action
show_shop(next?: any): any {
    if (next !== undefined) {
        this.current_screen_id('shop')  // ← безопасно: @$mol_action может писать
    }
    return null
}
```

#### Циклическая зависимость (два свойства)

**Причина**: Два `@$mol_mem` свойства читают друг друга

**Решение**: Разбейте логику — выделите общую зависимость в отдельный атом

#### NPM пакет не найден

**Причина**: MAM не смог установить автоматически

**Решение**: Создайте `package.json` в модуле вручную

---

## Полезные ссылки

- **Документация $mol**: https://mol.hyoo.ru
- **Примеры**: https://github.com/hyoo-ru/mam
- **Giper Baza**: [GIPER_BAZA_GUIDE.md](./GIPER_BAZA_GUIDE.md)
- **Сообщество**: Telegram @h_y_o_o

---

## Заключение

$mol - это высокоуровневый фреймворк с фокусом на:

- **Декларативность**: UI описывается что нужно, а не как
- **Реактивность**: Автоматическое обновление без подписок
- **Типобезопасность**: TypeScript проверяет всё, включая стили
- **Производительность**: Ленивая загрузка и эффективный рендеринг
- **Простота**: В 3 раза меньше кода чем React/Angular

Вместе с Giper Baza получается полный стек для создания modern web-приложений без традиционного бэкенда.
