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

	export class $bog_mol_invoicer extends $.$bog_mol_invoicer {
		@$mol_mem
		model() {
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
			this.communication()
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
		override result_doc_blob() {
			if (!this.company_name()) return null as any

			const html = this.document_html()
			return new Blob(['\ufeff', html], { type: 'application/msword' })
		}

		override result_doc_name() {
			const name = this.company_name() || 'document'
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
}
