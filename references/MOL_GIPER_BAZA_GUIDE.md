# Руководство по Giper Baza для Backend-разработчиков

> Практическое руководство по созданию backend-приложений на распределённой CRDT-базе данных Giper Baza

## Содержание

1. [Введение](#введение)
2. [Основные концепции](#основные-концепции)
3. [Аутентификация](#аутентификация)
4. [Авторизация и роли](#авторизация-и-роли)
5. [CRUD операции](#crud-операции)
6. [Сценарий: Клиент-Заказчик с разными интерфейсами](#сценарий-клиент-заказчик)
7. [Типичные backend-паттерны](#типичные-backend-паттерны)
8. [Синхронизация и репликация](#синхронизация-и-репликация)
9. [Работа из консоли браузера (DevTools)](#работа-из-консоли-браузера-devtools)
10. [Общедоступные Land'ы: ошибка ранга 16 и .baza-деплой](#общедоступные-landы-ошибка-ранга-16-и-baza-деплой)

---

## Введение

**Giper Baza** (форк CRUS DB) - это распределённая peer-to-peer база данных с бесконфликтной реалтайм-синхронизацией на основе CRDT (Conflict-free Replicated Data Types).

### Ключевые преимущества для backend:

- **Offline-first**: Работает локально, синхронизируется автоматически
- **Встроенная авторизация**: Криптографическая аутентификация + гибкие права
- **Автоматическая синхронизация**: Не нужно писать API для CRUD
- **Версионность**: Каждое изменение хранит автора и время
- **Zero Trust**: Каждый узел проверяет подписи, даже свои данные с диска

### Архитектура

```
Glob (глобальная БД)
 └─ Land (изолированный раздел с правами)
     └─ Node (узел с данными)
         └─ Unit (минимальная единица - ребро графа)
```

---

## Основные концепции

### 1. Glob - глобальная база данных

```typescript
// Создание/получение глобальной БД
const glob = new $giper_baza_glob()

// Получение "домашнего" Land текущего пользователя
const home = glob.home()
```

### 2. Land - раздел базы данных

Land - это автономная часть базы со своими правами, которая синхронизируется независимо.

```typescript
// Создать новый Land с правами
const land = glob.land_grab([
	[null, $giper_baza_rank_read], // Все могут читать
	[myPass, $giper_baza_rank_rule], // Я полный владелец
])

// Получить Land по ссылке
const land = glob.Node(landLink, $giper_baza_land)
```

### 3. Node - узел с данными

Node - это высокоуровневая абстракция над Unit'ами, представляющая конкретный тип данных.

```typescript
// Получить/создать узел определённого типа
const node = land.Node($giper_baza_dict).Data()
```

### 4. Типы данных

#### Атомарные (Last-Write-Wins регистры):

```typescript
$giper_baza_atom_text // Строка
$giper_baza_atom_bint // 64-битное целое
$giper_baza_atom_real // Float64
$giper_baza_atom_time // ISO8601 момент времени
$giper_baza_atom_blob // Бинарные данные
$giper_baza_atom_link // Ссылка на другой Node
$giper_baza_atom_link_to(Type) // Типизированная ссылка
```

#### Коллекции (CRDT с автослиянием):

```typescript
$giper_baza_list_str // Список строк
$giper_baza_list_link_to(Type) // Список ссылок на Type
$giper_baza_dict // Словарь с любыми ключами/значениями
$giper_baza_dict_to(Type) // Словарь с значениями Type
```

---

## Аутентификация

### Криптографическая идентичность

Вместо логинов/паролей используются криптографические ключи:

- **Auth** - приватный ключ (никогда не передаётся)
- **Pass** - публичный ключ (аналог username)
- **Lord** - глобальный ID пользователя (хеш от Pass)

### Генерация ключа (с Proof-of-Work)

```typescript
// Генерация нового ключа (асинхронно, ~1-10 секунд)
const auth = await $giper_baza_auth.generate()

// Получение публичного ключа
const pass = auth.pass()
const lordId = pass.lord() // Глобальный уникальный ID

// Сохранение в LocalStorage (браузер) или файл (сервер)
// Auth хранится локально!
```

### Использование текущего ключа

```typescript
// Получить текущий Auth
const currentAuth = $giper_baza_auth.current()

// Установить Auth из строки (восстановление)
const auth = $giper_baza_auth.from('_9nV1NuqbUeu1sU...')
```

### Сценарий: Auto Sign-Up/Sign-In

```typescript
export class $my_app extends $mol_object {
	// База данных с автоматической аутентификацией
	@$mol_mem
	glob() {
		return new $giper_baza_glob()
	}

	// Профиль текущего пользователя
	@$mol_mem
	current_user() {
		return this.glob().home().land().Node($my_user).Data()
	}

	// При первом запуске создаётся новый ключ автоматически
	// При повторном - загружается из LocalStorage
}
```

### Сценарий: Login/Password (менее безопасно)

```typescript
export class $my_auth_service extends $mol_object {
	// Словарь "логин -> зашифрованный Auth"
	@$mol_mem
	credentials_land() {
		const preset = [[null, $giper_baza_rank_read]] // Читать могут все
		return this.glob().land_grab(preset)
	}

	@$mol_mem
	credentials() {
		return this.credentials_land().Node($giper_baza_dict_to($giper_baza_atom_blob)).Data()
	}

	// Регистрация
	async register(login: string, password: string) {
		const auth = await $giper_baza_auth.generate()

		// Шифрование Auth паролем (используем crypto API)
		const encrypted = await this.encrypt_auth(auth, password)

		// Сохранение в базу
		this.credentials().dive(login, $giper_baza_atom_blob, null)!.val(encrypted)

		return auth
	}

	// Вход
	async login(login: string, password: string) {
		const encrypted = this.credentials().dive(login, $giper_baza_atom_blob)?.val()
		if (!encrypted) throw new Error('User not found')

		// Расшифровка
		const auth = await this.decrypt_auth(encrypted, password)

		// Установка как текущий
		$giper_baza_auth.current(auth)

		return auth
	}

	// Выход
	logout() {
		// Генерируем новый временный ключ
		$giper_baza_auth.current(await $giper_baza_auth.generate())
	}
}
```

---

## Авторизация и роли

### Система уровней доступа (Tier)

```typescript
$giper_baza_rank_deny // 0b0_0000 - Нет доступа
$giper_baza_rank_read // 0b0_0001 - Только чтение
$giper_baza_rank_post // 0b0_0011 - Может добавлять данные
$giper_baza_rank_pull // 0b0_0111 - Может создавать форки
$giper_baza_rank_rule // 0b0_1111 - Полный контроль
```

### Proof-of-Work требования (Rate)

```typescript
$giper_baza_rank_post('late') // ~10 секунд вычислений
$giper_baza_rank_post('long') // ~1 секунда
$giper_baza_rank_post('slow') // ~100мс
$giper_baza_rank_post('fast') // ~10мс
$giper_baza_rank_post('just') // Без PoW
```

### Пресеты прав

```typescript
// Приватный Land (только владелец)
const preset = [[myPass, $giper_baza_rank_rule]]

// Публичный для чтения
const preset = [
	[null, $giper_baza_rank_read], // Все читают
	[myPass, $giper_baza_rank_rule], // Я владелец
]

// Публичный форум (все пишут)
const preset = [
	[null, $giper_baza_rank_post('slow')], // Все пишут с PoW
	[myPass, $giper_baza_rank_rule],
]

// Командная работа
const preset = [
	[null, $giper_baza_rank_read],
	[ownerPass, $giper_baza_rank_rule],
	[editorPass, $giper_baza_rank_post('just')],
]
```

### Выдача прав

```typescript
const land = glob.land_grab([[myPass, $giper_baza_rank_rule]])

// Выдать права другому пользователю
land.give(editorPass, $giper_baza_rank_post('just'))

// Проверить права
const rank = land.pass_rank(editorPass)
const canWrite = rank >= $giper_baza_rank_post

// Отозвать права
land.give(editorPass, $giper_baza_rank_read)
```

### Шифрование приватных данных

```typescript
// Включить шифрование (если не все имеют право на чтение)
await land.encrypted(true)

// При выдаче прав автоматически передаётся зашифрованный ключ
land.give(userPass, $giper_baza_rank_read)
// userPass теперь может расшифровывать данные
```

---

## CRUD операции

### Определение моделей

```typescript
// Модель пользователя
export class $my_user extends $giper_baza_entity.with({
	// Title наследуется от $giper_baza_entity
	Email: $giper_baza_atom_text,
	Age: $giper_baza_atom_bint,
	Avatar: $giper_baza_atom_blob,
	CreatedAt: $giper_baza_atom_time,
	Tags: $giper_baza_list_str,
	Settings: $giper_baza_dict,
	Profile: $giper_baza_atom_link_to(() => $my_profile),
}) {
	// Методы с кастомной логикой
	is_adult() {
		const age = this.Age()?.val()
		return age !== null && age >= 18n
	}
}

// Модель заказа
export class $my_order extends $giper_baza_entity.with({
	Status: $giper_baza_atom_enum(['pending', 'processing', 'completed', 'cancelled']),
	Amount: $giper_baza_atom_real,
	Customer: $giper_baza_atom_link_to(() => $my_user),
	Items: $giper_baza_list_link_to(() => $my_order_item),
	Notes: $giper_baza_dict_to($giper_baza_atom_text),
}) {}
```

### CREATE

#### Создание в том же Land

```typescript
const land = glob.home().land()
const user = land.Node($my_user).Data()

// Заполнение полей
user.Title(null)!.val('John Doe')
user.Email(null)!.val('john@example.com')
user.Age(null)!.val(25n)
user.CreatedAt(null)!.val(new $mol_time_moment())

// Списки
user.Tags(null)!.add('vip')
user.Tags(null)!.add('verified')

// Словари
user.Settings(null)!.dive('theme', $giper_baza_atom_text, null)!.val('dark')
user.Settings(null)!.dive('lang', $giper_baza_atom_text, null)!.val('ru')
```

#### Создание в отдельном Land (с правами)

```typescript
const users = land.Node($giper_baza_list_link_to($my_user)).Data()

// Создать пользователя в отдельном приватном Land
const preset = [
	[null, $giper_baza_rank_read], // Публичный профиль
	[user.pass(), $giper_baza_rank_rule], // Владелец
]

const user = users.make(preset)!
user.Title(null)!.val('Jane Smith')
```

### READ

#### Чтение атомарных значений

```typescript
const title = user.Title()?.val() // string | null
const age = user.Age()?.val() // bigint | null
const email = user.Email()?.val() // string | null

// С дефолтным значением
const title = user.Title()?.val() ?? 'Unnamed'
```

#### Чтение списков

```typescript
const tags = user.Tags()?.items() ?? [] // string[]

// Перебор
for (const tag of tags) {
	console.log(tag)
}
```

#### Чтение словарей

```typescript
const settings = user.Settings()?

// Все ключи
const keys = settings?.keys() ?? []  // string[]

// Значение по ключу
const theme = settings?.dive('theme', $giper_baza_atom_text)?.val()

// Перебор
for (const key of keys) {
  const value = settings.dive(key, $giper_baza_atom_text)?.val()
  console.log(`${key}: ${value}`)
}
```

#### Чтение связанных объектов

```typescript
// Получить связанный объект
const profileLink = user.Profile()?.val()
const profile = user.Profile()?.remote() // Автоматическая загрузка

if (profile) {
	const bio = profile.Bio()?.val()
}

// Список связанных объектов
const order = land.Node($my_order).Data()
const items = order.Items()?.remote_list() ?? []

for (const item of items) {
	const name = item.Title()?.val()
	const price = item.Price()?.val()
}
```

### UPDATE

#### Обновление атомарных значений

```typescript
user.Title(null)!.val('John Updated')
user.Age(null)!.val(26n)

// null очищает значение
user.Email(null)!.val(null)
```

#### Обновление списков

```typescript
const tags = user.Tags(null)!

// Добавить (если нет)
tags.add('premium')

// Удалить все вхождения
tags.cut('verified')

// Переместить
tags.move(0, 2) // С позиции 0 на позицию 2

// Заменить полностью (с умным слиянием при конфликтах)
tags.splice(['new', 'tags', 'list'])
```

#### Обновление словарей

```typescript
const settings = user.Settings(null)!

// Обновить/создать ключ
settings.dive('theme', $giper_baza_atom_text, null)!.val('light')

// Удалить ключ
settings.has('old_key', false)
```

### DELETE

#### Удаление из списка

```typescript
const items = order.Items(null)!

// Удалить конкретный элемент
items.cut(itemLink)

// Удалить по индексу
items.wipe(2)
```

#### Удаление из словаря

```typescript
const settings = user.Settings(null)!
settings.has('deprecated_setting', false)
```

#### "Удаление" объекта

> Физического удаления нет (append-only), но можно:

```typescript
// 1. Очистить все поля
user.Title(null)!.val(null)
user.Email(null)!.val(null)

// 2. Пометить как удалённый
user.Status(null)!.val('deleted')

// 3. Удалить ссылки на объект
users.cut(user.link())
```

---

## Сценарий: Клиент-Заказчик

### Задача

Создать систему, где:

- Пользователь может быть и клиентом и заказчиком
- У клиента свой интерфейс (просмотр заказов)
- У заказчика свой интерфейс (управление товарами)
- Роли определяются динамически

### Модели данных

```typescript
// Пользователь
export class $marketplace_user extends $giper_baza_entity.with({
	Email: $giper_baza_atom_text,
	Phone: $giper_baza_atom_text,
	Avatar: $giper_baza_atom_blob,
	// Роли хранятся как список
	Roles: $giper_baza_list_str, // ['customer', 'merchant']
	// Ссылки на профили ролей
	CustomerProfile: $giper_baza_atom_link_to(() => $marketplace_customer_profile),
	MerchantProfile: $giper_baza_atom_link_to(() => $marketplace_merchant_profile),
}) {
	is_customer() {
		return this.Roles()?.items().includes('customer') ?? false
	}

	is_merchant() {
		return this.Roles()?.items().includes('merchant') ?? false
	}

	// Ленивое создание профиля клиента
	ensure_customer_profile() {
		let profile = this.CustomerProfile()?.remote()
		if (!profile) {
			const preset = [[this.land().auth().pass(), $giper_baza_rank_rule]]
			profile = this.CustomerProfile(null)!.make(preset)!
			this.Roles(null)!.add('customer')
		}
		return profile
	}

	// Ленивое создание профиля продавца
	ensure_merchant_profile() {
		let profile = this.MerchantProfile()?.remote()
		if (!profile) {
			const preset = [[this.land().auth().pass(), $giper_baza_rank_rule]]
			profile = this.MerchantProfile(null)!.make(preset)!
			this.Roles(null)!.add('merchant')
		}
		return profile
	}
}

// Профиль клиента
export class $marketplace_customer_profile extends $giper_baza_entity.with({
	ShippingAddress: $giper_baza_atom_text,
	PaymentMethods: $giper_baza_list_str,
	Orders: $giper_baza_list_link_to(() => $marketplace_order),
	Favorites: $giper_baza_list_link_to(() => $marketplace_product),
}) {}

// Профиль продавца
export class $marketplace_merchant_profile extends $giper_baza_entity.with({
	StoreName: $giper_baza_atom_text,
	Description: $giper_baza_atom_text,
	Products: $giper_baza_list_link_to(() => $marketplace_product),
	SoldOrders: $giper_baza_list_link_to(() => $marketplace_order),
}) {}

// Товар
export class $marketplace_product extends $giper_baza_entity.with({
	Price: $giper_baza_atom_real,
	Description: $giper_baza_atom_text,
	Images: $giper_baza_list_blob,
	Category: $giper_baza_atom_text,
	InStock: $giper_baza_atom_bint,
	Merchant: $giper_baza_atom_link_to(() => $marketplace_user),
}) {}

// Заказ
export class $marketplace_order extends $giper_baza_entity.with({
	Status: $giper_baza_atom_enum(['pending', 'paid', 'shipped', 'completed', 'cancelled']),
	TotalAmount: $giper_baza_atom_real,
	CreatedAt: $giper_baza_atom_time,
	Customer: $giper_baza_atom_link_to(() => $marketplace_user),
	Merchant: $giper_baza_atom_link_to(() => $marketplace_user),
	Items: $giper_baza_list_link_to(() => $marketplace_order_item),
	// Комментарии от клиента и продавца
	Messages: $giper_baza_dict_to($giper_baza_atom_text),
}) {
	// Может ли пользователь видеть заказ
	can_view(user: $marketplace_user) {
		const customerId = this.Customer()?.val()
		const merchantId = this.Merchant()?.val()
		const userId = user.link()

		return userId.equal(customerId) || userId.equal(merchantId)
	}

	// Может ли обновлять статус
	can_update_status(user: $marketplace_user) {
		const merchantId = this.Merchant()?.val()
		return user.link().equal(merchantId)
	}
}

export class $marketplace_order_item extends $giper_baza_entity.with({
	Product: $giper_baza_atom_link_to(() => $marketplace_product),
	Quantity: $giper_baza_atom_bint,
	Price: $giper_baza_atom_real, // Цена на момент заказа
}) {}
```

### Логика приложения

```typescript
export class $marketplace_app extends $mol_object {
	@$mol_mem
	glob() {
		return new $giper_baza_glob()
	}

	// Текущий пользователь
	@$mol_mem
	current_user() {
		const home = this.glob().home()
		return home.land().Node($marketplace_user).Data()
	}

	// ========== ИНТЕРФЕЙС КЛИЕНТА ==========

	@$mol_mem
	customer_profile() {
		return this.current_user().ensure_customer_profile()
	}

	// Каталог товаров (публичный Land)
	@$mol_mem
	products_catalog() {
		const preset = [
			[null, $giper_baza_rank_read], // Все читают
		]
		const land = this.glob().land_grab(preset)
		return land.Node($giper_baza_list_link_to($marketplace_product)).Data()
	}

	// Создать заказ
	@$mol_action
	create_order(items: Array<{ product: $marketplace_product; quantity: bigint }>) {
		const customer = this.current_user()
		const profile = this.customer_profile()

		// Группируем по продавцам
		const by_merchant = new Map<string, typeof items>()
		for (const item of items) {
			const merchant_id = item.product.Merchant()?.val()?.toString() ?? ''
			if (!by_merchant.has(merchant_id)) by_merchant.set(merchant_id, [])
			by_merchant.get(merchant_id)!.push(item)
		}

		// Создаём заказ для каждого продавца
		const orders: $marketplace_order[] = []

		for (const [merchant_id, merchant_items] of by_merchant) {
			const merchant = this.glob().Node($giper_baza_link.from(merchant_id), $marketplace_user)

			// Права: читать могут клиент и продавец
			const preset = [
				[customer.land().auth().pass(), $giper_baza_rank_post('just')],
				[merchant.land().auth().pass(), $giper_baza_rank_post('just')],
			]

			const order = profile.Orders(null)!.make(preset)!

			order.Customer(null)!.remote(customer)
			order.Merchant(null)!.remote(merchant)
			order.Status(null)!.val('pending')
			order.CreatedAt(null)!.val(new $mol_time_moment())

			let total = 0
			for (const { product, quantity } of merchant_items) {
				const order_item = order.Items(null)!.make(null)!
				order_item.Product(null)!.remote(product)
				order_item.Quantity(null)!.val(quantity)
				const price = product.Price()?.val() ?? 0
				order_item.Price(null)!.val(price)
				total += price * Number(quantity)
			}

			order.TotalAmount(null)!.val(total)

			// Добавляем в список продавца
			const merchant_profile = merchant.ensure_merchant_profile()
			merchant_profile.SoldOrders(null)!.add(order.link())

			orders.push(order)
		}

		return orders
	}

	// Список заказов клиента
	@$mol_mem
	my_orders_as_customer() {
		const orders = this.customer_profile().Orders()?.remote_list() ?? []
		return orders.sort((a, b) => {
			const timeA = a.CreatedAt()?.val()?.valueOf() ?? 0
			const timeB = b.CreatedAt()?.val()?.valueOf() ?? 0
			return timeB - timeA // Новые первые
		})
	}

	// Добавить в избранное
	@$mol_action
	add_to_favorites(product: $marketplace_product) {
		this.customer_profile().Favorites(null)!.add(product.link())
	}

	// ========== ИНТЕРФЕЙС ПРОДАВЦА ==========

	@$mol_mem
	merchant_profile() {
		return this.current_user().ensure_merchant_profile()
	}

	// Создать товар
	@$mol_action
	create_product(data: { title: string; price: number; description: string; category: string; stock: bigint }) {
		const profile = this.merchant_profile()

		// Товар в приватном Land с публичным чтением
		const preset = [
			[null, $giper_baza_rank_read],
			[this.current_user().land().auth().pass(), $giper_baza_rank_rule],
		]

		const product = profile.Products(null)!.make(preset)!

		product.Title(null)!.val(data.title)
		product.Price(null)!.val(data.price)
		product.Description(null)!.val(data.description)
		product.Category(null)!.val(data.category)
		product.InStock(null)!.val(data.stock)
		product.Merchant(null)!.remote(this.current_user())

		// Добавляем в публичный каталог
		this.products_catalog().add(product.link())

		return product
	}

	// Мои товары
	@$mol_mem
	my_products() {
		return this.merchant_profile().Products()?.remote_list() ?? []
	}

	// Заказы как продавец
	@$mol_mem
	my_orders_as_merchant() {
		return this.merchant_profile().SoldOrders()?.remote_list() ?? []
	}

	// Обновить статус заказа
	@$mol_action
	update_order_status(order: $marketplace_order, status: string) {
		if (!order.can_update_status(this.current_user())) {
			throw new Error('No permission')
		}
		order.Status(null)!.val(status)
	}

	// ========== ОБЩИЕ ==========

	// Определение текущего режима
	@$mol_mem
	current_mode(): 'customer' | 'merchant' | 'both' {
		const user = this.current_user()
		const is_customer = user.is_customer()
		const is_merchant = user.is_merchant()

		if (is_customer && is_merchant) return 'both'
		if (is_merchant) return 'merchant'
		return 'customer'
	}
}
```

### UI компоненты (пример)

```typescript
// Переключатель режимов
export class $marketplace_mode_switcher extends $mol_view {
	@$mol_mem
	current_mode() {
		return this.app().current_mode()
	}

	sub() {
		const mode = this.current_mode()

		if (mode === 'both') {
			return [this.customer_button(), this.merchant_button()]
		} else if (mode === 'customer') {
			return [this.become_merchant_button()]
		} else {
			return [this.become_customer_button()]
		}
	}

	@$mol_action
	become_merchant() {
		this.app().current_user().ensure_merchant_profile()
	}
}

// Представление для клиента
export class $marketplace_customer_view extends $mol_view {
	sub() {
		return [this.catalog(), this.my_orders(), this.favorites()]
	}
}

// Представление для продавца
export class $marketplace_merchant_view extends $mol_view {
	sub() {
		return [this.my_products(), this.add_product_form(), this.incoming_orders()]
	}
}
```

---

## Типичные backend-паттерны

### 1. Многоуровневая иерархия данных

```typescript
// Пример: Организация -> Проекты -> Задачи
export class $my_org extends $giper_baza_entity.with({
	Projects: $giper_baza_list_link_to(() => $my_project),
	Members: $giper_baza_dict_to($giper_baza_atom_text), // lordId -> role
}) {}

export class $my_project extends $giper_baza_entity.with({
	Tasks: $giper_baza_list_link_to(() => $my_task),
	Owner: $giper_baza_atom_link_to(() => $my_org),
}) {}

export class $my_task extends $giper_baza_entity.with({
	Assignee: $giper_baza_atom_link,
	Status: $giper_baza_atom_enum(['todo', 'progress', 'done']),
	Project: $giper_baza_atom_link_to(() => $my_project),
}) {}

// Использование
const org = land.Node($my_org).Data()
const project = org.Projects(null)!.make(preset)!
const task = project.Tasks(null)!.make(null)!

task.Status(null)!.val('todo')
task.Project(null)!.remote(project)
```

### 2. Индексация и поиск

```typescript
// Empire - многоуровневая индексация
const Targets = $giper_baza_empire($giper_baza_list_link_to(() => $my_task))

const tasks = land.Node(Targets).Data()

// Создание индекса: [проект][статус][дата] -> задачи
const preset = [[null, $giper_baza_rank_read]]
const date = new $mol_time_moment()

tasks.path([projectId, 'todo', date], preset)!.add(task.link())
tasks.path([projectId, 'progress', date], preset)!.add(task.link())

// Поиск
const todoTasks = tasks.path([projectId, 'todo', date])?.remote_list() ?? []

// Навигация по индексу
const projects = tasks.keys([]) // Все проекты
const statuses = tasks.keys([projectId]) // Статусы в проекте
const dates = tasks.keys([projectId, 'todo']) // Даты с todo
```

### 3. Файловое хранилище

```typescript
export class $my_file_storage extends $mol_object {
	@$mol_mem
	files_land() {
		const preset = [[null, $giper_baza_rank_read]]
		return this.glob().land_grab(preset)
	}

	@$mol_action
	async upload(blob: Blob) {
		const file = this.files_land().Node($giper_baza_file).Data()

		// Метаданные
		file.Name(null)!.val(blob.name)
		file.Type(null)!.val(blob.type)

		// Данные (автоматически chunked по 32KB)
		const buffer = new Uint8Array(await blob.arrayBuffer())
		file.buffer(buffer)

		return file
	}

	@$mol_mem_key
	download(fileLink: $giper_baza_link) {
		const file = this.glob().Node(fileLink, $giper_baza_file)
		return file.blob() // Собирается из chunk'ов
	}
}
```

### 4. Real-time коллаборация

```typescript
export class $my_collaborative_doc extends $giper_baza_entity.with({
	Content: $giper_baza_text, // CRDT текст
	Editors: $giper_baza_dict_to($giper_baza_atom_time), // lordId -> lastEditTime
}) {
	@$mol_action
	edit(text: string) {
		this.Content(null)!.text(text)

		// Отметка времени редактирования
		const lordId = this.land().auth().pass().lord().toString()
		this.Editors(null)!.dive(lordId, $giper_baza_atom_time, null)!.val(new $mol_time_moment())
	}

	active_editors() {
		const editors = this.Editors()
		if (!editors) return []

		const now = new $mol_time_moment()
		const active: string[] = []

		for (const lordId of editors.keys()) {
			const lastEdit = editors.dive(lordId, $giper_baza_atom_time)?.val()
			if (lastEdit && now.valueOf() - lastEdit.valueOf() < 60000) {
				active.push(lordId)
			}
		}

		return active
	}
}
```

### 5. Аудит и версионирование

```typescript
export class $my_audited_entity extends $giper_baza_entity.with({
	Data: $giper_baza_dict,
	History: $giper_baza_list_link_to(() => $my_audit_record),
}) {
	@$mol_action
	update_field(key: string, value: any) {
		const old_value = this.Data()?.dive(key, $giper_baza_atom_vary)?.val()

		// Обновление
		this.Data(null)!.dive(key, $giper_baza_atom_vary, null)!.val(value)

		// Запись в историю
		const record = this.History(null)!.make(null)!
		record.Field(null)!.val(key)
		record.OldValue(null)!.val(old_value)
		record.NewValue(null)!.val(value)
		record.Timestamp(null)!.val(new $mol_time_moment())
		record.Author(null)!.val(this.land().auth().pass().lord())
	}
}

export class $my_audit_record extends $giper_baza_entity.with({
	Field: $giper_baza_atom_text,
	OldValue: $giper_baza_atom_vary,
	NewValue: $giper_baza_atom_vary,
	Timestamp: $giper_baza_atom_time,
	Author: $giper_baza_atom_link,
}) {}
```

---

## Синхронизация и репликация

### Базовая синхронизация между узлами

```typescript
// Узел A
const landA = glob.land_grab(preset)
landA.Data($giper_baza_list_str).items(['foo', 'bar'])

// Получить изменения
const diff = landA.diff_units() // Все Units

// Передать на узел B (через WebSocket, HTTP, etc)
send_to_B(diff)

// Узел B
const landB = glob.Node(landA.link(), $giper_baza_land)
landB.diff_apply(received_diff)

// Т��перь landB имеет те же данные
console.log(landB.Data($giper_baza_list_str).items()) // ['foo', 'bar']
```

### Инкрементальная синхронизация

```typescript
// Сохранить состояние (Face - "векторные часы")
const face = landA.faces.clone()

// Внести изменения
landA.Data($giper_baza_list_str).add('baz')

// Получить только новые изменения
const delta = landA.diff_units(face) // Только новые Units

send_to_B(delta)
landB.diff_apply(delta)
```

### Pack - универсальная сериализация

```typescript
// Упаковать несколько Land'ов
const parts: $giper_baza_pack_parts = [
	[land1.link(), { units: land1.diff_units(), faces: land1.faces }],
	[land2.link(), { units: land2.diff_units(), faces: land2.faces }],
]

const pack = $giper_baza_pack.make(parts)

// В бинарник
const blob = pack.toBlob()

// Сохранить в файл или отправить по сети
save_to_file(blob)

// Распаковать
const received_pack = $giper_baza_pack.from(blob)
for (const [land_id, part] of received_pack.parts()) {
	const land = glob.Node(land_id, $giper_baza_land)
	land.diff_apply(part.units)
}
```

### Yard - координатор синхронизации

```typescript
export class $my_sync_service extends $mol_object {
	@$mol_mem
	yard() {
		return this.glob().yard()
	}

	// WebSocket соединение
	@$mol_action
	connect_peer(websocket: WebSocket) {
		const port = new $my_websocket_port(websocket)

		// Регистрация
		this.yard().slaves.add(port)

		// При получении данных
		websocket.onmessage = event => {
			const data = new Uint8Array(event.data)
			this.yard().port_income(port, data)
		}

		// Синхронизация
		this.yard().sync()
	}
}

// Реализация Port
export class $my_websocket_port extends $giper_baza_port {
	constructor(public socket: WebSocket) {
		super()
	}

	// Отправка данных
	send(data: Uint8Array) {
		this.socket.send(data)
	}
}
```

### Пример: Server-Client синхронизация

#### Сервер (Node.js)

```typescript
import WebSocket from 'ws'

const wss = new WebSocket.Server({ port: 8080 })

const glob = new $giper_baza_glob()
const yard = glob.yard()

wss.on('connection', ws => {
	const port = {
		send(data: Uint8Array) {
			ws.send(data)
		},
	}

	yard.slaves.add(port)

	ws.on('message', data => {
		yard.port_income(port, new Uint8Array(data))
	})

	ws.on('close', () => {
		yard.slaves.delete(port)
	})

	// Периодическая синхронизация
	const interval = setInterval(() => yard.sync(), 1000)
	ws.on('close', () => clearInterval(interval))
})
```

#### Клиент (Browser)

```typescript
export class $my_app extends $mol_object {
	@$mol_mem
	websocket() {
		const ws = new WebSocket('ws://localhost:8080')

		ws.onopen = () => {
			const port = {
				send(data: Uint8Array) {
					ws.send(data)
				},
			}

			this.glob().yard().slaves.add(port)

			ws.onmessage = event => {
				const data = new Uint8Array(event.data)
				this.glob().yard().port_income(port, data)
			}

			// Синхронизация каждую секунду
			setInterval(() => this.glob().yard().sync(), 1000)
		}

		return ws
	}
}
```

---

## Практические советы

### 1. Права доступа

- **Приватные данные**: Один владелец `[[myPass, rule]]`
- **Публичный профиль**: `[[null, read], [myPass, rule]]`
- **Командная работа**: Выдавайте `post('just')` доверенным, `post('slow')` остальным
- **Шифрование**: Включайте для медицинских, финансовых данных

### 2. Производительность

- **Списки**: Для больших списков (>1000) используйте Empire для индексации
- **Blob'ы**: Автоматически чанкуются, но избегайте >10MB
- **Синхронизация**: Используйте инкрементальные дельты вместо полной репликации

### 3. Архитектура

- **Land на пользователя**: Каждый пользователь = отдельный Land
- **Land на объект**: Важные объекты (заказы, документы) в отдельных Land'ах с правами
- **Shared Land**: Общие справочники, категории, настройки

### 4. Тестирование

```typescript
$mol_test({
	'Create and read user'($) {
		const land = $giper_baza_land.make({ $ })
		const user = land.Node($my_user).Data()

		user.Title(null)!.val('Test User')
		user.Age(null)!.val(30n)

		$mol_assert_equal(user.Title()?.val(), 'Test User')
		$mol_assert_equal(user.Age()?.val(), 30n)
	},

	'Sync between lands'($) {
		const land1 = $giper_baza_land.make({ $ })
		const land2 = $giper_baza_land.make({ $, link: () => land1.link() })

		land1.Data($giper_baza_list_str).items(['foo'])
		land2.diff_apply(land1.diff_units())

		$mol_assert_equal(land2.Data($giper_baza_list_str).items(), ['foo'])
	},
})
```

---

## Полезные ссылки

- **Репозиторий**: https://github.com/giper-dev/baza
- **Оригинал (CRUS)**: https://github.com/hyoo-ru/crus.hyoo.ru
- **Примеры**: См. папку `app/` в репозитории

---

## Работа из консоли браузера (DevTools)

### Важно: `$mol_wire_sync` не работает из консоли

Методы вроде `$giper_baza_glob.land_grab()` используют `$mol_wire_sync` внутри, который требует реактивного контекста `$mol_wire`. Из консоли браузера этого контекста нет, поэтому вызовы падают с ошибкой `Promise` / `$giper_baza_auth.generate<#>`.

### Решение: `$mol_wire_async`

Оборачиваем вызов в `$mol_wire_async()` — это создаёт промис-обёртку, которая запускает код внутри реактивного контекста:

```js
// Создать публично-записываемый Land из консоли

;(async () => {
	const king = await $giper_baza_auth.generate()
	$giper_baza_auth.embryos.push(king.toString() + king.toStringPrivate())
	const land = await $mol_wire_async($giper_baza_glob).land_grab([[null, $giper_baza_rank_post('slow')]])
	await $mol_wire_async(land).units_saving()

	const parts = land.diff_parts()
	const pack = $giper_baza_pack.make(parts)
	const a = document.createElement('a')
	a.href = URL.createObjectURL(pack.toBlob())
	a.download = 'leaderboard.baza'
	a.click()
	alert('Land ID: ' + land.link().str)
})()
```

### Пояснение шагов

1. **`$giper_baza_auth.generate()`** — честный `async` метод, генерирует криптоключ с PoW. Вызываем через `await`.
2. **`$giper_baza_auth.embryos.push(...)`** — кладём готовый ключ в пул. Внутри `land_grab` → `king_grab` → `auth.grab()` заберёт его из `embryos` вместо повторной генерации.
3. **`$mol_wire_async($giper_baza_glob).land_grab(...)`** — оборачиваем в `$mol_wire_async`, чтобы все внутренние `$mol_wire_sync` вызовы работали в реактивном контексте. Результат сохраняем через `await` — иначе получим Promise вместо Land.
4. **`land.units_saving()`** — форсирует подписание всех юнитов (создаёт Seal для Gift). Без этого другие пользователи не примут Gift и получат ранг 16 (только чтение). См. секцию [Ошибка ранга 16](#общедоступные-landы-ошибка-ранга-16-и-baza-деплой).
5. **`alert()`** — `console.log` может не работать в async-контексте из-за перехвата $mol-ом. `alert()` работает всегда.

### Варианты пресетов

```js
// Все могут читать
;[null, $giper_baza_rank_read][
	// Все могут писать (с PoW ~100ms)
	(null, $giper_baza_rank_post('slow'))
][
	// Все могут писать (без PoW)
	(null, $giper_baza_rank_post('just'))
][
	// Все могут писать (с PoW ~1 сек, строже)
	(null, $giper_baza_rank_post('long'))
]
```

### Выдача прав существующему Land

```js
;(async () => {
	const land = $giper_baza_glob.Land(new $giper_baza_link('LAND_ID'))
	await $mol_wire_async(land).give(null, $giper_baza_rank_post('slow'))
	await $mol_wire_async(land).units_saving() // подписать Seal для Gift
	alert('Done')
})()
```

---

## Общедоступные Land'ы: ошибка ранга 16 и .baza-деплой

### Проблема: другие пользователи не могут писать

Типичный сценарий: вы создали Land с `[[ null, $giper_baza_rank_post('slow') ]]`, захардкодили ID в коде. Владелец работает нормально, но остальные получают **ранг 16** (только чтение) и не могут записывать данные.

### Почему это происходит

**Ранг 16 = `$giper_baza_rank_read`** — дефолтный ранг для незашифрованного Land, когда Gift для пользователя не найден.

Цепочка событий:

1. `land_grab()` создаёт временный `colony` с Gift для `null` (все → post)
2. `units_steal()` копирует юниты в Land глоба
3. **Seal (цифровая подпись) для Gift-а ещё не создан** — подписание ленивое
4. Данные уходят на сервер **без Seal**
5. Второй юзер получает Gift без Seal → **отклоняет его** (см. `land.ts: $giper_baza_unit_trusted_check`)
6. Без Gift-а срабатывает дефолт: `this.encrypted() ? $giper_baza_rank_deny : $giper_baza_rank_read` → **16**

Код из `land.ts`:

```typescript
lord_rank( lord ) {
    if( lord?.str === this.link().lord().str ) return $giper_baza_rank_rule
    return this._gift.get( lord?.str ?? '' )?.rank()
        ?? this._gift.get( $giper_baza_link.hole.str )?.rank()
        ?? ( this.encrypted() ? $giper_baza_rank_deny : $giper_baza_rank_read ) // ← 16
}
```

### Быстрый фикс: форсировать подписание

После `land_grab()` вызовите `units_saving()` — это форсирует полный пайплайн: `sand_encoding → units_signing → units_saving → broadcast`:

```typescript
@ $mol_action
create_land(): string {
    const land = this.$.$giper_baza_glob.land_grab([
        [ null, $giper_baza_rank_post( 'slow' ) ]
    ])
    land.units_saving() // форсирует подписание Seal для Gift-а
    const id = land.link().str
    return id
}
```

**Минусы**: зависит от того, что сервер получил данные. Если сервер перезапускается или данные теряются — проблема вернётся.

### Правильный фикс: деплой `.baza` файла

Именно так делают `$giper_baza_glob` и `$giper_baza_flex` — предзаполненные Land'ы в бинарном формате Pack, которые разворачиваются при запуске приложения. Каждый пользователь получает подписанные Gift + Seal **из бандла**, а не с сервера.

#### Что содержит `.baza` файл

- **Pass** — публичный ключ владельца Land (64B)
- **Gift для null** → заданный ранг (права для всех)
- **Seal** — подпись Gift-а (уже подписанная!)
- **Никакие данные** — Sand-юниты (записи) синхронизируются через Yard как обычно

`.baza` = «фундамент» Land (ключи + права), а данные приходят по сети.

#### Шаг 1: Создать Land и экспортировать

Из консоли браузера (приложение должно быть запущено с подключённым `$giper_baza_glob`):

```js
;(async () => {
	// 1. Создаём ленд
	const king = await $giper_baza_auth.generate()
	$giper_baza_auth.embryos.push(king.toString() + king.toStringPrivate())
	const land = await $mol_wire_async($giper_baza_glob).land_grab([[null, $giper_baza_rank_post('slow')]])

	// 2. Форсируем подписание
	await $mol_wire_async(land).units_saving()

	// 3. Экспортируем в .baza файл
	const parts = land.diff_parts()
	const pack = $giper_baza_pack.make(parts)
	const blob = pack.toBlob()

	// 4. Скачиваем
	const a = document.createElement('a')
	a.href = URL.createObjectURL(blob)
	a.download = 'my_land.baza'
	a.click()

	alert('Land ID: ' + land.link().str)
})()
```

Альтернативно: если в приложении есть UI книги (glob/book) — выберите нужный Land, отметьте чекбокс, нажмите «Dump». Это вызывает `dump_pack()` → `toBlob()`.

#### Шаг 2: Положить файл в директорию модуля

```
my_app/
  leaderboard/
    leaderboard.baza       ← экспортированный файл
    leaderboard.meta.tree
    leaderboard.ts
```

#### Шаг 3: Добавить deploy в meta.tree

```tree
deploy \my_app/leaderboard/leaderboard.baza
```

MAM-билдер скопирует файл в выходную директорию как `web.baza` (или по заданному пути).

#### Шаг 4: Загружать .baza при инициализации

```typescript
export class $my_app_leaderboard_store extends $mol_object2 {
	static LAND_LINK = 'agjOwFmK_ixIWEwNq' // ID из шага 1

	/** Загружает фундамент Land (Pass + Gift + Seal) из бандла */
	@$mol_action
	static boot() {
		const file = $mol_file.relative('web.baza')
		const pack = $mol_wire_sync($giper_baza_pack).from(file.buffer()) as $giper_baza_pack
		this.$.$giper_baza_glob.apply_pack(pack)
	}

	/** Получить Land (boot() вызывается автоматически при первом обращении) */
	@$mol_mem
	static land(): $giper_baza_land {
		this.boot()
		const link = new this.$.$giper_baza_link(this.LAND_LINK)
		const land = this.$.$giper_baza_glob.Land(link)
		land.sync()
		return land
	}
}
```

#### Как это работает для каждого пользователя

1. Приложение загружается → вызывается `boot()`
2. `apply_pack()` → `diff_apply()` — загружает Pass, Gift (null → post), Seal
3. Seal подписан владельцем Land → проходит проверку `$giper_baza_unit_trusted_check`
4. Gift принимается → `lord_rank()` возвращает `rank_post` для всех
5. Пользователь может записывать данные
6. Новые Sand-юниты (данные) синхронизируются через Yard как обычно

#### Пример: как это сделано в glob и flex

**glob** (`giper/baza/glob/glob.meta.tree`):

```tree
deploy \giper/baza/glob/glob.baza
```

**glob** (`giper/baza/glob/glob.ts`):

```typescript
@ $mol_action
static boot() {
    const file = $mol_file.relative( 'web.baza' )
    const pack = $mol_wire_sync( $giper_baza_pack ).from( file.buffer() ) as $giper_baza_pack
    this.apply_pack( pack )
}

@ $mol_action
static apply_pack( pack: $giper_baza_pack ) {
    return this.apply_parts( pack.parts() )
}

@ $mol_action
static apply_parts( parts: $giper_baza_pack_parts ) {
    for( const [ land_id, part ] of parts ) {
        const land = this.Land( new this.$.$giper_baza_link( land_id ) )
        land.diff_apply( part.units )
    }
}
```

**flex** — аналогично, содержит `.seed.baza` и `.deck.baza` с начальной конфигурацией схем.

---

## ⚠️ Критические паттерны: @$mol_mem vs @$mol_action для async операций

> **ВАЖНО**: Паттерн из раздела выше (`@$mol_action boot()` + `@$mol_mem land()` вызывающий `this.boot()`) — **ОПАСЕН** в production. Он работает когда glob сам вызывает boot(), но ведёт к двум критическим багам при ручном использовании:
>
> 1. **Circular subscription** — `@$mol_mem` на `land()` делает атом владельцем land объекта → `destructor()` → `yard.forget_land()` → circular
> 2. **Тихий провал boot()** — `@$mol_action` НЕ ретраит Promise'ы, регистрация молча проваливается

### Проблема: `@$mol_action` не ретраит Promise'ы

`boot()` содержит 3 async шага, каждый бросает Promise:

1. `$mol_file.buffer()` — fetch файла с сервера
2. `$mol_wire_sync($giper_baza_pack).from(buf)` — парсинг пака
3. `glob.apply_pack(pack)` — загрузка land из IndexedDB

`@$mol_action` создаёт `$mol_wire_task` (одноразовый файбер). При Promise — бросает его наверх. Caller ловит в `try/catch` → **регистрация молча проваливается и никогда не ретраится**.

`@$mol_mem` создаёт `$mol_wire_atom` (реактивный). При Promise — атом помечается как "pending". Когда Promise резолвится — **автоматический ретрай**. Так продолжается для каждого шага, пока все 3 не завершатся.

### Решение: `baza_ready()` — единый `@$mol_mem` для всех async шагов

```typescript
export class $my_store extends $mol_object2 {
	static LAND_LINK = 'agjOwFmK_ixIWEwNq'
	private _pack_applied = false

	/**
	 * Реактивно загружает, парсит и применяет .baza pack.
	 * @$mol_mem ретраит каждый Promise автоматически.
	 */
	@$mol_mem
	baza_ready(): boolean {
		if (this._pack_applied) return true
		const file = $mol_file.relative('path/to/my.baza')
		const buf = file.buffer() // Promise → @$mol_mem retry
		const pack = $mol_wire_sync($giper_baza_pack).from(buf) as $giper_baza_pack // Promise → retry
		this.$.$giper_baza_glob.apply_pack(pack) // Promise → retry
		this._pack_applied = true
		return true
	}

	/** Обёртка для вызова из @$mol_action контекста */
	@$mol_action
	boot() {
		this.baza_ready()
	}

	/**
	 * Land — обычный метод (НЕ @$mol_mem!).
	 * НЕ вызывает boot() — boot нужен только для записи.
	 * Кэш внутри glob.Land() (@$mol_mem_key).
	 */
	land(): $giper_baza_land {
		const link = new this.$.$giper_baza_link($my_store.LAND_LINK)
		return this.$.$giper_baza_glob.Land(link)
	}
}
```

### Прогрев `baza_ready()` в `auto()` — чтобы boot() работал синхронно к моменту клика

```typescript
export class $my_app extends $mol_view {
	override auto() {
		this.player() // Держит home land живым (см. ниже)
		// Прогрев: @$mol_mem ретраит все Promise'ы, к моменту клика — всё загружено
		try {
			this.store().baza_ready()
		} catch {}
		super.auto()
	}
}
```

### Реактивная авторегистрация — НЕ полагайся на click-хендлеры

Click-хендлеры (`@$mol_action`) не ретраят Promise'ы. Если `baza_ready()` ещё не завершился когда пользователь кликнул — регистрация молча провалится.

**Решение**: `@$mol_mem` в `auto()` который реагирует на все зависимости:

```typescript
export class $my_app extends $mol_view {
	override auto() {
		this.player()
		try {
			this.auto_register()
		} catch {}
		super.auto()
	}

	/** Реактивная авторегистрация — выполнится когда ВСЕ условия готовы */
	@$mol_mem
	auto_register(): void {
		const store = this.store()
		if (!store.baza_ready()) return // ждёт загрузки pack (Promise → retry)
		const player = this.player()
		if (player.score() <= 0) return // ждёт пока есть score (reactive)

		// Все условия → регистрируем (idempotent, safe to re-run)
		player.ensure_public_readable()
		store.registry().add(lord_link)
	}
}
```

### Ключевое правило

| Что нужно                                       | Используй                       | Почему                                    |
| ----------------------------------------------- | ------------------------------- | ----------------------------------------- |
| Async цепочка (file fetch, $mol_wire_sync, IDB) | `@$mol_mem`                     | Ретраит при resolve каждого Promise       |
| Синхронный side-effect (запись в CRDT)          | `@$mol_action`                  | Один вызов, результат уже готов           |
| Async + side-effect                             | `@$mol_mem` + idempotent writes | Ретрай безопасен если запись идемпотентна |

---

## ⚠️ НИКОГДА не ставь `@$mol_mem` на методы, возвращающие Giper Baza объекты

`@$mol_mem` делает атом **владельцем** возвращённого значения. При перестроении реактивного графа (переключение экрана, смена зависимости) $mol вызывает `destructor()` на старом значении.

У объектов Giper Baza (`land`, `pawn`, `player`, `list`) деструктор запускает `yard.forget_land()` → `ports()` → `masters()` → `Seed()` → `Land()` → **Circular subscription**.

```typescript
// ❌ НЕПРАВИЛЬНО — @$mol_mem вызовет destructor() → Circular subscription
@$mol_mem
land(): $giper_baza_land {
    return this.$.$giper_baza_glob.Land(link)
}

// ❌ НЕПРАВИЛЬНО — то же с @$mol_mem_key
@$mol_mem_key
player_by_lord(id: string): Player {
    return glob.Land(lord_link).Data(Player)
}

// ✅ ПРАВИЛЬНО — обычный метод, кэш внутри glob.Land() / land.Data()
land(): $giper_baza_land {
    return this.$.$giper_baza_glob.Land(link)
}

player_by_lord(id: string): Player {
    return glob.Land(lord_link).Data(Player) as Player
}
```

**Где `@$mol_mem` БЕЗОПАСЕН** — на методах, возвращающих примитивы или массивы:

- `players(): Player[]` — массив → OK
- `current_rank(): number` — примитив → OK

### Как держать land живым при переключении экранов

При переключении `current_screen()` старый экран удаляется из DOM → его реактивные атомы теряют подписчиков → `glob.Land(home_link)` без подписчиков → `$mol_after_tick` → `land.destructor()` → circular.

**Решение**: `auto()` на корневом компоненте (всегда активен пока приложение в DOM):

```typescript
override auto() {
    // Подписывается на home land — предотвращает GC при переключении экранов
    this.player()  // glob.home() внутри — создаёт подписку
    super.auto()
}
```

---

## Заключение

Giper Baza предоставляет мощную платформу для создания распределённых приложений с:

- **Встроенной криптографией** вместо традиционной аутентификации
- **CRDT** для бесконфликтного слияния данных
- **Автоматической синхронизацией** вместо REST API
- **Offline-first** архитектурой

Это меняет парадигму разработки: вместо написания серверных CRUD-эндпоинтов вы описываете модели данных и права доступа, а синхронизация происходит автоматически.
