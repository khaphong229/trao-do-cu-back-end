import _ from 'lodash'
import fs from 'fs'
import {FileUpload} from '../utils/classes'

function formDataHandler(req, res, next) {
    try {
        const files = req.files
        
        if (!files || files.length === 0) {
            return next()
        }
        
        for (const file of files) {
            try {
                const fieldname = file.fieldname
                
                // Đọc file từ disk
                const buffer = fs.readFileSync(file.path)
                
                // Tạo đối tượng FileUpload với buffer đã đọc
                const fileUpload = new FileUpload({
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    buffer: buffer
                })
                
                // Xóa file tạm sau khi đã đọc vào buffer
                fs.unlinkSync(file.path)
                
                // Thêm vào req.body
                if (_.isUndefined(req.body[fieldname])) {
                    req.body[fieldname] = fileUpload // => 1 obj
                } else {
                    if (_.isArray(req.body[fieldname])) {
                        req.body[fieldname].push(fileUpload) // => push vào mảng
                    } else {
                        req.body[fieldname] = [req.body[fieldname], fileUpload] // => 1 mảng
                    }
                }
            } catch (fileError) {
                console.error('Error processing file:', fileError)
                // Tiếp tục xử lý các file khác
            }
        }
        
        // Xóa req.files để tránh xử lý trùng lặp
        delete req.files
        
        next()
    } catch (error) {
        console.error('Error in formDataHandler:', error)
        next(error)
    }
}

export default formDataHandler

