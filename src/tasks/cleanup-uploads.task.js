import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const unlink = promisify(fs.unlink)

// Hàm đệ quy để xử lý từng thư mục và thư mục con
async function processDirectory(directory, maxAge, maxFileSize, options = {}) {
    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true })
        return { deletedCount: 0, deletedSize: 0 }
    }
    
    const files = await readdir(directory)
    const now = Date.now()
    let deletedCount = 0
    let deletedSize = 0
    
    console.log(`Checking ${files.length} items in ${directory}...`)
    
    for (const file of files) {
        const filePath = path.join(directory, file)
        
        try {
            const fileStat = await stat(filePath)
            
            // Nếu là thư mục, xử lý đệ quy
            if (fileStat.isDirectory()) {
                // Kiểm tra xem thư mục có nằm trong danh sách bảo vệ không
                const dirName = path.basename(filePath)
                if (options.protectedDirs && options.protectedDirs.includes(dirName)) {
                    console.log(`Skipping protected directory: ${dirName}`)
                    continue
                }
                
                // Xử lý đệ quy thư mục con
                const result = await processDirectory(filePath, maxAge, maxFileSize, options)
                deletedCount += result.deletedCount
                deletedSize += result.deletedSize
                continue
            }
            
            // Xử lý file
            
            // Kiểm tra xem file có nằm trong thư mục được bảo vệ không
            const parentDir = path.basename(path.dirname(filePath))
            if (options.protectedDirs && options.protectedDirs.includes(parentDir) && options.protectImportantFiles) {
                // Nếu là thư mục quan trọng, chỉ xóa file .txt
                if (path.extname(file).toLowerCase() === '.txt') {
                    const fileSize = fileStat.size
                    await unlink(filePath)
                    deletedCount++
                    deletedSize += fileSize
                    console.log(`Deleted .txt file from protected dir: ${filePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)
                }
                continue
            }
            
            // Xóa ngay lập tức các file .txt
            if (path.extname(file).toLowerCase() === '.txt') {
                const fileSize = fileStat.size
                await unlink(filePath)
                deletedCount++
                deletedSize += fileSize
                console.log(`Deleted .txt file: ${filePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)
                continue
            }
            
            // Xóa file lớn hơn maxFileSize
            if (fileStat.size > maxFileSize) {
                const fileSize = fileStat.size
                await unlink(filePath)
                deletedCount++
                deletedSize += fileSize
                console.log(`Deleted large file: ${filePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)
                continue
            }
            
            // Nếu file cũ hơn maxAge, xóa nó
            if (now - fileStat.mtime.getTime() > maxAge) {
                const fileSize = fileStat.size
                await unlink(filePath)
                deletedCount++
                deletedSize += fileSize
                console.log(`Deleted old file: ${filePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)
            }
        } catch (error) {
            console.error(`Error processing ${filePath}:`, error)
        }
    }
    
    return { deletedCount, deletedSize }
}

export async function cleanupUploads() {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const maxAge = 30 * 24 * 60 * 60 * 1000 * 10 // 300 days in milliseconds
    const maxFileSize = 5 * 1024 * 1024 // 5MB in bytes
    
    // Danh sách các thư mục quan trọng cần xử lý đặc biệt
    const options = {
        protectedDirs: ['avatar', 'qrcode', 'post','logoApp.jpg', 'exchange'], // Các thư mục quan trọng
        protectImportantFiles: true // Chỉ xóa file .txt trong thư mục quan trọng
    }
    
    try {
        console.log('Starting cleanup of uploads directory...')
        
        const result = await processDirectory(uploadsDir, maxAge, maxFileSize, options)
        
        console.log(`Cleanup completed. Deleted ${result.deletedCount} files, freed ${(result.deletedSize / 1024 / 1024).toFixed(2)} MB of space.`)
    } catch (error) {
        console.error('Error during cleanup:', error)
    }
} 