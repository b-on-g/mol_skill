# Реактивный auto-scroll (чат / стриминг / логи) в $mol

Когда пригодится: нужно чтобы контейнер сам скроллился к низу при новом элементе списка — чат, лента сообщений, live-логи, output стрима LLM. Пользователь просит «как в ChatGPT — само проматывается вниз».

Если задача не про auto-scroll — не грузи этот файл.

## Три подводных камня (наступали, знаем)

### 1. `$mol_list` не имеет reactive scroll API — нужен `$mol_scroll`

`$mol_list` — это верстка списка, у него нет `scroll_top`. Обёрни в `$mol_scroll`:

```
<= Body $mol_scroll
    sub /
        <= Messages $mol_list rows <= rows
```

### 2. Не подписывайся на `history()` неявно через `super.dom_tree()` — сделай явные мем-каналы

Полагаться на «супер сам транзитивно подпишется на историю через рендер-цепочку» — ненадёжно. Проверено: работает нестабильно, при небольших изменениях (например, убрать лог, который случайно читал `this.history()`) auto-scroll молча ломается.

Правильно — явные `@$mol_mem` каналы для `scroll_height` (с явным `void this.history()`) и `scroll_top`. Тогда зависимость в реактивном графе видна, `dom_tree` подписан через `scroll_height()` на `history()`, инвалидация работает детерминированно.

```ts
@$mol_mem
scroll_height(): number {
    // Явная подписка на history — при новом сообщении канал инвалидируется,
    // тянет за собой dom_tree, и scroll_top получает свежее значение.
    void this.history()
    return this.Body().dom_node().scrollHeight
}

@$mol_mem
scroll_top( next?: number ): number {
    const el = this.Body().dom_node() as HTMLElement
    if( next !== undefined ) el.scrollTop = next
    return el.scrollTop
}

@$mol_mem
override dom_tree( next?: Element ): Element {
    const node = super.dom_tree( next )
    this.scroll_top( this.scroll_height() )
    return node
}
```

Почему `dom_tree`, а не `auto()` / `sub()`: `dom_tree` — `@$mol_mem`, реактивно зависит от вызова `scroll_height()`, тот — от `history()`. При новом сообщении цепочка `history → scroll_height → dom_tree` инвалидируется, `dom_tree` пере-выполняется через `$mol_wire_atom.watch`. `super.dom_tree()` рендерит весь subtree — после его возврата новое сообщение уже в DOM, `scroll_height()` возвращает актуальное значение, `scroll_top(N)` пишет в `el.scrollTop`.

Также `scroll_top` тут — **свой** мем на классе чата, а не `Body().scroll_top()` встроенного `$mol_scroll`. Не полагайся на встроенный сеттер `$mol_scroll.scroll_top` из чужой цепочки инвалидации — заведи свой мем-канал.

### 3. Каскад `min-height: 0` — обязателен

CSS-дефолт: flex-child с `flex.grow:1 + overflow:auto` имеет **`min-height: auto`** = intrinsic-content-size. Из-за этого скроллер раздувается до высоты всех сообщений (например, 10к px), скролл уезжает на внешний контейнер (app.Body / вьюпорт), а `Body.scrollTop = X` **не даёт визуального эффекта** — потому что Body фактически не является скроллером.

Каскад ставится на **все flex-предки** между вьюпортом и `$mol_scroll`:

```ts
// chat.view.css.ts
$mol_style_define( $raggu_web_front_chat, {
    flex: { direction: 'column', shrink: 1 },
    minWidth: 0,
    minHeight: 0,        // ← на самом chat
    height: '100%',

    Body: {
        flex: { grow: 1, direction: 'column' },
        overflow: 'auto',
        minHeight: 0,    // ← на Body тоже
        ...
    },
} )
```

И в родительском `app.view.css.ts` `Main` и `Body` тоже должны иметь `minHeight: 0` (обычно они уже проставлены в scaffold).

## Полный рабочий рецепт

**view.tree:**

```
$my_chat $bog_builderui_div
    rows /
    sub /
        <= Body $mol_scroll
            sub /
                <= Messages $mol_list rows <= rows
        <= Footer ...
```

**view.ts:**

```ts
namespace $.$$ {
    export class $my_chat extends $.$my_chat {

        @$mol_mem
        history( next?: Msg[] ): Msg[] {
            return this.$.$mol_state_session.value( '$my_chat.history', next as any ) ?? []
        }

        override rows() {
            return this.history().map( ( _, i ) => this.Message( i ) )
        }

        @$mol_mem
        scroll_height(): number {
            void this.history()
            return this.Body().dom_node().scrollHeight
        }

        @$mol_mem
        scroll_top( next?: number ): number {
            const el = this.Body().dom_node() as HTMLElement
            if( next !== undefined ) el.scrollTop = next
            return el.scrollTop
        }

        @$mol_mem
        override dom_tree( next?: Element ): Element {
            const node = super.dom_tree( next )
            this.scroll_top( this.scroll_height() )
            return node
        }
    }
}
```

**view.css.ts:**

```ts
$mol_style_define( $my_chat, {
    flex: { direction: 'column' },
    minHeight: 0,
    height: '100%',

    Body: {
        flex: { grow: 1, direction: 'column' },
        overflow: 'auto',
        minHeight: 0,
    },
    Messages: {
        gap: '16px',
    },
} )
```

Стриминг ассистента работает автоматически: каждый апдейт текста в `history()` → `scroll_height` инвалидируется → `dom_tree` re-run → `scroll_top(fresh scroll_height)` → DOM-запись.

## Как НЕ надо (проверено, не работает)

- ❌ `auto()` в чат-view — недетерминированный порядок фреймов между `$mol_wire_atom.watch` и твоим `$mol_after_frame`, race, DOM устаревший
- ❌ `MutationObserver` / `addEventListener('scroll')` — нативные API, юзер справедливо потребует «делай на mol»
- ❌ CSS `flex-direction: column-reverse` — ломает virtualization `$mol_list`, ломает tab/reader-order, sticky-to-bottom работает нестабильно в браузерах
- ❌ `Body().scroll_top( Number.MAX_SAFE_INTEGER )` — мем-кэш убивает второй вызов
- ❌ **Прямая запись `body.scrollTop = body.scrollHeight` в обход мем-канала** — обходит систему реактивности, работа зависит от того, случайно ли кто-то в теле метода подписан на `history()` (например через лог). Убрал лог — сломалось. Не делай так.
- ❌ Только `$mol_list` без `$mol_scroll` — некуда встраивать логику, `.dom_node()` не даёт reactive-канал
- ❌ Полагаться на `super.dom_tree()` как единственный источник подписки на `history()` — работает нестабильно, лучше явный `void this.history()` в `scroll_height`
- ❌ `min-height: 0` только на Body без каскада вверх — chat всё равно раздувается intrinsic-content'ом

## Sticky-if-near-bottom (опционально)

Если хочется чтобы при листании юзером вверх auto-scroll НЕ дёргал вьюху вниз:

```ts
@$mol_mem
scroll_top( next?: number ): number {
    const el = this.Body().dom_node() as HTMLElement
    if( next !== undefined ) {
        const was_near = el.scrollHeight - el.scrollTop - el.clientHeight < 120
        if( was_near ) el.scrollTop = next
    }
    return el.scrollTop
}
```

Проверка `was_near` — до записи, `el.scrollTop` пока что старое значение (юзер видит где он был). Пишем только если он был у низа.

## Диагностика когда не скроллит

Логи временно в `dom_tree` — walk-up по цепочке родителей смотрим кто реально имеет overflow:

```ts
@$mol_mem
override dom_tree( next?: Element ): Element {
    const node = super.dom_tree( next )
    const body = this.Body().dom_node() as HTMLElement
    let cur: HTMLElement | null = body
    while( cur ) {
        const cs = getComputedStyle( cur )
        console.log(
            cur.tagName,
            cur.getAttribute( 'mol_view_class' )?.split( ' ' )[ 0 ],
            'sH=', cur.scrollHeight, 'cH=', cur.clientHeight,
            'overflow=', cs.overflowY,
            'scrolls=', cur.scrollHeight > cur.clientHeight + 1,
        )
        cur = cur.parentElement
    }
    this.scroll_top( this.scroll_height() )
    return node
}
```

Смотри где `scrolls=true`. Если это НЕ Body — где-то по цепочке от Body вверх не хватает `min-height: 0` на flex-child. Ставь его на каждый такой промежуточный контейнер.
