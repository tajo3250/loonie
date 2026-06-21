import * as esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isWatch = process.argv.includes('--watch')

function resolveRpcUrl() {
	if (process.env.RPC_URL) return process.env.RPC_URL
	const envPath = path.join(__dirname, '.env.local')
	if (fs.existsSync(envPath)) {
		const match = fs.readFileSync(envPath, 'utf-8').match(/^RPC_URL=(.*)$/m)
		if (match) return match[1].trim()
	}
	return 'https://api.devnet.solana.com'
}

function buildHTML() {
	const pagesDir = path.join(__dirname, 'src/pages')
	const distDir = path.join(__dirname, 'dist')
	
	if (!fs.existsSync(distDir)) {
		fs.mkdirSync(distDir, { recursive: true })
	}
	
	const pages = fs.readdirSync(pagesDir).filter(file => file.endsWith('.html'))
	
	pages.forEach(page => {
		const pagePath = path.join(pagesDir, page)
		const content = fs.readFileSync(pagePath, 'utf-8')
		
		const outputPath = path.join(distDir, page)
		fs.writeFileSync(outputPath, content)
	})
}

async function buildJS() {
	try {
		const ctx = await esbuild.context({
			entryPoints: ['src/scripts/main.js'],
			bundle: true,
			minify: !isWatch,
			sourcemap: isWatch,
			outfile: 'dist/js/main.js',
			target: 'es2020',
			define: {
				__RPC_URL__: JSON.stringify(resolveRpcUrl()),
			},
		})
		
		if (isWatch) {
			await ctx.watch()
		} else {
			await ctx.rebuild()
			await ctx.dispose()
		}
	} catch (error) {
		console.error(error)
		process.exit(1)
	}
}

buildHTML()
buildJS()