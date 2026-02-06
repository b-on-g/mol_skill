# Руководство: Создание админки на Giper Baza

> Практическое руководство по созданию админ-панели с использованием Giper Baza (распределённая CRDT-база данных)

**Важно**: Данный гайд использует `$giper_baza`, а не устаревший `$hyoo_crus`!

## Содержание

1. [Введение](#введение)
2. [Архитектура админки](#архитектура-админки)
3. [Аутентификация и роли](#аутентификация-и-роли)
4. [Модели данных](#модели-данных)
5. [CRUD операции](#crud-операции)
6. [UI компоненты](#ui-компоненты)
7. [Полный пример](#полный-пример)

---

## Введение

### Что такое Giper Baza?

**Giper Baza** - распределённая peer-to-peer база данных с:
- **CRDT**: Бесконфликтное слияние изменений
- **Криптографическая аутентификация**: Вместо логинов/паролей - приватные ключи
- **Реалтайм синхронизация**: Изменения мгновенно распространяются между клиентами
- **Offline-first**: Работает локально, синхронизируется при наличии связи

### Почему Giper Baza для админки?

- **Не нужен REST API** - данные синхронизируются автоматически
- **Встроенная авторизация** - права на уровне данных
- **Многопользовательское редактирование** - несколько админов одновременно
- **История изменений** - каждое изменение подписано и датировано

---

## Архитектура админки

### Типичная структура файлов

```
my/admin/
├── app/                    # Главное приложение
│   ├── app.ts             # Логика
│   └── app.view.ts        # Представление
├── storage/               # Слой хранилища
│   └── storage.ts         # Управление данными
├── role/                  # Управление ролями
│   └── role.ts           # Модели ролей
├── entity/               # Сущности (модели данных)
│   ├── user/
│   │   └── user.ts
│   ├── post/
│   │   └── post.ts
│   └── ...
├── card/                 # Карточки для редактирования
│   └── card.view.ts
└── list/                 # Списки сущностей
    └── list.view.ts
```

### Основные слои

```
┌─────────────────────────────────────────┐
│           UI (View Components)           │
├─────────────────────────────────────────┤
│         Application Logic (App)          │
├─────────────────────────────────────────┤
│           Storage Layer                  │
├─────────────────────────────────────────┤
│    Models (Entities with $giper_baza)   │
├─────────────────────────────────────────┤
│        $giper_baza_glob (Database)       │
└─────────────────────────────────────────┘
```

---

## Аутентификация и роли

### Криптографическая аутентификация

В Giper Baza нет логинов/паролей. Вместо этого:
- **Auth** - приватный ключ пользователя (хранится локально)
- **Pass** - публичный ключ (аналог username)
- **Lord** - глобальный ID пользователя

```typescript
namespace $ {
  
  // Получение текущего пользователя
  export function get_current_user() {
    return $giper_baza_auth.current()
  }
  
  // Публичный ключ текущего пользователя
  export function get_current_pass() {
    return $giper_baza_auth.current().pass()
  }
  
  // ID текущего пользователя (Lord)
  export function get_current_lord() {
    return $giper_baza_auth.current().pass().lord()
  }
  
}
```

### Система ролей админки

```typescript
namespace $ {
  
  // Типы ролей
  export type $my_admin_role = 'admin' | 'editor' | 'viewer'
  
  // Модель для хранения прав пользователей
  export class $my_admin_role_right extends $giper_baza_entity.with({
    Key: $giper_baza_atom_text,         // Публичный ключ пользователя
    Role: $giper_baza_atom_text,        // Роль: admin, editor, viewer
    Description: $giper_baza_atom_text, // Описание/имя пользователя
  }) {}
  
  // Контейнер для всех прав
  export class $my_admin_role_infos extends $giper_baza_entity.with({
    Rights: $giper_baza_list_link_to(() => $my_admin_role_right),
    Ruler: $giper_baza_atom_text,  // Публичный ключ главного админа
  }) {
    
    // Получить роль пользователя по публичному ключу
    lord_role(pub_key: string): $my_admin_role | null {
      const rights = this.Rights()?.remote_list() ?? []
      for (const right of rights) {
        if (right.Key()?.val() === pub_key) {
          return right.Role()?.val() as $my_admin_role
        }
      }
      return null
    }
    
    // Установить роль пользователя
    set_lord_role(pub_key: string, role: $my_admin_role, description?: string) {
      const rights = this.Rights(null)!
      
      // Ищем существующую запись
      for (const right of rights.remote_list()) {
        if (right.Key()?.val() === pub_key) {
          right.Role(null)!.val(role)
          if (description) {
            right.Description(null)!.val(description)
          }
          return
        }
      }
      
      // Создаём новую запись
      const preset = [[null, $giper_baza_rank_read]]
      const right = rights.make(preset)!
      right.Key(null)!.val(pub_key)
      right.Role(null)!.val(role)
      if (description) {
        right.Description(null)!.val(description)
      }
    }
    
    // Удалить права пользователя
    remove_lord(pub_key: string) {
      const rights = this.Rights(null)!
      for (const right of rights.remote_list()) {
        if (right.Key()?.val() === pub_key) {
          rights.cut(right.link())
          return
        }
      }
    }
  }
  
}
```

### Проверка прав в приложении

```typescript
namespace $ {
  
  export class $my_admin_app extends $mol_object {
    
    // База данных
    @$mol_mem
    glob() {
      return new $giper_baza_glob()
    }
    
    // Хранилище админки
    @$mol_mem
    storage() {
      return this.glob().home().land().Node($my_admin_storage).Data()
    }
    
    // Роли пользователей
    @$mol_mem
    roles(): $my_admin_role_infos | null {
      return this.storage().Roles()?.remote() ?? null
    }
    
    // Ссылка на хранилище (для определения владельца)
    @$mol_mem
    storage_ref() {
      return this.storage().land().link()
    }
    
    // Является ли текущий пользователь главным админом?
    @$mol_mem
    is_super_admin(): boolean {
      const current_lord = $giper_baza_auth.current().pass().lord()
      const storage_lord = this.storage_ref()
      return current_lord.toString() === storage_lord.toString()
    }
    
    // Является ли текущий пользователь админом?
    @$mol_mem
    is_admin(): boolean {
      if (this.is_super_admin()) return true
      
      const pub_key = $giper_baza_auth.current().pass().toString()
      const role = this.roles()?.lord_role(pub_key)
      return role === 'admin'
    }
    
    // Является ли текущий пользователь редактором?
    @$mol_mem
    is_editor(): boolean {
      if (this.is_admin()) return true
      
      const pub_key = $giper_baza_auth.current().pass().toString()
      const role = this.roles()?.lord_role(pub_key)
      return role === 'editor'
    }
    
    // Может ли пользователь только просматривать?
    @$mol_mem
    is_viewer(): boolean {
      const pub_key = $giper_baza_auth.current().pass().toString()
      const role = this.roles()?.lord_role(pub_key)
      return role === 'viewer' || role === null
    }
    
  }
  
}
```

---

## Модели данных

### Базовая модель сущности

```typescript
namespace $ {
  
  // Базовая сущность с общими полями
  export class $my_admin_base_entity extends $giper_baza_entity.with({
    Title: $giper_baza_atom_text,
    CreatedAt: $giper_baza_atom_time,
    UpdatedAt: $giper_baza_atom_time,
    CreatedBy: $giper_baza_atom_link,
    Status: $giper_baza_atom_text,  // 'active', 'archived', 'deleted'
  }) {
    
    // Автоматическое обновление времени
    touch() {
      this.UpdatedAt(null)!.val(new $mol_time_moment())
    }
    
    // Мягкое удаление
    soft_delete() {
      this.Status(null)!.val('deleted')
      this.touch()
    }
    
    // Архивирование
    archive() {
      this.Status(null)!.val('archived')
      this.touch()
    }
    
    // Проверка активности
    is_active() {
      return this.Status()?.val() !== 'deleted' && this.Status()?.val() !== 'archived'
    }
    
  }
  
}
```

### Пример: Модель пользователя

```typescript
namespace $ {
  
  export class $my_admin_user extends $my_admin_base_entity.with({
    Email: $giper_baza_atom_text,
    Phone: $giper_baza_atom_text,
    Avatar: $giper_baza_atom_blob,
    Role: $giper_baza_atom_text,
    Settings: $giper_baza_dict,
    Tags: $giper_baza_list_str,
  }) {
    
    // Полное имя (алиас для Title)
    @$mol_mem
    name(next?: string) {
      return this.Title(next ? null : undefined)?.val(next) ?? 'Unnamed'
    }
    
    // Валидация email
    is_valid_email(): boolean {
      const email = this.Email()?.val()
      if (!email) return false
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }
    
    // Получить настройку
    get_setting(key: string): string | null {
      return this.Settings()?.dive(key, $giper_baza_atom_text)?.val() ?? null
    }
    
    // Установить настройку
    set_setting(key: string, value: string) {
      this.Settings(null)!.dive(key, $giper_baza_atom_text, null)!.val(value)
      this.touch()
    }
    
  }
  
}
```

### Пример: Модель поста/статьи

```typescript
namespace $ {
  
  export class $my_admin_post extends $my_admin_base_entity.with({
    Content: $giper_baza_text,        // CRDT-текст для совместного редактирования
    Slug: $giper_baza_atom_text,
    Category: $giper_baza_atom_text,
    Published: $giper_baza_atom_bint, // 0 = draft, 1 = published
    PublishedAt: $giper_baza_atom_time,
    Author: $giper_baza_atom_link_to(() => $my_admin_user),
    Tags: $giper_baza_list_str,
    Images: $giper_baza_list_link_to(() => $giper_baza_file),
  }) {
    
    // Публикация
    @$mol_action
    publish() {
      this.Published(null)!.val(1n)
      this.PublishedAt(null)!.val(new $mol_time_moment())
      this.touch()
    }
    
    // Снятие с публикации
    @$mol_action
    unpublish() {
      this.Published(null)!.val(0n)
      this.touch()
    }
    
    // Проверка публикации
    is_published(): boolean {
      return this.Published()?.val() === 1n
    }
    
  }
  
}
```

### Пример: Модель хранилища админки

```typescript
namespace $ {
  
  export class $my_admin_storage extends $giper_baza_entity.with({
    Roles: $giper_baza_atom_link_to(() => $my_admin_role_infos),
    Users: $giper_baza_list_link_to(() => $my_admin_user),
    Posts: $giper_baza_list_link_to(() => $my_admin_post),
    Settings: $giper_baza_dict,
    Version: $giper_baza_atom_text,
  }) {
    
    // Инициализация хранилища
    @$mol_action
    initialize() {
      // Создаём контейнер ролей если нет
      if (!this.Roles()?.remote()) {
        const preset = [
          [null, $giper_baza_rank_read],
          [$giper_baza_auth.current().pass(), $giper_baza_rank_rule],
        ]
        this.Roles(null)!.make(preset)
      }
      
      // Устанавливаем версию
      if (!this.Version()?.val()) {
        this.Version(null)!.val('1.0.0')
      }
    }
    
    // Получить всех активных пользователей
    @$mol_mem
    active_users() {
      const users = this.Users()?.remote_list() ?? []
      return users.filter(u => u.is_active())
    }
    
    // Получить опубликованные посты
    @$mol_mem
    published_posts() {
      const posts = this.Posts()?.remote_list() ?? []
      return posts.filter(p => p.is_published() && p.is_active())
    }
    
  }
  
}
```

---

## CRUD операции

### CREATE - Создание

```typescript
namespace $ {
  
  export class $my_admin_app extends $mol_object {
    
    // ... предыдущий код ...
    
    // Создание пользователя
    @$mol_action
    create_user(data: {
      name: string,
      email: string,
      role?: string,
    }) {
      if (!this.is_editor()) {
        throw new Error('No permission to create users')
      }
      
      const users = this.storage().Users(null)!
      
      // Права: публичное чтение, редактирование только админами
      const preset = [
        [null, $giper_baza_rank_read],
        [$giper_baza_auth.current().pass(), $giper_baza_rank_rule],
      ]
      
      const user = users.make(preset)!
      
      user.Title(null)!.val(data.name)
      user.Email(null)!.val(data.email)
      user.Role(null)!.val(data.role ?? 'user')
      user.Status(null)!.val('active')
      user.CreatedAt(null)!.val(new $mol_time_moment())
      user.UpdatedAt(null)!.val(new $mol_time_moment())
      user.CreatedBy(null)!.val($giper_baza_auth.current().pass().lord())
      
      return user
    }
    
    // Создание поста
    @$mol_action
    create_post(data: {
      title: string,
      content: string,
      category?: string,
    }) {
      if (!this.is_editor()) {
        throw new Error('No permission to create posts')
      }
      
      const posts = this.storage().Posts(null)!
      
      const preset = [
        [null, $giper_baza_rank_read],
        [$giper_baza_auth.current().pass(), $giper_baza_rank_rule],
      ]
      
      const post = posts.make(preset)!
      
      post.Title(null)!.val(data.title)
      post.Content(null)!.text(data.content)
      post.Category(null)!.val(data.category ?? 'general')
      post.Slug(null)!.val(this.generate_slug(data.title))
      post.Published(null)!.val(0n)  // Черновик
      post.Status(null)!.val('active')
      post.CreatedAt(null)!.val(new $mol_time_moment())
      post.UpdatedAt(null)!.val(new $mol_time_moment())
      post.CreatedBy(null)!.val($giper_baza_auth.current().pass().lord())
      
      return post
    }
    
    // Генерация slug из заголовка
    generate_slug(title: string): string {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]+/gi, '-')
        .replace(/^-|-$/g, '')
    }
    
  }
  
}
```

### READ - Чтение

```typescript
namespace $ {
  
  export class $my_admin_app extends $mol_object {
    
    // ... предыдущий код ...
    
    // Список всех пользователей
    @$mol_mem
    users() {
      return this.storage().Users()?.remote_list() ?? []
    }
    
    // Активные пользователи
    @$mol_mem
    active_users() {
      return this.users().filter(u => u.is_active())
    }
    
    // Поиск пользователя по email
    find_user_by_email(email: string): $my_admin_user | null {
      return this.users().find(u => u.Email()?.val() === email) ?? null
    }
    
    // Все посты
    @$mol_mem
    posts() {
      return this.storage().Posts()?.remote_list() ?? []
    }
    
    // Посты с фильтрацией
    @$mol_mem_key
    posts_by_category(category: string) {
      return this.posts().filter(p => 
        p.Category()?.val() === category && p.is_active()
      )
    }
    
    // Посты с пагинацией
    @$mol_mem_key
    posts_paginated(page: number, per_page: number = 10) {
      const all = this.posts().filter(p => p.is_active())
      const start = page * per_page
      return {
        items: all.slice(start, start + per_page),
        total: all.length,
        pages: Math.ceil(all.length / per_page),
      }
    }
    
    // Поиск постов
    search_posts(query: string) {
      const q = query.toLowerCase()
      return this.posts().filter(p => {
        const title = p.Title()?.val()?.toLowerCase() ?? ''
        const content = p.Content()?.text()?.toLowerCase() ?? ''
        return title.includes(q) || content.includes(q)
      })
    }
    
  }
  
}
```

### UPDATE - Обновление

```typescript
namespace $ {
  
  export class $my_admin_app extends $mol_object {
    
    // ... предыдущий код ...
    
    // Обновление пользователя
    @$mol_action
    update_user(user: $my_admin_user, data: {
      name?: string,
      email?: string,
      phone?: string,
      role?: string,
    }) {
      if (!this.is_editor()) {
        throw new Error('No permission to update users')
      }
      
      if (data.name !== undefined) {
        user.Title(null)!.val(data.name)
      }
      if (data.email !== undefined) {
        user.Email(null)!.val(data.email)
      }
      if (data.phone !== undefined) {
        user.Phone(null)!.val(data.phone)
      }
      if (data.role !== undefined) {
        user.Role(null)!.val(data.role)
      }
      
      user.touch()  // Обновляем UpdatedAt
    }
    
    // Обновление поста
    @$mol_action
    update_post(post: $my_admin_post, data: {
      title?: string,
      content?: string,
      category?: string,
      tags?: string[],
    }) {
      if (!this.is_editor()) {
        throw new Error('No permission to update posts')
      }
      
      if (data.title !== undefined) {
        post.Title(null)!.val(data.title)
        post.Slug(null)!.val(this.generate_slug(data.title))
      }
      if (data.content !== undefined) {
        post.Content(null)!.text(data.content)
      }
      if (data.category !== undefined) {
        post.Category(null)!.val(data.category)
      }
      if (data.tags !== undefined) {
        post.Tags(null)!.splice(data.tags)
      }
      
      post.touch()
    }
    
    // Публикация/снятие поста
    @$mol_action
    toggle_post_published(post: $my_admin_post) {
      if (!this.is_editor()) {
        throw new Error('No permission')
      }
      
      if (post.is_published()) {
        post.unpublish()
      } else {
        post.publish()
      }
    }
    
  }
  
}
```

### DELETE - Удаление

```typescript
namespace $ {
  
  export class $my_admin_app extends $mol_object {
    
    // ... предыдущий код ...
    
    // Мягкое удаление пользователя
    @$mol_action
    delete_user(user: $my_admin_user) {
      if (!this.is_admin()) {
        throw new Error('Only admins can delete users')
      }
      
      user.soft_delete()
    }
    
    // Полное удаление пользователя (убираем из списка)
    @$mol_action
    remove_user(user: $my_admin_user) {
      if (!this.is_super_admin()) {
        throw new Error('Only super admin can permanently remove users')
      }
      
      this.storage().Users(null)!.cut(user.link())
    }
    
    // Архивирование поста
    @$mol_action
    archive_post(post: $my_admin_post) {
      if (!this.is_editor()) {
        throw new Error('No permission')
      }
      
      post.archive()
    }
    
    // Удаление поста
    @$mol_action
    delete_post(post: $my_admin_post) {
      if (!this.is_admin()) {
        throw new Error('Only admins can delete posts')
      }
      
      post.soft_delete()
    }
    
    // Восстановление из удалённых
    @$mol_action
    restore_entity(entity: $my_admin_base_entity) {
      if (!this.is_admin()) {
        throw new Error('Only admins can restore')
      }
      
      entity.Status(null)!.val('active')
      entity.touch()
    }
    
  }
  
}
```

---

## UI компоненты

### Главный компонент приложения

```typescript
namespace $ {
  
  export class $my_admin_app_view extends $mol_page {
    
    // Логика приложения
    @$mol_mem
    app() {
      return new $my_admin_app()
    }
    
    // Заголовок страницы
    title() {
      return 'Admin Panel'
    }
    
    // Тулбар с кнопками
    tools() {
      const tools: $mol_view[] = []
      
      if (this.app().is_editor()) {
        tools.push(this.Add_button())
      }
      
      if (this.app().is_admin()) {
        tools.push(this.Settings_button())
      }
      
      tools.push(this.User_info())
      
      return tools
    }
    
    // Основной контент
    body() {
      return [
        this.Navigation(),
        this.Content(),
      ]
    }
    
    // Навигация
    @$mol_mem
    Navigation() {
      return new $mol_list().rows([
        this.Nav_users(),
        this.Nav_posts(),
        this.app().is_admin() ? this.Nav_roles() : null,
      ].filter(Boolean) as $mol_view[])
    }
    
    // Контент в зависимости от текущего раздела
    @$mol_mem
    Content() {
      switch (this.current_section()) {
        case 'users': return this.Users_list()
        case 'posts': return this.Posts_list()
        case 'roles': return this.Roles_panel()
        default: return this.Dashboard()
      }
    }
    
    @$mol_mem
    current_section(next?: string) {
      return next ?? 'dashboard'
    }
    
  }
  
}
```

### Компонент списка пользователей

```typescript
namespace $ {
  
  export class $my_admin_users_list extends $mol_list {
    
    @$mol_mem
    app() {
      return new $my_admin_app()
    }
    
    @$mol_mem
    rows() {
      const users = this.app().active_users()
      return users.map(user => this.User_row(user.link()))
    }
    
    @$mol_mem_key
    User_row(ref: $giper_baza_link) {
      const row = new $my_admin_user_row()
      row.user = () => this.app().glob().Node(ref, $my_admin_user)
      row.app = () => this.app()
      return row
    }
    
  }
  
  export class $my_admin_user_row extends $mol_row {
    
    user!: () => $my_admin_user
    app!: () => $my_admin_app
    
    sub() {
      return [
        this.Avatar(),
        this.Info(),
        this.Actions(),
      ]
    }
    
    @$mol_mem
    Avatar() {
      const avatar = this.user().Avatar()?.val()
      // Возвращаем компонент аватара
      return new $mol_avatar()
    }
    
    @$mol_mem
    Info() {
      return new $mol_list().rows([
        new $mol_text().text(this.user().name()),
        new $mol_text().text(this.user().Email()?.val() ?? ''),
        new $mol_text().text(this.user().Role()?.val() ?? 'user'),
      ])
    }
    
    @$mol_mem
    Actions() {
      const actions: $mol_view[] = []
      
      if (this.app().is_editor()) {
        actions.push(this.Edit_button())
      }
      if (this.app().is_admin()) {
        actions.push(this.Delete_button())
      }
      
      return new $mol_row().sub(actions)
    }
    
    @$mol_mem
    Edit_button() {
      return new $mol_button_minor()
        .title('Edit')
        .click(() => this.edit_click())
    }
    
    @$mol_mem
    Delete_button() {
      return new $mol_button_minor()
        .title('Delete')
        .click(() => this.delete_click())
    }
    
    @$mol_action
    edit_click() {
      // Открыть форму редактирования
      this.app().selected_user(this.user())
    }
    
    @$mol_action
    delete_click() {
      if (confirm('Delete user?')) {
        this.app().delete_user(this.user())
      }
    }
    
  }
  
}
```

### Компонент карточки редактирования

```typescript
namespace $ {
  
  export class $my_admin_user_card extends $mol_form {
    
    user!: () => $my_admin_user
    app!: () => $my_admin_app
    
    // Поля формы
    form_fields() {
      return [
        this.Name_field(),
        this.Email_field(),
        this.Phone_field(),
        this.Role_field(),
        this.Tags_field(),
      ]
    }
    
    // Кнопки формы
    buttons() {
      return [
        this.Save_button(),
        this.Cancel_button(),
      ]
    }
    
    // Поле имени
    @$mol_mem
    Name_field() {
      return new $mol_form_field()
        .name('Name')
        .Content(() => new $mol_string()
          .value(this.name())
          .hint('Enter name')
        )
    }
    
    @$mol_mem
    name(next?: string) {
      if (next !== undefined) {
        this.user().Title(null)!.val(next)
      }
      return this.user().Title()?.val() ?? ''
    }
    
    // Поле email
    @$mol_mem
    Email_field() {
      return new $mol_form_field()
        .name('Email')
        .Content(() => new $mol_string()
          .value(this.email())
          .hint('Enter email')
        )
    }
    
    @$mol_mem
    email(next?: string) {
      if (next !== undefined) {
        this.user().Email(null)!.val(next)
      }
      return this.user().Email()?.val() ?? ''
    }
    
    // Поле телефона
    @$mol_mem
    Phone_field() {
      return new $mol_form_field()
        .name('Phone')
        .Content(() => new $mol_string()
          .value(this.phone())
          .hint('Enter phone')
        )
    }
    
    @$mol_mem
    phone(next?: string) {
      if (next !== undefined) {
        this.user().Phone(null)!.val(next)
      }
      return this.user().Phone()?.val() ?? ''
    }
    
    // Выбор роли
    @$mol_mem
    Role_field() {
      return new $mol_form_field()
        .name('Role')
        .Content(() => new $mol_select()
          .value(this.role())
          .options(['user', 'editor', 'admin'])
        )
    }
    
    @$mol_mem
    role(next?: string) {
      if (next !== undefined) {
        this.user().Role(null)!.val(next)
      }
      return this.user().Role()?.val() ?? 'user'
    }
    
    // Теги
    @$mol_mem
    Tags_field() {
      return new $mol_form_field()
        .name('Tags')
        .Content(() => new $mol_string()
          .value(this.tags_string())
          .hint('Comma-separated tags')
        )
    }
    
    @$mol_mem
    tags_string(next?: string) {
      if (next !== undefined) {
        const tags = next.split(',').map(t => t.trim()).filter(Boolean)
        this.user().Tags(null)!.splice(tags)
      }
      return this.user().Tags()?.items().join(', ') ?? ''
    }
    
    // Кнопка сохранения
    @$mol_mem
    Save_button() {
      return new $mol_button_major()
        .title('Save')
        .click(() => this.save())
    }
    
    @$mol_action
    save() {
      this.user().touch()
      // Закрыть карточку
      this.app().selected_user(null)
    }
    
    // Кнопка отмены
    @$mol_mem
    Cancel_button() {
      return new $mol_button_minor()
        .title('Cancel')
        .click(() => this.cancel())
    }
    
    @$mol_action
    cancel() {
      this.app().selected_user(null)
    }
    
  }
  
}
```

### Панель управления ролями

```typescript
namespace $ {
  
  export class $my_admin_roles_panel extends $mol_page {
    
    app!: () => $my_admin_app
    
    title() {
      return 'User Roles Management'
    }
    
    body() {
      return [
        this.Add_user_form(),
        this.Roles_list(),
      ]
    }
    
    // Форма добавления пользователя
    @$mol_mem
    Add_user_form() {
      return new $mol_form().form_fields([
        new $mol_form_field()
          .name('Public Key')
          .Content(() => new $mol_string()
            .value(this.new_pub_key())
            .hint('User public key')
          ),
        new $mol_form_field()
          .name('Role')
          .Content(() => new $mol_select()
            .value(this.new_role())
            .options(['viewer', 'editor', 'admin'])
          ),
        new $mol_form_field()
          .name('Description')
          .Content(() => new $mol_string()
            .value(this.new_description())
            .hint('User description')
          ),
      ]).buttons([
        new $mol_button_major()
          .title('Add User')
          .click(() => this.add_user())
      ])
    }
    
    @$mol_mem
    new_pub_key(next?: string) {
      return next ?? ''
    }
    
    @$mol_mem
    new_role(next?: string) {
      return next ?? 'viewer'
    }
    
    @$mol_mem
    new_description(next?: string) {
      return next ?? ''
    }
    
    @$mol_action
    add_user() {
      const pub_key = this.new_pub_key()
      const role = this.new_role() as $my_admin_role
      const description = this.new_description()
      
      if (!pub_key) {
        alert('Public key is required')
        return
      }
      
      this.app().roles()?.set_lord_role(pub_key, role, description)
      
      // Очищаем форму
      this.new_pub_key('')
      this.new_role('viewer')
      this.new_description('')
    }
    
    // Список ролей
    @$mol_mem
    Roles_list() {
      const rights = this.app().roles()?.Rights()?.remote_list() ?? []
      return new $mol_list().rows(
        rights.map(right => this.Role_row(right.link()))
      )
    }
    
    @$mol_mem_key
    Role_row(ref: $giper_baza_link) {
      const right = this.app().glob().Node(ref, $my_admin_role_right)
      
      return new $mol_row().sub([
        new $mol_text().text(right.Description()?.val() ?? 'Unknown'),
        new $mol_text().text(right.Key()?.val()?.slice(0, 20) + '...'),
        new $mol_select()
          .value(right.Role()?.val() ?? 'viewer')
          .options(['viewer', 'editor', 'admin'])
          .event_change(e => {
            right.Role(null)!.val((e.target as HTMLSelectElement).value)
          }),
        new $mol_button_minor()
          .title('Remove')
          .click(() => {
            if (confirm('Remove user role?')) {
              this.app().roles()?.remove_lord(right.Key()?.val() ?? '')
            }
          }),
      ])
    }
    
  }
  
}
```

---

## Полный пример

### Структура проекта

```
my/admin/
├── my/admin/app/
│   ├── app.ts              # Основная логика
│   ├── app.view.ts         # Главный view
│   └── app.view.tree       # Декларативная структура
├── my/admin/storage/
│   └── storage.ts          # Модели хранилища
├── my/admin/role/
│   └── role.ts             # Модели ролей
├── my/admin/user/
│   ├── user.ts             # Модель пользователя
│   ├── list.view.ts        # Список пользователей
│   └── card.view.ts        # Карточка пользователя
├── my/admin/post/
│   ├── post.ts             # Модель поста
│   ├── list.view.ts        # Список постов
│   └── card.view.ts        # Карточка поста
└── my/admin/-/
    └── web.ts              # Конфигурация для web
```

### Минимальный запуск

```typescript
// my/admin/app/app.ts
namespace $ {
  
  export class $my_admin extends $mol_object {
    
    @$mol_mem
    static glob() {
      return new $giper_baza_glob()
    }
    
    @$mol_mem
    static storage() {
      const land = this.glob().home().land()
      const storage = land.Node($my_admin_storage).Data()
      storage.initialize()
      return storage
    }
    
    // Проверка прав
    static is_admin(): boolean {
      const current = $giper_baza_auth.current().pass().lord()
      const owner = this.storage().land().link()
      return current.toString() === owner.toString()
    }
    
  }
  
}
```

```typescript
// my/admin/app/app.view.ts
namespace $ {
  
  export class $my_admin_app extends $mol_book2 {
    
    pages() {
      return [
        this.Menu_page(),
        ...this.content_pages(),
      ]
    }
    
    @$mol_mem
    Menu_page() {
      return new $mol_page()
        .title('Admin')
        .body([
          this.Nav_users(),
          this.Nav_posts(),
          $my_admin.is_admin() ? this.Nav_roles() : null,
        ].filter(Boolean) as $mol_view[])
    }
    
    @$mol_mem
    content_pages() {
      switch (this.current_page()) {
        case 'users': return [this.Users_page()]
        case 'posts': return [this.Posts_page()]
        case 'roles': return [this.Roles_page()]
        default: return []
      }
    }
    
    @$mol_mem
    current_page(next?: string) {
      return this.$.$mol_state_arg.value('page', next) ?? ''
    }
    
    // Навигация
    @$mol_mem
    Nav_users() {
      return new $mol_link()
        .title('Users')
        .arg({ page: 'users' })
    }
    
    @$mol_mem
    Nav_posts() {
      return new $mol_link()
        .title('Posts')
        .arg({ page: 'posts' })
    }
    
    @$mol_mem
    Nav_roles() {
      return new $mol_link()
        .title('Roles')
        .arg({ page: 'roles' })
    }
    
    // Страницы
    @$mol_mem
    Users_page() {
      return new $my_admin_users_page()
    }
    
    @$mol_mem
    Posts_page() {
      return new $my_admin_posts_page()
    }
    
    @$mol_mem
    Roles_page() {
      return new $my_admin_roles_panel()
        .app(() => $my_admin)
    }
    
  }
  
}
```

---

## Советы и лучшие практики

### 1. Права доступа

```typescript
// Шаблон для создания сущностей с правами
function create_entity_preset(is_public: boolean = true) {
  const preset: [$giper_baza_pass | null, $giper_baza_rank][] = []
  
  if (is_public) {
    preset.push([null, $giper_baza_rank_read])
  }
  
  preset.push([$giper_baza_auth.current().pass(), $giper_baza_rank_rule])
  
  return preset
}
```

### 2. Оптимизация чтения

```typescript
// Используйте @$mol_mem для кэширования
@$mol_mem
users_by_role() {
  const map = new Map<string, $my_admin_user[]>()
  
  for (const user of this.active_users()) {
    const role = user.Role()?.val() ?? 'user'
    if (!map.has(role)) map.set(role, [])
    map.get(role)!.push(user)
  }
  
  return map
}
```

### 3. Валидация данных

```typescript
// Валидация перед сохранением
@$mol_action
save_user(user: $my_admin_user, data: UserFormData) {
  // Валидация
  if (!data.email || !this.is_valid_email(data.email)) {
    throw new Error('Invalid email')
  }
  
  if (!data.name || data.name.length < 2) {
    throw new Error('Name is too short')
  }
  
  // Сохранение
  user.Title(null)!.val(data.name)
  user.Email(null)!.val(data.email)
  user.touch()
}

is_valid_email(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
```

### 4. Обработка ошибок

```typescript
// Обёртка для действий с проверкой прав
@$mol_action
protected_action<T>(
  required_role: 'admin' | 'editor',
  action: () => T
): T {
  const has_permission = required_role === 'admin' 
    ? this.is_admin() 
    : this.is_editor()
  
  if (!has_permission) {
    throw new Error(`Requires ${required_role} role`)
  }
  
  return action()
}

// Использование
@$mol_action
delete_user(user: $my_admin_user) {
  return this.protected_action('admin', () => {
    user.soft_delete()
  })
}
```

### 5. Экспорт/Импорт данных

```typescript
// Экспорт в JSON
@$mol_action
async export_data() {
  const storage = $my_admin.storage()
  const data = {
    users: storage.Users()?.remote_list().map(u => ({
      name: u.Title()?.val(),
      email: u.Email()?.val(),
      role: u.Role()?.val(),
    })),
    posts: storage.Posts()?.remote_list().map(p => ({
      title: p.Title()?.val(),
      content: p.Content()?.text(),
      published: p.is_published(),
    })),
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = 'admin-export.json'
  a.click()
  
  URL.revokeObjectURL(url)
}
```

---

## Заключение

Giper Baza предоставляет мощную основу для создания админок с:

- **Автоматической синхронизацией** - не нужен REST API
- **Криптографической безопасностью** - права на уровне данных
- **Реалтайм-коллаборацией** - несколько админов одновременно
- **Offline-поддержкой** - работа без интернета

Ключевые отличия от традиционных подходов:
1. Данные синхронизируются автоматически, не нужно писать endpoints
2. Права проверяются на уровне базы данных
3. Каждое изменение подписано и может быть отслежено
4. Конфликты разрешаются автоматически благодаря CRDT

Для более сложных сценариев изучите реальный пример админки в `/apxu/samosbor/map/`.
