import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')

if (fs.existsSync(distDir)) {
	fs.rmSync(distDir, { recursive: true, force: true })
}

fs.mkdirSync(path.join(distDir, 'css'), { recursive: true })
fs.mkdirSync(path.join(distDir, 'js'), { recursive: true })
fs.mkdirSync(path.join(distDir, 'images'), { recursive: true })