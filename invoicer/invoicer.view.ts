namespace $.$$ {
	interface Requisites {
		company_name: string
		inn: string
		kpp: string
		ogrn: string
		legal_address: string
		bank_name: string
		bik: string
		account: string
		corr_account: string
		director: string
		phone: string
		email: string
	}

	interface Template {
		id: string
		name: string
		content: ArrayBuffer
	}

	const LLM_URL_KEY = 'bog_mol_invoicer_llm_url'
	const LLM_KEY_KEY = 'bog_mol_invoicer_llm_key'
	const TEMPLATES_DB_NAME = 'bog_mol_invoicer_templates'
	const TEMPLATES_STORE_NAME = 'templates'
	const SELECTED_TEMPLATE_KEY = 'bog_mol_invoicer_selected_template'

	export class $bog_mol_invoicer extends $.$bog_mol_invoicer {

		@$mol_mem
		override settings_open(next?: boolean): boolean {
			return next ?? false
		}

		@$mol_mem
		is_loading(next?: boolean): boolean {
			return next ?? false
		}

		override parse_button_title() {
			return this.is_loading() ? 'Загрузка...' : 'Распознать реквизиты'
		}

		override parse_button_enabled() {
			return !this.is_loading()
		}

		override parse_loader_content() {
			if (!this.is_loading()) return []
			return [this.Parse_loader_icon()]
		}

		@$mol_mem
		override llm_url(next?: string): string {
			if (next !== undefined) {
				if (next) {
					localStorage.setItem(LLM_URL_KEY, next)
				} else {
					localStorage.removeItem(LLM_URL_KEY)
				}
				return next
			}
			return localStorage.getItem(LLM_URL_KEY) ?? ''
		}

		@$mol_mem
		override llm_key(next?: string): string {
			if (next !== undefined) {
				if (next) {
					localStorage.setItem(LLM_KEY_KEY, next)
				} else {
					localStorage.removeItem(LLM_KEY_KEY)
				}
				return next
			}
			return localStorage.getItem(LLM_KEY_KEY) ?? ''
		}

		use_custom_llm() {
			return Boolean(this.llm_url().trim())
		}

		@$mol_mem
		model() {
			if (this.use_custom_llm()) {
				return $bog_mol_invoicer_openai_model.make({
					base_url: $mol_const(this.llm_url()),
					api_key: $mol_const(this.llm_key()),
					rules: $mol_const(this.llm_rules()),
					params: $mol_const({ temperature: 0 }),
				})
			}
			return $mol_github_model.make({
				rules: $mol_const(this.llm_rules()),
				params: $mol_const({ temperature: 0 }),
			})
		}

		llm_rules() {
			return `Ты — парсер реквизитов компаний. Тебе дают текст с реквизитами (из PDF, письма, карточки контрагента и т.п.).
Извлеки все реквизиты и верни СТРОГО в JSON формате:
{
  "company_name": "полное название с ОПФ",
  "inn": "ИНН",
  "kpp": "КПП",
  "ogrn": "ОГРН или ОГРНИП",
  "legal_address": "юридический адрес",
  "bank_name": "название банка",
  "bik": "БИК банка",
  "account": "расчётный счёт",
  "corr_account": "корреспондентский счёт",
  "director": "ФИО руководителя/ИП",
  "phone": "телефон",
  "email": "email"
}
Если какое-то поле не найдено — оставь пустую строку "".
Не добавляй никаких пояснений, только JSON.`
		}

		@$mol_mem
		override source_files(next?: readonly File[]) {
			return next ?? ([] as readonly File[])
		}

		override source_file_name() {
			const files = this.source_files()
			if (!files.length) return ''
			return files[files.length - 1].name
		}

		@$mol_mem
		file_text() {
			const files = this.source_files()
			if (!files.length) return ''

			const file = files[files.length - 1]
			return $mol_wire_sync($bog_mol_invoicer_file).read_file(file)
		}

		auto() {
			const text = this.file_text()
			if (text) this.source_text(text)
		}

		@$mol_action
		override parse_click() {
			const text = this.source_text()
			if (!text.trim()) return
			this.is_loading(true)
			try {
				this.communication()
			} finally {
				this.is_loading(false)
			}
		}

		@$mol_mem
		override communication() {
			const text = this.source_text()
			if (!text.trim()) return null

			const truncated = text.slice(0, 8000)

			const model = this.model().fork()
			model.ask([truncated])
			const result = model.response() as Requisites

			if (result) {
				if (result.company_name) this.company_name(result.company_name)
				if (result.inn) this.inn(result.inn)
				if (result.kpp) this.kpp(result.kpp)
				if (result.ogrn) this.ogrn(result.ogrn)
				if (result.legal_address) this.legal_address(result.legal_address)
				if (result.bank_name) this.bank_name(result.bank_name)
				if (result.bik) this.bik(result.bik)
				if (result.account) this.account(result.account)
				if (result.corr_account) this.corr_account(result.corr_account)
				if (result.director) this.director(result.director)
				if (result.phone) this.phone(result.phone)
				if (result.email) this.email(result.email)
			}

			return null
		}

		override inn_error(): string {
			const inn = this.inn()
			if (!inn) return ''
			const digits = inn.replace(/\D/g, '')
			if (digits.length !== 10 && digits.length !== 12) {
				return 'ИНН должен содержать 10 или 12 цифр'
			}
			return ''
		}

		override bik_error(): string {
			const bik = this.bik()
			if (!bik) return ''
			const digits = bik.replace(/\D/g, '')
			if (digits.length !== 9) {
				return 'БИК должен содержать 9 цифр'
			}
			return ''
		}

		override account_error(): string {
			const account = this.account()
			if (!account) return ''
			const digits = account.replace(/\D/g, '')
			if (digits.length !== 20) {
				return 'Расчётный счёт должен содержать 20 цифр'
			}
			return ''
		}

		override corr_account_error(): string {
			const corr = this.corr_account()
			if (!corr) return ''
			const digits = corr.replace(/\D/g, '')
			if (digits.length !== 20) {
				return 'Корр. счёт должен содержать 20 цифр'
			}
			return ''
		}

		@$mol_action
		override clear_click() {
			this.source_text('')
			this.source_files([])
			this.company_name('')
			this.inn('')
			this.kpp('')
			this.ogrn('')
			this.legal_address('')
			this.bank_name('')
			this.bik('')
			this.account('')
			this.corr_account('')
			this.director('')
			this.phone('')
			this.email('')
		}

		static signature_storage_key = 'bog_mol_invoicer_signature'

		static async blob_url_to_data_uri(url: string): Promise<string> {
			if (!url.startsWith('blob:')) return url
			const resp = await fetch(url)
			const blob = await resp.blob()
			return new Promise((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = () => resolve(reader.result as string)
				reader.onerror = reject
				reader.readAsDataURL(blob)
			})
		}

		static async convert_and_save(items: string[]) {
			const converted = await Promise.all(items.map(url => $bog_mol_invoicer.blob_url_to_data_uri(url)))
			localStorage.setItem($bog_mol_invoicer.signature_storage_key, JSON.stringify(converted))
		}

		@$mol_mem
		override signature_attach(next?: string[]) {
			if (next !== undefined) {
				if (next.length) {
					$bog_mol_invoicer.convert_and_save(next)
				} else {
					try {
						localStorage.removeItem($bog_mol_invoicer.signature_storage_key)
					} catch {}
				}
				return next
			}
			try {
				const saved = localStorage.getItem($bog_mol_invoicer.signature_storage_key)
				if (saved) return JSON.parse(saved) as string[]
			} catch {}
			return []
		}

		signature_data_uri() {
			const items = this.signature_attach()
			if (!items?.length) return ''
			return items[items.length - 1]
		}

		document_html() {
			const sig = this.signature_data_uri()
			const signature_html = sig
				? `<div style="margin-top: 40px; display: flex; align-items: center; gap: 20px;">
					<img src="${sig}" style="max-height: 80px;" />
					<span>${this.director()}</span>
				</div>`
				: `<div style="margin-top: 40px;">
					<div style="border-bottom: 1px solid #000; width: 200px; display: inline-block;"></div>
					<span> / ${this.director()}</span>
				</div>`

			return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Акт</title>
<style>
body { font-family: 'Times New Roman', serif; font-size: 14px; padding: 40px; line-height: 1.6; }
h1 { text-align: center; font-size: 18px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; }
td { padding: 4px 8px; vertical-align: top; }
.label { font-weight: bold; width: 200px; }
@media print { body { padding: 20px; } }
</style>
</head>
<body>

<h1>Акт выполненных работ</h1>

<table>
<tr><td class="label">Исполнитель:</td><td>${this.company_name()}</td></tr>
<tr><td class="label">ИНН:</td><td>${this.inn()}</td></tr>
<tr><td class="label">КПП:</td><td>${this.kpp()}</td></tr>
<tr><td class="label">ОГРН:</td><td>${this.ogrn()}</td></tr>
<tr><td class="label">Адрес:</td><td>${this.legal_address()}</td></tr>
<tr><td class="label">Банк:</td><td>${this.bank_name()}</td></tr>
<tr><td class="label">БИК:</td><td>${this.bik()}</td></tr>
<tr><td class="label">Р/с:</td><td>${this.account()}</td></tr>
<tr><td class="label">К/с:</td><td>${this.corr_account()}</td></tr>
<tr><td class="label">Руководитель:</td><td>${this.director()}</td></tr>
<tr><td class="label">Телефон:</td><td>${this.phone()}</td></tr>
<tr><td class="label">Email:</td><td>${this.email()}</td></tr>
</table>

${signature_html}

</body>
</html>`
		}

		static load_script(src: string): Promise<void> {
			return new Promise((resolve, reject) => {
				const script = document.createElement('script')
				script.src = src
				script.onload = () => resolve()
				script.onerror = reject
				document.head.appendChild(script)
			})
		}

		@$mol_action
		override download_pdf_click() {
			if (!this.company_name()) return
			$mol_wire_sync($bog_mol_invoicer).download_pdf_async(this)
		}

		static async download_pdf_async(self: $bog_mol_invoicer) {
			if (!(globalThis as any).html2canvas) {
				await this.load_script('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
			}
			if (!(globalThis as any).jspdf) {
				await this.load_script('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
			}

			const html = self.document_html()
			const body = html.replace(/.*<body[^>]*>/s, '').replace(/<\/body>.*/s, '')

			const container = document.createElement('div')
			container.innerHTML = body
			container.style.cssText =
				'position:fixed;left:0;top:0;width:794px;padding:40px;font-family:serif;font-size:14px;line-height:1.6;background:#fff;z-index:-9999;'
			document.body.appendChild(container)

			const html2canvas = (globalThis as any).html2canvas
			const canvas = await html2canvas(container, { scale: 2, useCORS: true })
			document.body.removeChild(container)

			const imgData = canvas.toDataURL('image/jpeg', 0.95)
			const { jsPDF } = (globalThis as any).jspdf
			const pdf = new jsPDF({ unit: 'mm', format: 'a4' })

			const pageWidth = 210
			const pageHeight = 297
			const margin = 10
			const contentWidth = pageWidth - margin * 2
			const imgHeight = (canvas.height * contentWidth) / canvas.width

			pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, imgHeight)

			if (imgHeight > pageHeight - margin * 2) {
				let y = -(pageHeight - margin * 2)
				while (y > -imgHeight) {
					pdf.addPage()
					pdf.addImage(imgData, 'JPEG', margin, y + margin, contentWidth, imgHeight)
					y -= (pageHeight - margin * 2)
				}
			}

			pdf.save(self.result_doc_name().replace(/\.doc$/, '.pdf'))
		}

		@$mol_action
		override print_click() {
			if (!this.company_name()) return
			const html = this.document_html()
			const win = window.open('', '_blank')!
			win.document.write(html)
			win.document.close()
			win.onload = () => {
				win.print()
			}
		}

		@$mol_mem
		templates_data(next?: Template[]): Template[] {
			if (next !== undefined) return next
			return $mol_wire_sync($bog_mol_invoicer_template_db).get_all() as Template[]
		}

		templates_reload() {
			this.templates_data(
				$mol_wire_sync($bog_mol_invoicer_template_db).get_all() as Template[]
			)
		}

		@$mol_mem
		override template_upload_files(next?: readonly File[]): readonly File[] {
			if (next && next.length) {
				const file = next[next.length - 1]
				$mol_wire_sync($bog_mol_invoicer).upload_template(this, file)
			}
			return next ?? []
		}

		static async upload_template(self: $bog_mol_invoicer, file: File) {
			const content = await file.arrayBuffer()
			const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
			const name = file.name.replace(/\.docx$/i, '')

			const template: Template = { id, name, content }
			await $bog_mol_invoicer_template_db.save(template)

			self.templates_reload()
		}

		override template_rows() {
			const templates = this.templates_data()
			return templates.map(t => this.Template_row(t.id))
		}

		override template_name(id: string) {
			const templates = this.templates_data()
			const t = templates.find(t => t.id === id)
			return t?.name ?? ''
		}

		@$mol_action
		override template_delete_click(id: string) {
			$mol_wire_sync($bog_mol_invoicer_template_db).delete(id)
			this.templates_reload()

			if (this.selected_template_id() === id) {
				this.selected_template_id('default')
			}
		}

		override template_options(): readonly string[] {
			const templates = this.templates_data()
			const options = ['default']
			for (const t of templates) {
				options.push(t.id)
			}
			return options
		}

		override template_dictionary() {
			const templates = this.templates_data()
			const dict: Record<string, string> = {
				default: 'Акт выполненных работ (встроенный)',
			}
			for (const t of templates) {
				dict[t.id] = t.name
			}
			return dict
		}

		@$mol_mem
		override selected_template_id(next?: string): string {
			if (next !== undefined) {
				localStorage.setItem(SELECTED_TEMPLATE_KEY, next)
				return next
			}
			return localStorage.getItem(SELECTED_TEMPLATE_KEY) ?? 'default'
		}

		get_placeholders(): Record<string, string> {
			const today = new Date()
			const dateStr = today.toLocaleDateString('ru-RU')

			return {
				company_name: this.company_name(),
				inn: this.inn(),
				kpp: this.kpp(),
				ogrn: this.ogrn(),
				legal_address: this.legal_address(),
				bank_name: this.bank_name(),
				bik: this.bik(),
				account: this.account(),
				corr_account: this.corr_account(),
				director: this.director(),
				phone: this.phone(),
				email: this.email(),
				date: dateStr,
				signature: '',
			}
		}

		@$mol_mem
		override result_doc_blob(): Blob | null {
			if (!this.company_name()) return null

			const selectedId = this.selected_template_id()

			if (selectedId === 'default') {
				return this.default_doc_blob()
			}

			const templates = this.templates_data()
			const template = templates.find(t => t.id === selectedId)

			if (!template) {
				return this.default_doc_blob()
			}

			return $mol_wire_sync($bog_mol_invoicer_docx).process_template(
				template.content,
				this.get_placeholders()
			) as Blob
		}

		default_doc_blob(): Blob | null {
			const sig = this.signature_data_uri()
			if (!sig || !sig.startsWith('data:')) {
				const html = this.document_html()
				return new Blob(['\ufeff', html], { type: 'application/msword' })
			}

			const match = sig.match(/^data:(.*?);base64,(.*)$/)
			if (!match) {
				const html = this.document_html()
				return new Blob(['\ufeff', html], { type: 'application/msword' })
			}

			const [, mimeType, base64Data] = match
			const ext = mimeType.split('/')[1] || 'png'
			const cid = `signature.${ext}`

			const signature_html = `<div style="margin-top: 40px; display: flex; align-items: center; gap: 20px;">
				<img src="cid:${cid}" style="max-height: 80px;" />
				<span>${this.director()}</span>
			</div>`

			const html = this.document_html().replace(
				/<div style="margin-top: 40px;[\s\S]*?<\/div>/,
				signature_html
			)

			const boundary = '----=_NextPart_boundary'
			const mhtml = `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n${html}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\nContent-ID: <${cid}>\r\n\r\n${base64Data}\r\n--${boundary}--`

			return new Blob([mhtml], { type: 'application/msword' })
		}

		override result_doc_name() {
			const name = this.company_name() || 'document'
			const selectedId = this.selected_template_id()

			if (selectedId !== 'default') {
				const templates = this.templates_data()
				const template = templates.find(t => t.id === selectedId)
				if (template) {
					return `${name.replace(/[^\w\dа-яА-ЯёЁ\s]/g, '').trim()}.docx`
				}
			}

			return `${name.replace(/[^\w\dа-яА-ЯёЁ\s]/g, '').trim()}.doc`
		}
	}

	export class $bog_mol_invoicer_file {
		static async read_file(file: File): Promise<string> {
			if (file.type === 'application/pdf') {
				return this.extract_pdf_text(file)
			}

			return file.text()
		}

		static pdfjsLib: any = null

		static async load_pdfjs() {
			if (this.pdfjsLib) return this.pdfjsLib
			const cdnVersion = '4.9.155'
			const src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${cdnVersion}/pdf.min.mjs`
			const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${cdnVersion}/pdf.worker.min.mjs`
			const mod = (await import(/* webpackIgnore: true */ src)) as any
			mod.GlobalWorkerOptions.workerSrc = workerSrc
			this.pdfjsLib = mod
			return mod
		}

		static async extract_pdf_text(file: File): Promise<string> {
			const pdfjs = await this.load_pdfjs()
			const buffer = await file.arrayBuffer()
			const pdf = await pdfjs.getDocument({ data: buffer }).promise
			const parts: string[] = []

			for (let i = 1; i <= pdf.numPages; i++) {
				const page = await pdf.getPage(i)
				const content = await page.getTextContent()
				parts.push(content.items.map((item: any) => item.str).join(' '))
			}

			return parts.join('\n')
		}
	}

	export class $bog_mol_invoicer_openai_model extends $mol_object {
		base_url() { return '' }
		api_key() { return '' }
		rules() { return '' }
		params() { return {} as Record<string, any> }

		@$mol_mem
		messages(next?: Array<{ role: string; content: string }>) {
			return next ?? [{ role: 'system', content: this.rules() }]
		}

		fork() {
			return $bog_mol_invoicer_openai_model.make({
				base_url: $mol_const(this.base_url()),
				api_key: $mol_const(this.api_key()),
				rules: $mol_const(this.rules()),
				params: $mol_const(this.params()),
			})
		}

		ask(prompts: string[]) {
			const msgs = [...this.messages()]
			for (const p of prompts) {
				msgs.push({ role: 'user', content: p })
			}
			this.messages(msgs)
		}

		@$mol_mem
		response(): Requisites | null {
			const msgs = this.messages()
			if (msgs.length < 2) return null

			const result = $mol_wire_sync($bog_mol_invoicer_openai_model).fetch_completion(
				this.base_url(),
				this.api_key(),
				msgs,
				this.params()
			)

			return result
		}

		static async fetch_completion(
			base_url: string,
			api_key: string,
			messages: Array<{ role: string; content: string }>,
			params: Record<string, any>
		): Promise<Requisites | null> {
			const url = base_url.replace(/\/$/, '') + '/chat/completions'

			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
			}
			if (api_key) {
				headers['Authorization'] = `Bearer ${api_key}`
			}

			const body = {
				model: params.model || 'gpt-4o-mini',
				messages,
				temperature: params.temperature ?? 0,
				response_format: { type: 'json_object' },
			}

			const resp = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
			})

			if (!resp.ok) {
				const text = await resp.text()
				throw new Error(`LLM API error: ${resp.status} ${text}`)
			}

			const data = await resp.json()
			const content = data.choices?.[0]?.message?.content

			if (!content) return null

			try {
				return JSON.parse(content) as Requisites
			} catch {
				return null
			}
		}
	}

	export class $bog_mol_invoicer_template_db {
		private static db: IDBDatabase | null = null

		static async open(): Promise<IDBDatabase> {
			if (this.db) return this.db

			return new Promise((resolve, reject) => {
				const request = indexedDB.open(TEMPLATES_DB_NAME, 1)

				request.onerror = () => reject(request.error)

				request.onsuccess = () => {
					this.db = request.result
					resolve(this.db)
				}

				request.onupgradeneeded = (event) => {
					const db = (event.target as IDBOpenDBRequest).result
					if (!db.objectStoreNames.contains(TEMPLATES_STORE_NAME)) {
						db.createObjectStore(TEMPLATES_STORE_NAME, { keyPath: 'id' })
					}
				}
			})
		}

		static async get_all(): Promise<Template[]> {
			const db = await this.open()
			return new Promise((resolve, reject) => {
				const tx = db.transaction(TEMPLATES_STORE_NAME, 'readonly')
				const store = tx.objectStore(TEMPLATES_STORE_NAME)
				const request = store.getAll()
				request.onsuccess = () => resolve(request.result || [])
				request.onerror = () => reject(request.error)
			})
		}

		static async get(id: string): Promise<Template | undefined> {
			const db = await this.open()
			return new Promise((resolve, reject) => {
				const tx = db.transaction(TEMPLATES_STORE_NAME, 'readonly')
				const store = tx.objectStore(TEMPLATES_STORE_NAME)
				const request = store.get(id)
				request.onsuccess = () => resolve(request.result)
				request.onerror = () => reject(request.error)
			})
		}

		static async save(template: Template): Promise<void> {
			const db = await this.open()
			return new Promise((resolve, reject) => {
				const tx = db.transaction(TEMPLATES_STORE_NAME, 'readwrite')
				const store = tx.objectStore(TEMPLATES_STORE_NAME)
				const request = store.put(template)
				request.onsuccess = () => resolve()
				request.onerror = () => reject(request.error)
			})
		}

		static async delete(id: string): Promise<void> {
			const db = await this.open()
			return new Promise((resolve, reject) => {
				const tx = db.transaction(TEMPLATES_STORE_NAME, 'readwrite')
				const store = tx.objectStore(TEMPLATES_STORE_NAME)
				const request = store.delete(id)
				request.onsuccess = () => resolve()
				request.onerror = () => reject(request.error)
			})
		}
	}

	export class $bog_mol_invoicer_docx {
		static JSZip: any = null

		static async load_jszip() {
			if (this.JSZip) return this.JSZip
			const src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
			await $bog_mol_invoicer.load_script(src)
			this.JSZip = (globalThis as any).JSZip
			return this.JSZip
		}

		static async process_template(
			content: ArrayBuffer,
			placeholders: Record<string, string>
		): Promise<Blob> {
			const JSZip = await this.load_jszip()
			const zip = await JSZip.loadAsync(content)

			const documentXml = await zip.file('word/document.xml')?.async('string')
			if (!documentXml) {
				throw new Error('Invalid DOCX: no word/document.xml')
			}

			let processed = documentXml
			for (const [key, value] of Object.entries(placeholders)) {
				const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
				processed = processed.replace(regex, this.escape_xml(value))
			}

			zip.file('word/document.xml', processed)

			return await zip.generateAsync({
				type: 'blob',
				mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			})
		}

		static escape_xml(str: string): string {
			return str
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&apos;')
		}
	}
}
