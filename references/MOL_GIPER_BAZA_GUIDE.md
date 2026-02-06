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
  [null, $giper_baza_rank_read],  // Все могут читать
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
$giper_baza_atom_text    // Строка
$giper_baza_atom_bint    // 64-битное целое
$giper_baza_atom_real    // Float64
$giper_baza_atom_time    // ISO8601 момент времени
$giper_baza_atom_blob    // Бинарные данные
$giper_baza_atom_link    // Ссылка на другой Node
$giper_baza_atom_link_to(Type)  // Типизированная ссылка
```

#### Коллекции (CRDT с автослиянием):

```typescript
$giper_baza_list_str     // Список строк
$giper_baza_list_link_to(Type)  // Список ссылок на Type
$giper_baza_dict         // Словарь с любыми ключами/значениями
$giper_baza_dict_to(Type)  // Словарь с значениями Type
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
const lordId = pass.lord()  // Глобальный уникальный ID

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
$giper_baza_rank_deny  // 0b0_0000 - Нет доступа
$giper_baza_rank_read  // 0b0_0001 - Только чтение
$giper_baza_rank_post  // 0b0_0011 - Может добавлять данные
$giper_baza_rank_pull  // 0b0_0111 - Может создавать форки
$giper_baza_rank_rule  // 0b0_1111 - Полный контроль
```

### Proof-of-Work требования (Rate)

```typescript
$giper_baza_rank_post('late')  // ~10 секунд вычислений
$giper_baza_rank_post('long')  // ~1 секунда
$giper_baza_rank_post('slow')  // ~100мс
$giper_baza_rank_post('fast')  // ~10мс
$giper_baza_rank_post('just')  // Без PoW
```

### Пресеты прав

```typescript
// Приватный Land (только владелец)
const preset = [[myPass, $giper_baza_rank_rule]]

// Публичный для чтения
const preset = [
  [null, $giper_baza_rank_read],        // Все читают
  [myPass, $giper_baza_rank_rule],      // Я владелец
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
  [null, $giper_baza_rank_read],        // Публичный профиль
  [user.pass(), $giper_baza_rank_rule], // Владелец
]

const user = users.make(preset)!
user.Title(null)!.val('Jane Smith')
```

### READ

#### Чтение атомарных значений

```typescript
const title = user.Title()?.val()  // string | null
const age = user.Age()?.val()      // bigint | null
const email = user.Email()?.val()  // string | null

// С дефолтным значением
const title = user.Title()?.val() ?? 'Unnamed'
```

#### Чтение списков

```typescript
const tags = user.Tags()?.items() ?? []  // string[]

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
const profile = user.Profile()?.remote()  // Автоматическая загрузка

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
tags.move(0, 2)  // С позиции 0 на позицию 2

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
  Roles: $giper_baza_list_str,  // ['customer', 'merchant']
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
  Price: $giper_baza_atom_real,  // Цена на момент заказа
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
      [null, $giper_baza_rank_read],  // Все читают
    ]
    const land = this.glob().land_grab(preset)
    return land.Node($giper_baza_list_link_to($marketplace_product)).Data()
  }
  
  // Создать заказ
  @$mol_action
  create_order(items: Array<{product: $marketplace_product, quantity: bigint}>) {
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
      const merchant = this.glob().Node(
        $giper_baza_link.from(merchant_id),
        $marketplace_user
      )
      
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
      for (const {product, quantity} of merchant_items) {
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
      return timeB - timeA  // Новые первые
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
  create_product(data: {
    title: string,
    price: number,
    description: string,
    category: string,
    stock: bigint,
  }) {
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
      return [
        this.customer_button(),
        this.merchant_button(),
      ]
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
    return [
      this.catalog(),
      this.my_orders(),
      this.favorites(),
    ]
  }
}

// Представление для продавца
export class $marketplace_merchant_view extends $mol_view {
  
  sub() {
    return [
      this.my_products(),
      this.add_product_form(),
      this.incoming_orders(),
    ]
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
  Members: $giper_baza_dict_to($giper_baza_atom_text),  // lordId -> role
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
const projects = tasks.keys([])  // Все проекты
const statuses = tasks.keys([projectId])  // Статусы в проекте
const dates = tasks.keys([projectId, 'todo'])  // Даты с todo
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
    return file.blob()  // Собирается из chunk'ов
  }
}
```

### 4. Real-time коллаборация

```typescript
export class $my_collaborative_doc extends $giper_baza_entity.with({
  Content: $giper_baza_text,  // CRDT текст
  Editors: $giper_baza_dict_to($giper_baza_atom_time),  // lordId -> lastEditTime
}) {
  
  @$mol_action
  edit(text: string) {
    this.Content(null)!.text(text)
    
    // Отметка времени редактирования
    const lordId = this.land().auth().pass().lord().toString()
    this.Editors(null)!.dive(lordId, $giper_baza_atom_time, null)!
      .val(new $mol_time_moment())
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
const diff = landA.diff_units()  // Все Units

// Передать на узел B (через WebSocket, HTTP, etc)
send_to_B(diff)

// Узел B
const landB = glob.Node(landA.link(), $giper_baza_land)
landB.diff_apply(received_diff)

// Т��перь landB имеет те же данные
console.log(landB.Data($giper_baza_list_str).items())  // ['foo', 'bar']
```

### Инкрементальная синхронизация

```typescript
// Сохранить состояние (Face - "векторные часы")
const face = landA.faces.clone()

// Внести изменения
landA.Data($giper_baza_list_str).add('baz')

// Получить только новые изменения
const delta = landA.diff_units(face)  // Только новые Units

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
    websocket.onmessage = (event) => {
      const data = new Uint8Array(event.data)
      this.yard().port_income(port, data)
    }
    
    // Синхронизация
    this.yard().sync()
  }
}

// Реализация Port
export class $my_websocket_port extends $giper_baza_port {
  
  constructor(
    public socket: WebSocket
  ) { super() }
  
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

wss.on('connection', (ws) => {
  const port = {
    send(data: Uint8Array) {
      ws.send(data)
    }
  }
  
  yard.slaves.add(port)
  
  ws.on('message', (data) => {
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
        }
      }
      
      this.glob().yard().slaves.add(port)
      
      ws.onmessage = (event) => {
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
  }
})
```

---

## Полезные ссылки

- **Репозиторий**: https://github.com/giper-dev/baza
- **Оригинал (CRUS)**: https://github.com/hyoo-ru/crus.hyoo.ru
- **Примеры**: См. папку `app/` в репозитории

---

## Заключение

Giper Baza предоставляет мощную платформу для создания распределённых приложений с:

- **Встроенной криптографией** вместо традиционной аутентификации
- **CRDT** для бесконфликтного слияния данных
- **Автоматической синхронизацией** вместо REST API
- **Offline-first** архитектурой

Это меняет парадигму разработки: вместо написания серверных CRUD-эндпоинтов вы описываете модели данных и права доступа, а синхронизация происходит автоматически.
