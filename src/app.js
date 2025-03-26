// Thêm định nghĩa cho biến app
import express from 'express'
const app = express()

// Middleware bảo vệ chống tấn công upload
app.use((req, res, next) => {
    // Chỉ áp dụng cho các request upload
    if (req.path.includes('/upload') && req.method === 'POST') {
        // Kiểm tra Content-Type
        const contentType = req.headers['content-type'] || ''
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Content-Type. Must be multipart/form-data for file uploads.'
            })
        }
        
        // Kiểm tra Content-Length
        const contentLength = parseInt(req.headers['content-length'] || '0')
        if (contentLength > 50 * 1024 * 1024) { // 50MB
            return res.status(413).json({
                success: false,
                message: 'Request entity too large. Maximum allowed size is 50MB.'
            })
        }
    }
    
    next()
})

// Export app để sử dụng ở nơi khác
export default app 