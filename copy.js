import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function copyDir(src, dest) {
	if (!fs.existsSync(src)) return
	
	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true })
	}
	
	const entries = fs.readdirSync(src, { withFileTypes: true })
	
	for (const entry of entries) {
		const srcPath = path.join(src, entry.name)
		const destPath = path.join(dest, entry.name)
		
		if (entry.isDirectory()) {
			copyDir(srcPath, destPath)
		} else {
			fs.copyFileSync(srcPath, destPath)
		}
	}
}

const publicDir = path.join(__dirname, 'public')
const pagesDir = path.join(__dirname, 'src/pages')
const distDir = path.join(__dirname, 'dist')

if (fs.existsSync(publicDir)) {
	copyDir(publicDir, distDir)
}

if (fs.existsSync(pagesDir)) {
	const pages = fs.readdirSync(pagesDir).filter(file => file.endsWith('.html'))
	pages.forEach(page => {
		fs.copyFileSync(path.join(pagesDir, page), path.join(distDir, page))
	})
}