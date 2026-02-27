import { Bot, InlineKeyboard, InputFile } from 'grammy'
import dotenv from 'dotenv'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

dotenv.config()

const BOT_TOKEN = process.env.BOT_TOKEN
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://example.com/bog/mol/invoicer/-/'
const LLM_URL = process.env.LLM_URL || ''
const LLM_KEY = process.env.LLM_KEY || ''

if (!BOT_TOKEN) {
	console.error('BOT_TOKEN is required in .env file')
	process.exit(1)
}

const bot = new Bot(BOT_TOKEN)

// LLM rules for parsing requisites
const LLM_RULES = `Ты — парсер реквизитов компаний. Тебе дают текст с реквизитами (из PDF, письма, карточки контрагента и т.п.).
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

/**
 * Parse requisites using LLM API
 * @param {string} text - Text to parse
 * @returns {Promise<object|null>} - Parsed requisites or null
 */
async function parseRequisites(text) {
	if (!LLM_URL) {
		console.log('LLM_URL not configured, skipping parsing')
		return null
	}

	const url = LLM_URL.replace(/\/$/, '') + '/chat/completions'
	const headers = {
		'Content-Type': 'application/json',
	}
	if (LLM_KEY) {
		headers['Authorization'] = `Bearer ${LLM_KEY}`
	}

	const body = {
		model: 'gpt-4o-mini',
		messages: [
			{ role: 'system', content: LLM_RULES },
			{ role: 'user', content: text.slice(0, 8000) },
		],
		temperature: 0,
		response_format: { type: 'json_object' },
	}

	try {
		const resp = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		})

		if (!resp.ok) {
			const errorText = await resp.text()
			console.error(`LLM API error: ${resp.status} ${errorText}`)
			return null
		}

		const data = await resp.json()
		const content = data.choices?.[0]?.message?.content
		if (!content) return null

		return JSON.parse(content)
	} catch (error) {
		console.error('Error parsing requisites:', error)
		return null
	}
}

/**
 * Extract text from PDF using pdf-parse (if available) or return placeholder
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function extractPdfText(buffer) {
	try {
		const pdfParse = (await import('pdf-parse')).default
		const data = await pdfParse(buffer)
		return data.text
	} catch (error) {
		console.error('pdf-parse not available or error:', error.message)
		return ''
	}
}

/**
 * Extract text from DOCX
 * @param {Buffer} buffer - DOCX file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function extractDocxText(buffer) {
	try {
		const mammoth = (await import('mammoth')).default
		const result = await mammoth.extractRawText({ buffer })
		return result.value
	} catch (error) {
		console.error('mammoth not available or error:', error.message)
		return ''
	}
}

/**
 * Generate HTML document from requisites
 * @param {object} req - Requisites object
 * @returns {string} - HTML content
 */
function generateDocument(req) {
	const signature_html = `<div style="margin-top: 40px;">
		<div style="border-bottom: 1px solid #000; width: 200px; display: inline-block;"></div>
		<span> / ${req.director || ''}</span>
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
</style>
</head>
<body>

<h1>Акт выполненных работ</h1>

<table>
<tr><td class="label">Исполнитель:</td><td>${req.company_name || ''}</td></tr>
<tr><td class="label">ИНН:</td><td>${req.inn || ''}</td></tr>
<tr><td class="label">КПП:</td><td>${req.kpp || ''}</td></tr>
<tr><td class="label">ОГРН:</td><td>${req.ogrn || ''}</td></tr>
<tr><td class="label">Адрес:</td><td>${req.legal_address || ''}</td></tr>
<tr><td class="label">Банк:</td><td>${req.bank_name || ''}</td></tr>
<tr><td class="label">БИК:</td><td>${req.bik || ''}</td></tr>
<tr><td class="label">Р/с:</td><td>${req.account || ''}</td></tr>
<tr><td class="label">К/с:</td><td>${req.corr_account || ''}</td></tr>
<tr><td class="label">Руководитель:</td><td>${req.director || ''}</td></tr>
<tr><td class="label">Телефон:</td><td>${req.phone || ''}</td></tr>
<tr><td class="label">Email:</td><td>${req.email || ''}</td></tr>
</table>

${signature_html}

</body>
</html>`
}

// Start command - show Mini App button
bot.command('start', async (ctx) => {
	const keyboard = new InlineKeyboard()
		.webApp('Открыть приложение', WEBAPP_URL)

	await ctx.reply(
		'Привет! Я помогу заполнить документы по реквизитам.\n\n' +
		'• Нажмите кнопку ниже, чтобы открыть приложение\n' +
		'• Или отправьте мне файл с реквизитами (PDF, TXT, DOCX)\n' +
		'• Или вставьте текст с реквизитами\n\n' +
		(LLM_URL ? '✅ LLM настроен — я могу распознавать реквизиты автоматически' : '⚠️ LLM не настроен — используйте приложение для распознавания'),
		{ reply_markup: keyboard }
	)
})

// Help command
bot.command('help', async (ctx) => {
	await ctx.reply(
		'📋 *Invoicer — Автозаполнение документов*\n\n' +
		'*Как использовать:*\n' +
		'1. Нажмите "Открыть приложение" для полного UI\n' +
		'2. Или отправьте файл с реквизитами (PDF/TXT/DOCX)\n' +
		'3. Или вставьте текст с реквизитами\n\n' +
		'*Поддерживаемые форматы:*\n' +
		'• PDF — автоматическое извлечение текста\n' +
		'• TXT — текстовые файлы\n' +
		'• DOCX — документы Word\n\n' +
		'*Распознаваемые реквизиты:*\n' +
		'ИНН, КПП, ОГРН, название компании, адрес, банковские реквизиты и др.\n\n' +
		(LLM_URL ? '✅ Бот может автоматически распознавать реквизиты и генерировать документы.' : '⚠️ LLM не настроен. Используйте Mini App для распознавания.'),
		{ parse_mode: 'Markdown' }
	)
})

// Handle text messages with requisites
bot.on('message:text', async (ctx) => {
	const text = ctx.message.text

	// Skip commands
	if (text.startsWith('/')) return

	// Check if text looks like requisites
	if (text.length < 20) {
		await ctx.reply(
			'Текст слишком короткий. Отправьте полные реквизиты компании или используйте приложение.',
			{ reply_markup: new InlineKeyboard().webApp('Открыть приложение', WEBAPP_URL) }
		)
		return
	}

	// Try to parse with LLM if configured
	if (LLM_URL) {
		await ctx.reply('⏳ Распознаю реквизиты...')

		const requisites = await parseRequisites(text)
		if (requisites && requisites.company_name) {
			// Generate and send document
			const html = generateDocument(requisites)
			const fileName = `${(requisites.company_name || 'document').replace(/[^\w\dа-яА-ЯёЁ\s]/g, '').trim()}.doc`
			const tempPath = join(tmpdir(), fileName)

			writeFileSync(tempPath, '\ufeff' + html, 'utf-8')

			await ctx.replyWithDocument(new InputFile(tempPath, fileName), {
				caption: `✅ Документ создан!\n\nКомпания: ${requisites.company_name}\nИНН: ${requisites.inn || '—'}\nОГРН: ${requisites.ogrn || '—'}`,
			})

			unlinkSync(tempPath)
			return
		}
	}

	// Fallback: open app with text
	await ctx.reply(
		'Получил реквизиты. Откройте приложение для создания документа.',
		{ reply_markup: new InlineKeyboard().webApp('Открыть с текстом', `${WEBAPP_URL}?text=${encodeURIComponent(text.slice(0, 1000))}`) }
	)
})

// Handle document files
bot.on('message:document', async (ctx) => {
	const doc = ctx.message.document

	// Check file type
	const allowedTypes = [
		'application/pdf',
		'text/plain',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	]
	const allowedExtensions = ['.pdf', '.txt', '.docx']
	const fileName = doc.file_name || ''
	const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))

	if (!allowedTypes.includes(doc.mime_type || '') && !allowedExtensions.includes(ext)) {
		await ctx.reply('Поддерживаются только файлы PDF, TXT и DOCX.')
		return
	}

	// Check file size (limit to 20MB)
	if (doc.file_size && doc.file_size > 20 * 1024 * 1024) {
		await ctx.reply('Файл слишком большой. Максимальный размер: 20 МБ.')
		return
	}

	// If LLM is not configured, just suggest opening the app
	if (!LLM_URL) {
		await ctx.reply(
			'Файл получен. Откройте приложение для обработки файла.',
			{ reply_markup: new InlineKeyboard().webApp('Открыть приложение', WEBAPP_URL) }
		)
		return
	}

	await ctx.reply('⏳ Обрабатываю файл...')

	try {
		// Download file
		const file = await ctx.api.getFile(doc.file_id)
		const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`
		const response = await fetch(fileUrl)
		const buffer = Buffer.from(await response.arrayBuffer())

		// Extract text based on file type
		let text = ''
		if (ext === '.pdf' || doc.mime_type === 'application/pdf') {
			text = await extractPdfText(buffer)
		} else if (ext === '.docx' || doc.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
			text = await extractDocxText(buffer)
		} else {
			text = buffer.toString('utf-8')
		}

		if (!text || text.length < 10) {
			await ctx.reply(
				'Не удалось извлечь текст из файла. Попробуйте открыть приложение.',
				{ reply_markup: new InlineKeyboard().webApp('Открыть приложение', WEBAPP_URL) }
			)
			return
		}

		// Parse requisites
		const requisites = await parseRequisites(text)
		if (!requisites || !requisites.company_name) {
			await ctx.reply(
				'Не удалось распознать реквизиты. Попробуйте открыть приложение.',
				{ reply_markup: new InlineKeyboard().webApp('Открыть приложение', WEBAPP_URL) }
			)
			return
		}

		// Generate and send document
		const html = generateDocument(requisites)
		const outFileName = `${(requisites.company_name || 'document').replace(/[^\w\dа-яА-ЯёЁ\s]/g, '').trim()}.doc`
		const tempPath = join(tmpdir(), outFileName)

		writeFileSync(tempPath, '\ufeff' + html, 'utf-8')

		await ctx.replyWithDocument(new InputFile(tempPath, outFileName), {
			caption: `✅ Документ создан!\n\nКомпания: ${requisites.company_name}\nИНН: ${requisites.inn || '—'}\nОГРН: ${requisites.ogrn || '—'}`,
		})

		unlinkSync(tempPath)

	} catch (error) {
		console.error('Error processing document:', error)
		await ctx.reply(
			'Произошла ошибка при обработке файла. Попробуйте открыть приложение.',
			{ reply_markup: new InlineKeyboard().webApp('Открыть приложение', WEBAPP_URL) }
		)
	}
})

// Handle web_app_data from Mini App
bot.on('message:web_app_data', async (ctx) => {
	try {
		const data = JSON.parse(ctx.message.web_app_data.data)

		if (data.action === 'download_doc' && data.content) {
			// Decode base64 content and send as document
			const buffer = Buffer.from(data.content, 'base64')
			const fileName = data.fileName || 'document.doc'
			const tempPath = join(tmpdir(), fileName)

			writeFileSync(tempPath, buffer)

			await ctx.replyWithDocument(new InputFile(tempPath, fileName), {
				caption: '✅ Готово! Ваш документ.'
			})

			unlinkSync(tempPath)
		} else if (data.action === 'parsed_data') {
			await ctx.reply(`✅ Реквизиты распознаны:\n${JSON.stringify(data.requisites, null, 2)}`)
		}
	} catch (error) {
		console.error('Error handling web_app_data:', error)
		await ctx.reply('Произошла ошибка при обработке данных.')
	}
})

// Error handler
bot.catch((err) => {
	console.error('Bot error:', err)
})

// Start the bot
bot.start()
console.log('Bot started!')
console.log('WEBAPP_URL:', WEBAPP_URL)
console.log('LLM_URL:', LLM_URL ? 'configured' : 'not configured')
