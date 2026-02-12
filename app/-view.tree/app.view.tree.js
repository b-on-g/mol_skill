	($.$bog_mol_app) = class $bog_mol_app extends ($.$giper_bot) {
		reset(next){
			if(next !== undefined) return next;
			return null;
		}
		Reset_icon(){
			const obj = new this.$.$mol_icon_trash_can_outline();
			return obj;
		}
		Reset(){
			const obj = new this.$.$mol_button_minor();
			(obj.hint) = () => ("Сбросить диалог");
			(obj.click) = (next) => ((this.reset(next)));
			(obj.sub) = () => ([(this.Reset_icon())]);
			return obj;
		}
		Lights(){
			const obj = new this.$.$mol_lights_toggle();
			return obj;
		}
		digest(next){
			if(next !== undefined) return next;
			return "";
		}
		Digest(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ((this.digest()));
			return obj;
		}
		Faq_start_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("`npm start`, затем в том же процессе:\n```\ngiper/baza/app/run port=9090\n```\n— Дим");
			return obj;
		}
		Faq_start(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Как запустить Giper Baza?");
			(obj.content) = () => ([(this.Faq_start_text())]);
			return obj;
		}
		Faq_npm_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("**1. Через стабы** — `const pdfjs = lib_pdfjs`\n[Пример](https://github.com/hyoo-ru/mam_lib/blob/master/pdfjs/pdfjs.ts)\n\n**2. Через meta.tree** — если модуль криво бандлится:\n[yuf/fflate](https://github.com/zerkalica/yuf/tree/master/fflate)\n```\nbuild yuf_fflate_npm_build node ./.npm/.build.mjs\n```\n— Sergey Yuferev");
			return obj;
		}
		Faq_npm(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Как интегрировать npm-модуль?");
			(obj.content) = () => ([(this.Faq_npm_text())]);
			return obj;
		}
		Faq_local_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("```\nmol_state_local.value( key, value )\n```\nРеактивный аналог localStorage. Значения сериализуются в JSON.");
			return obj;
		}
		Faq_local(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Как сохранить в localStorage?");
			(obj.content) = () => ([(this.Faq_local_text())]);
			return obj;
		}
		Faq_cdn_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("**Нет.** mol необходим MAM и TypeScript. Нужен сборщик.\n\n> «Накостылять на коленке — это не к нам точно.» — Дим\n\nVue — один файл ~40KB. mol — 250+ модулей\nс автообнаружением зависимостей и кастомной сборкой.");
			return obj;
		}
		Faq_cdn(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Можно ли подключить mol через CDN?");
			(obj.content) = () => ([(this.Faq_cdn_text())]);
			return obj;
		}
		Faq_forms_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("`mol_form` + `mol_form_field`. Вместо схем — реактивные геттеры `*_bid()`:\n```\nname_bid() {\n  if( !this.name() ) return 'Обязательное поле'\n  return ''\n}\n```\n`bid` = Bad Input Data. Пустая строка = валидно.\nЕсть `mol_form_draft` с undo/reset.");
			return obj;
		}
		Faq_forms(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Аналог React Hook Form + Zod?");
			(obj.content) = () => ([(this.Faq_forms_text())]);
			return obj;
		}
		Faq_tables_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("`mol_grid` — проще TanStack. Есть виртуальный скролл (100K строк),\nиерархия, автоопределение типов. Нет сортировки, фильтрации, ресайза из коробки.\n[calc.hyoo.ru](https://calc.hyoo.ru/)");
			return obj;
		}
		Faq_tables(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Таблицы как TanStack Table?");
			(obj.content) = () => ([(this.Faq_tables_text())]);
			return obj;
		}
		Faq_reuse_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Каждый компонент имеет уникальное FQN. Можно взять из любого проекта по имени.\n> «Каждое слово в tree — точка расширения» — Sergey Yuferev");
			return obj;
		}
		Faq_reuse(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Переиспользование компонентов?");
			(obj.content) = () => ([(this.Faq_reuse_text())]);
			return obj;
		}
		Faq_custom_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Каждое свойство в view.tree — точка расширения.\nПеребивается в наследнике или при создании экземпляра.\n[Пример слота](https://github.com/zerkalica/yuf/blob/20d2992d99aa69f036e5eb5869b7b3a931e396ab/catalog/app/app.view.tree#L27)");
			return obj;
		}
		Faq_custom(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Как кастомизировать компонент?");
			(obj.content) = () => ([(this.Faq_custom_text())]);
			return obj;
		}
		Faq_css_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Обычный TypeScript — переменные и spread:\n```\nconst shared: mol_style_properties = { display: 'grid' }\nRangeItem: { ...shared },\n```\nЛучше выделить общий компонент. — Дим");
			return obj;
		}
		Faq_css(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Переиспользование стилей в CSS-in-TS?");
			(obj.content) = () => ([(this.Faq_css_text())]);
			return obj;
		}
		Faq_zip_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("[yuf/fflate](https://github.com/zerkalica/yuf/blob/master/fflate/fflate.ts)\nБилдится прозрачно, грузится динамически. — Sergey Yuferev");
			return obj;
		}
		Faq_zip(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("ZIP-архивы в mol?");
			(obj.content) = () => ([(this.Faq_zip_text())]);
			return obj;
		}
		Faq_seo_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("[prelander](https://github.com/koplenov/prelander/) — индексация контента.\nИли prerender-сервер: Chrome headless + Express + prerender-node.");
			return obj;
		}
		Faq_seo(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("SEO для Giper Baza?");
			(obj.content) = () => ([(this.Faq_seo_text())]);
			return obj;
		}
		Faq_builds_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("[yuf/depser](https://github.com/zerkalica/yuf/blob/master/depser/depser)\nСнепшотит зависимости через сабмодули. — Sergey Yuferev");
			return obj;
		}
		Faq_builds(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Воспроизводимые сборки?");
			(obj.content) = () => ([(this.Faq_builds_text())]);
			return obj;
		}
		Faq_template_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("[richtemplate](https://github.com/Lyumih/richtemplate) — рекомендуется по умолчанию.");
			return obj;
		}
		Faq_template(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Шаблон проекта для старта?");
			(obj.content) = () => ([(this.Faq_template_text())]);
			return obj;
		}
		Faq_colors_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("**default** — базовые, **base** — бренд, **special** — по вкусу,\n**current** — ярче (выделение), **accent** — ещё ярче (ошибки). — Дим");
			return obj;
		}
		Faq_colors(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Система цветов / тем?");
			(obj.content) = () => ([(this.Faq_colors_text())]);
			return obj;
		}
		Faq_versioning_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("**Versionless** — нет мажорных версий. Обратная совместимость.\nМожно зафиксировать, спулив до коммита. Зависимостей минимум (1-2).");
			return obj;
		}
		Faq_versioning(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Версионирование в mol?");
			(obj.content) = () => ([(this.Faq_versioning_text())]);
			return obj;
		}
		Faq_section_chat(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Из чатов разработчиков");
			(obj.content) = () => ([
				(this.Faq_start()), 
				(this.Faq_npm()), 
				(this.Faq_local()), 
				(this.Faq_cdn()), 
				(this.Faq_forms()), 
				(this.Faq_tables()), 
				(this.Faq_reuse()), 
				(this.Faq_custom()), 
				(this.Faq_css()), 
				(this.Faq_zip()), 
				(this.Faq_seo()), 
				(this.Faq_builds()), 
				(this.Faq_template()), 
				(this.Faq_colors()), 
				(this.Faq_versioning())
			]);
			return obj;
		}
		Faq_setup_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("```bash\ngit clone https://github.com/hyoo-ru/mam.git ./mam && cd mam\nnpm install && npm start\n```\nОткроется на `http://localhost:9080/`. MAM отслеживает изменения автоматически.");
			return obj;
		}
		Faq_setup(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Как установить и запустить проект?");
			(obj.content) = () => ([(this.Faq_setup_text())]);
			return obj;
		}
		Faq_structure_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("```\nmam/my/app/\n  index.html       — точка входа\n  app.view.tree    — декларативная вёрстка\n  app.view.ts      — логика компонента\n  app.view.css.ts  — типизированные стили\n  app.meta.tree    — мета-настройки\n```\nИмена файлов определяют назначение:\n`*.node.ts` — сервер, `*.web.ts` — браузер, `*.test.ts` — тесты.");
			return obj;
		}
		Faq_structure(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Структура проекта?");
			(obj.content) = () => ([(this.Faq_structure_text())]);
			return obj;
		}
		Faq_viewtree_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("`<=` — односторонняя привязка, `<=>` — двусторонняя,\n`/` — список, `*` — словарь, `@` — локализация, `\\\\` — строка.\n```\nmol_page\n  title <= app_title @ My App\n  body /\n    <= Name mol_string\n      value? <=> name?\n```");
			return obj;
		}
		Faq_viewtree(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Синтаксис view.tree?");
			(obj.content) = () => ([(this.Faq_viewtree_text())]);
			return obj;
		}
		Faq_reactivity_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("`@mol_mem` — кэшированное свойство (авто-обновляется).\n`@mol_mem_key` — то же, с параметром.\n`@mol_action` — модификация состояния.\n```\n@mol_mem count() { return 0 }\n@mol_action increment() { this.count( this.count() + 1 ) }\n```");
			return obj;
		}
		Faq_reactivity(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Реактивность в mol?");
			(obj.content) = () => ([(this.Faq_reactivity_text())]);
			return obj;
		}
		Faq_components_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Кнопки: `mol_button_major`, `mol_button_minor`\nВвод: `mol_string`, `mol_number`, `mol_textarea`\nСписки: `mol_list`, `mol_grid`\nФормы: `mol_form`, `mol_form_field`\nВыбор: `mol_select`, `mol_switch`, `mol_check`\nСтраницы: `mol_page`, `mol_book2`\nКалендарь: `mol_calendar`");
			return obj;
		}
		Faq_components(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Встроенные компоненты?");
			(obj.content) = () => ([(this.Faq_components_text())]);
			return obj;
		}
		Faq_differences_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("**Реактивность** — автоматическая (не нужны useState, useEffect).\n**Ленивость** — компоненты создаются при необходимости.\n**Размер** — ~100KB vs React ~300KB+ vs Angular ~500KB+.\n**Стили** — типизированные, проверяются TypeScript.\nВ 3 раза меньше кода чем React+Redux+Router.");
			return obj;
		}
		Faq_differences(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Отличия от React/Angular?");
			(obj.content) = () => ([(this.Faq_differences_text())]);
			return obj;
		}
		Faq_section_quickstart(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Быстрый старт");
			(obj.content) = () => ([
				(this.Faq_setup()), 
				(this.Faq_structure()), 
				(this.Faq_viewtree()), 
				(this.Faq_reactivity()), 
				(this.Faq_components()), 
				(this.Faq_differences())
			]);
			return obj;
		}
		Faq_giper_what_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Распределённая CRDT-база: offline-first, криптографическая авторизация,\nавтосинхронизация, merge без конфликтов, zero trust.\n\nСтатьи: [habr/943606](https://habr.com/ru/articles/943606/),\n[habr/956154](https://habr.com/ru/articles/956154/)");
			return obj;
		}
		Faq_giper_what(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Что такое Giper Baza?");
			(obj.content) = () => ([(this.Faq_giper_what_text())]);
			return obj;
		}
		Faq_giper_arch_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("```\nGlob (глобальная БД)\n └─ Land (раздел с правами)\n   └─ Node (узел данных)\n     └─ Unit (ребро графа)\n```\nТипы: `atom_text`, `atom_bint`, `atom_real`, `atom_time`,\n`list_str`, `list_link_to`, `dict`, `dict_to`.");
			return obj;
		}
		Faq_giper_arch(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Архитектура Giper Baza?");
			(obj.content) = () => ([(this.Faq_giper_arch_text())]);
			return obj;
		}
		Faq_giper_auth_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Криптографическая: Auth (приватный ключ), Pass (публичный),\nLord (ID пользователя). Proof-of-Work для регистрации.\nНе нужны логины/пароли — ключи генерируются автоматически.");
			return obj;
		}
		Faq_giper_auth(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Аутентификация в Giper Baza?");
			(obj.content) = () => ([(this.Faq_giper_auth_text())]);
			return obj;
		}
		Faq_giper_roles_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Уровни (Tier): deny, read, post, pull, rule.\nПрава задаются на уровне Land через пресеты:\n```\nconst land = glob.land_grab([\n  [null, giper_baza_rank_read],\n  [myPass, giper_baza_rank_rule],\n])\n```");
			return obj;
		}
		Faq_giper_roles(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Права и роли?");
			(obj.content) = () => ([(this.Faq_giper_roles_text())]);
			return obj;
		}
		Faq_giper_crud_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Модель:\n```\nclass MyTask extends giper_baza_entity.with({\n  Done: giper_baza_atom_bool,\n  CreatedAt: giper_baza_atom_time,\n}) {}\n```\nСоздание: `list.make(preset)`, чтение: `.Title()?.val()`,\nобновление: `.Title(null)!.val(next)`, удаление: `list.cut(link)`.");
			return obj;
		}
		Faq_giper_crud(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("CRUD в Giper Baza?");
			(obj.content) = () => ([(this.Faq_giper_crud_text())]);
			return obj;
		}
		Faq_giper_sync_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Автоматическая. Данные пишутся локально, синкаются при наличии сети.\nНоды на сервере реплицируют данные. UI обновляется автоматически.\nМожно развернуть доп. ноды для масштабирования.");
			return obj;
		}
		Faq_giper_sync(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Синхронизация?");
			(obj.content) = () => ([(this.Faq_giper_sync_text())]);
			return obj;
		}
		Faq_section_giper(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Giper Baza");
			(obj.content) = () => ([
				(this.Faq_giper_what()), 
				(this.Faq_giper_arch()), 
				(this.Faq_giper_auth()), 
				(this.Faq_giper_roles()), 
				(this.Faq_giper_crud()), 
				(this.Faq_giper_sync())
			]);
			return obj;
		}
		Faq_admin_arch_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("```\nUI → Application Logic → Storage → Models → giper_baza_glob\n```\nМодули: app/, storage/, role/, entity/, card/, list/.");
			return obj;
		}
		Faq_admin_arch(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Архитектура админки?");
			(obj.content) = () => ([(this.Faq_admin_arch_text())]);
			return obj;
		}
		Faq_admin_roles_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Роли: admin, editor, viewer. Каждая с набором разрешений.\nПроверка через `role.check_permission()`.\nПрава на уровне данных через Giper Baza Land.");
			return obj;
		}
		Faq_admin_roles(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Роли в админке?");
			(obj.content) = () => ([(this.Faq_admin_roles_text())]);
			return obj;
		}
		Faq_admin_entity_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("Базовая сущность: Title, CreatedAt, UpdatedAt, CreatedBy, Status.\nSoft delete и архивирование. Наследуйте от базовой модели.");
			return obj;
		}
		Faq_admin_entity(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Модели сущностей?");
			(obj.content) = () => ([(this.Faq_admin_entity_text())]);
			return obj;
		}
		Faq_section_admin(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Админка на Giper Baza");
			(obj.content) = () => ([
				(this.Faq_admin_arch()), 
				(this.Faq_admin_roles()), 
				(this.Faq_admin_entity())
			]);
			return obj;
		}
		Faq_tauri_setup_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("1. Установить prerequisites (Xcode/MSVC/libwebkit)\n2. Установить Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`\n3. `npm install` в MAM\n4. Dev: `npm start` + `npx tauri dev` в отдельном терминале");
			return obj;
		}
		Faq_tauri_setup(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Как настроить Tauri?");
			(obj.content) = () => ([(this.Faq_tauri_setup_text())]);
			return obj;
		}
		Faq_tauri_build_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("1. Собрать mol: `npm start bog/quiz` → Ctrl+C\n2. Собрать Tauri: `npx tauri build`\n3. CI/CD через GitHub Actions для Linux/Windows/macOS.");
			return obj;
		}
		Faq_tauri_build(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Сборка Tauri?");
			(obj.content) = () => ([(this.Faq_tauri_build_text())]);
			return obj;
		}
		Faq_section_tauri(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Tauri (десктоп)");
			(obj.content) = () => ([(this.Faq_tauri_setup()), (this.Faq_tauri_build())]);
			return obj;
		}
		Faq_docs_text(){
			const obj = new this.$.$mol_text();
			(obj.text) = () => ("- [mol.hyoo.ru](https://mol.hyoo.ru/#!section=docs) — основная дока\n- [github.com/hyoo-ru](https://github.com/hyoo-ru) — GitHub\n- Телеграм-чат разработчиков — лучший источник ответов\n- [richtemplate](https://github.com/Lyumih/richtemplate) — шаблон для старта");
			return obj;
		}
		Faq_docs(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Где найти документацию?");
			(obj.content) = () => ([(this.Faq_docs_text())]);
			return obj;
		}
		Faq_section_docs(){
			const obj = new this.$.$mol_expander();
			(obj.title) = () => ("Документация и ссылки");
			(obj.content) = () => ([(this.Faq_docs())]);
			return obj;
		}
		Faq(){
			const obj = new this.$.$mol_list();
			(obj.rows) = () => ([
				(this.Faq_section_chat()), 
				(this.Faq_section_quickstart()), 
				(this.Faq_section_giper()), 
				(this.Faq_section_admin()), 
				(this.Faq_section_tauri()), 
				(this.Faq_section_docs())
			]);
			return obj;
		}
		dialog_title(next){
			if(next !== undefined) return next;
			return "FAQ Bot";
		}
		Context(){
			const obj = new this.$.$mol_page();
			(obj.title) = () => ("База знаний");
			(obj.tools) = () => ([(this.Reset()), (this.Lights())]);
			(obj.body) = () => ([(this.Digest()), (this.Faq())]);
			return obj;
		}
	};
	($mol_mem(($.$bog_mol_app.prototype), "reset"));
	($mol_mem(($.$bog_mol_app.prototype), "Reset_icon"));
	($mol_mem(($.$bog_mol_app.prototype), "Reset"));
	($mol_mem(($.$bog_mol_app.prototype), "Lights"));
	($mol_mem(($.$bog_mol_app.prototype), "digest"));
	($mol_mem(($.$bog_mol_app.prototype), "Digest"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_start_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_start"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_npm_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_npm"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_local_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_local"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_cdn_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_cdn"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_forms_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_forms"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_tables_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_tables"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_reuse_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_reuse"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_custom_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_custom"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_css_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_css"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_zip_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_zip"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_seo_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_seo"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_builds_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_builds"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_template_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_template"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_colors_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_colors"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_versioning_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_versioning"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_section_chat"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_setup_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_setup"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_structure_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_structure"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_viewtree_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_viewtree"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_reactivity_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_reactivity"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_components_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_components"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_differences_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_differences"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_section_quickstart"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_what_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_what"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_arch_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_arch"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_auth_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_auth"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_roles_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_roles"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_crud_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_crud"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_sync_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_giper_sync"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_section_giper"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_admin_arch_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_admin_arch"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_admin_roles_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_admin_roles"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_admin_entity_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_admin_entity"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_section_admin"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_tauri_setup_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_tauri_setup"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_tauri_build_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_tauri_build"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_section_tauri"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_docs_text"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_docs"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq_section_docs"));
	($mol_mem(($.$bog_mol_app.prototype), "Faq"));
	($mol_mem(($.$bog_mol_app.prototype), "dialog_title"));
	($mol_mem(($.$bog_mol_app.prototype), "Context"));

//# sourceMappingURL=app.view.tree.js.map