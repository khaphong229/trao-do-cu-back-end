import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export const checkDiskSpace = async (req, res, next) => {
    try {
        // Chỉ kiểm tra nếu là request upload
        if (req.path.includes('/upload') && req.method === 'POST') {
            // Phương pháp 1: Kiểm tra dung lượng ổ đĩa bằng lệnh df (Linux/Unix)
            try {
                const { stdout } = await execAsync('df -h / | tail -1 | awk \'{print $5}\'')
                const usedPercentage = parseInt(stdout.trim().replace('%', ''))
                
                if (usedPercentage > 90) {
                    return res.status(503).json({
                        success: false,
                        message: 'Server đang gần hết dung lượng lưu trữ. Vui lòng thử lại sau.'
                    })
                }
            } catch (error) {
                // Nếu lệnh df không hoạt động (Windows hoặc lỗi), sử dụng phương pháp 2
                console.error('Error checking disk space with df:', error)
            }
            
            // Phương pháp 2: Kiểm tra số lượng file trong thư mục uploads
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
            
            // Đảm bảo thư mục tồn tại
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true })
            }
            
            // Đếm số lượng file trong thư mục
            const files = fs.readdirSync(uploadsDir)
            
            // Nếu có quá nhiều file, từ chối request
            if (files.length > 10000) {
                return res.status(503).json({
                    success: false,
                    message: 'Server đang quá tải. Vui lòng thử lại sau.'
                })
            }
        }
        
        next()
    } catch (error) {
        console.error('Error checking disk space:', error)
        next()
    }
}

export default checkDiskSpace 