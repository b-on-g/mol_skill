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

		@ $mol_mem
		model() {
			return $mol_github_model.make({
				rules: $mol_const( this.llm_rules() ),
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

		@ $mol_action
		override parse_click() {
			const text = this.source_text()
			if( !text.trim() ) return
			this.communication()
		}

		@ $mol_mem
		override communication() {
			const text = this.source_text()
			if( !text.trim() ) return null

			const model = this.model().fork()
			model.ask([ text ])
			const result = model.response() as Requisites

			if( result ) {
				if( result.company_name ) this.company_name( result.company_name )
				if( result.inn ) this.inn( result.inn )
				if( result.kpp ) this.kpp( result.kpp )
				if( result.ogrn ) this.ogrn( result.ogrn )
				if( result.legal_address ) this.legal_address( result.legal_address )
				if( result.bank_name ) this.bank_name( result.bank_name )
				if( result.bik ) this.bik( result.bik )
				if( result.account ) this.account( result.account )
				if( result.corr_account ) this.corr_account( result.corr_account )
				if( result.director ) this.director( result.director )
				if( result.phone ) this.phone( result.phone )
				if( result.email ) this.email( result.email )
			}

			return result
		}

		@ $mol_mem
		override source_files( next?: readonly File[] ) {
			if( !next?.length ) return [] as readonly File[]

			const file = next[0]
			const text = $mol_wire_sync( $bog_mol_invoicer_file ).read_text( file )
			this.source_text( text )

			return next
		}

		@ $mol_mem
		override signature_files( next?: readonly File[] ) {
			if( !next?.length ) return [] as readonly File[]

			const file = next[0]
			const uri = $mol_wire_sync( $bog_mol_invoicer_file ).read_data_uri( file )
			this.signature_uri( uri )

			return next
		}

		document_html() {
			const sig = this.signature_uri()
			const signature_html = sig
				? `<div style="margin-top: 40px; display: flex; align-items: center; gap: 20px;">
					<img src="${ sig }" style="max-height: 80px;" />
					<span>${ this.director() }</span>
				</div>`
				: `<div style="margin-top: 40px;">
					<div style="border-bottom: 1px solid #000; width: 200px; display: inline-block;"></div>
					<span> / ${ this.director() }</span>
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
<tr><td class="label">Исполнитель:</td><td>${ this.company_name() }</td></tr>
<tr><td class="label">ИНН:</td><td>${ this.inn() }</td></tr>
<tr><td class="label">КПП:</td><td>${ this.kpp() }</td></tr>
<tr><td class="label">ОГРН:</td><td>${ this.ogrn() }</td></tr>
<tr><td class="label">Адрес:</td><td>${ this.legal_address() }</td></tr>
<tr><td class="label">Банк:</td><td>${ this.bank_name() }</td></tr>
<tr><td class="label">БИК:</td><td>${ this.bik() }</td></tr>
<tr><td class="label">Р/с:</td><td>${ this.account() }</td></tr>
<tr><td class="label">К/с:</td><td>${ this.corr_account() }</td></tr>
<tr><td class="label">Руководитель:</td><td>${ this.director() }</td></tr>
<tr><td class="label">Телефон:</td><td>${ this.phone() }</td></tr>
<tr><td class="label">Email:</td><td>${ this.email() }</td></tr>
</table>

${ signature_html }

</body>
</html>`
		}

		@ $mol_mem
		override result_pdf_blob() {
			if( !this.company_name() ) return null as any

			const html = this.document_html()
			return new Blob([ html ], { type: 'application/pdf' })
		}

		override result_pdf_name() {
			const name = this.company_name() || 'document'
			return `${ name.replace( /[^\w\dа-яА-ЯёЁ\s]/g, '' ).trim() }.pdf`
		}

		@ $mol_mem
		override result_doc_blob() {
			if( !this.company_name() ) return null as any

			const html = this.document_html()
			return new Blob(
				[ '\ufeff', html ],
				{ type: 'application/msword' },
			)
		}

		override result_doc_name() {
			const name = this.company_name() || 'document'
			return `${ name.replace( /[^\w\dа-яА-ЯёЁ\s]/g, '' ).trim() }.doc`
		}

	}

	export class $bog_mol_invoicer_file {

		static read_text( file: File ): Promise< string > {
			return new Promise( ( resolve, reject ) => {
				const reader = new FileReader()
				reader.onload = () => resolve( reader.result as string )
				reader.onerror = () => reject( reader.error )
				reader.readAsText( file )
			})
		}

		static read_data_uri( file: File ): Promise< string > {
			return new Promise( ( resolve, reject ) => {
				const reader = new FileReader()
				reader.onload = () => resolve( reader.result as string )
				reader.onerror = () => reject( reader.error )
				reader.readAsDataURL( file )
			})
		}

	}

}
