# Готовые компоненты

Сверено с `mol/*/*.view.tree`. Перед тем как писать своё: `ls mol | grep -i <слово>` и прочитать дерево кандидата, там все свойства. Любое свойство любого вложенного под-вида переопределяется строкой в дереве.

## Разметка

| Класс | Что | Ключевое |
| --- | --- | --- |
| `$mol_view` | flex-контейнер | `sub /`, `attr *`, `style *`, `event *`, `dom_name` |
| `$mol_row` | перенос по строкам | `sub /` |
| `$mol_bar` | скруглённая группа контролов | `sub /` |
| `$mol_hor` | горизонтальный ряд | `sub /` |
| `$mol_list` | вертикальный список с виртуализацией | `rows /`, `Empty` |
| `$mol_scroll` | прокрутка, один ребёнок | `scroll_top?`, `scroll_left?` |
| `$mol_page` | страница | `title`, `tools /`, `body /`, `foot /`, `head /`, `Logo` |
| `$mol_section` | заголовок + содержимое | `title`, `level`, `tools /`, `content /` |
| `$mol_card` | карточка | `content /`, `status`, `title` |
| `$mol_labeler` | подпись сверху | `title`, `content /`, `label /` |
| `$mol_expander` | раскрывашка | `title`, `expanded?`, `content /`, `Tools` |
| `$mol_paragraph` | текст с переносами | `title` |
| `$mol_text` | markdown | `text`, `uri_base` |
| `$mol_image` | картинка | `uri`, `title`, `loading` |
| `$mol_chip` | бейдж | `title`, `hint` |
| `$mol_speck` | точка-счётчик | `value` |
| `$mol_status` | строка статуса | `message` |
| `$mol_dimmer` | подсветка совпадений | `haystack`, `needle` |

## Навигация

| Класс | Что | Ключевое |
| --- | --- | --- |
| `$mol_link` | ссылка | `uri` или `arg *`, `title`, `sub /`, `current`, `external` |
| `$mol_book2` | книга страниц, master-detail | `pages /`, `placeholders /`, `Placeholder` |
| `$mol_book2_catalog` | книга с меню и роутингом | `param`, `spread_ids`, `Spread*`, `menu_title`, `menu_tools /` |
| `$mol_deck` | вкладки | `items /`, `switch_options *`, `current?` |
| `$mol_nav` | плагин клавиатурной навигации | `keys_y`, `current_y?`, `cycle?` |
| `$mol_hotkey` | плагин хоткеев | `key *` |

Свой `override sub()` у `$mol_book2` ломает подъезд к новой странице. Оверлеи вешать через `placeholders()`.

## Кнопки и ввод

| Класс | Что | Ключевое |
| --- | --- | --- |
| `$mol_button` | кнопка без стиля, тега нет | `click?`, `sub /`, `enabled`, `hint` |
| `$mol_button_minor` / `_major` | обычная / акцентная | то же, `title` |
| `$mol_button_open` | выбор файла | `files?`, `accept`, `multiple` |
| `$mol_attach` | список вложений с добавлением | `items?`, `attach_new?`, `item_drop*?` |
| `$mol_string` | однострочный ввод | `value?`, `hint`, `enabled`, `submit?`, `keyboard`, `length_max` |
| `$mol_textarea` | многострочный, он же редактор кода | `value?`, `hint`, `highlight`, `submit?` |
| `$mol_number` | число | `value?`, `precision_change`, `precision_view`, `value_min`, `value_max` |
| `$mol_check` | чекбокс-кнопка | `checked?`, `title`, `label /`, `Icon` |
| `$mol_check_box` | с галкой | `checked?`, `title` |
| `$mol_check_list` | группа чекбоксов | `dictionary *`, `option_checked*?` |
| `$mol_switch` | радио-группа | `value?`, `options *` |
| `$mol_select` | выпадающий выбор | `value?`, `dictionary? *` или `options /`, `hint` |
| `$mol_pick` | кнопка с попапом | `showed?`, `trigger_content /`, `bubble_content /` |
| `$mol_pop` | попап у якоря | `showed?`, `Anchor`, `bubble_content /`, `align` |
| `$mol_search` | поле поиска с подсказками | `query?`, `suggests /`, `submit?` |
| `$mol_date` | выбор даты | `value?`, `enabled` |
| `$mol_calendar` | сетка месяца, не пикер | `month_moment`, `Day*` |
| `$mol_form` | форма | `form_fields /`, `buttons /`, `submit?`, `submit_allowed`, `errors *` |
| `$mol_form_field` | поле формы с подписью | `name`, `control`, `bids /` |
| `$mol_grid` | таблица | `row_ids`, `col_ids`, `records *`, `Cell*`, `cell*`, `hierarchy` |

`$mol_switch` не даёт `label`, это `$mol_check_list` с одним значением. У `$mol_number` `precision` раздаётся в оба `precision_*`, поэтому `precision 100` показывает 3000 как 30. Шаг стрелок через `precision_change`. Не задавать `align` у `$mol_pop`, он сам разворачивает пузырь внутрь вьюпорта.

## Плагины и утилиты

| Класс | Что |
| --- | --- |
| `$mol_theme_auto` | плагин темы, `attr * mol_theme` на хозяине |
| `$bog_theme_auto` | то же с переключением light/dark/system и своим списком тем |
| `$mol_plugin` | база для своего плагина, рендерит атрибуты на узле хозяина |
| `$mol_follower` | следование за якорем |
| `$mol_transit` | анимация перехода |
| `$mol_state_arg` / `_local` / `_session` | URL, localStorage, sessionStorage |
| `$mol_fetch` | сеть синхронно из фибры |
| `$mol_after_timeout` / `_frame` / `_tick` | таймеры, привязанные к `$` |
| `$mol_match_text` | фильтр по строке для списков |
| `$mol_icon_*` | иконки, `ls mol/icon` |

## bog

| Класс | Что |
| --- | --- |
| `$bog_builderui_*` | shadcn-подобный набор: `button` с `variant`, `card`, `dialog` с `showed?`, `tabs`, `toast` с `kind`, `field`, `select`, `badge`, `alert`, `menu`, `progress`, `slider`, `skeleton`, `tooltip`, `breadcrumbs`, `gallery`, `chart` |
| `$bog_builderui_skin` | плагин пресетов: `lights`, `base`, `accent`, `chart`, `radius`, шрифты |
| `$bog_builderui_router` | path-роутинг вместо `#!`, активировать в `static {}` приложения |
| `$bog_theme_*` | `auto`, `toggle`, `picker` |
| `$bog_tooltip`, `$bog_popup`, `$bog_favicon` | по имени |
| `$bog_kit_*` | пейджер, контекст |
| `$bog_rec_*` | запись и реплей сессий, фаззер для тестов |

Пресеты `builderui` включаются плагином `$bog_builderui_skin` в `plugins /` корня: свойства `lights`, `base`, `accent`, `chart`, `radius`, `font_body`, `font_head`, у всех есть дефолты. Значения в `bog/builderui/theme.css`.
