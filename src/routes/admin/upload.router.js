import {LINK_STATIC_URL} from '@/configs'
import {Router} from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import diskSpaceMiddleware from '@/app/middleware/common/disk-space.middleware'
import {asyncHandler} from '@/utils/helpers'
import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import sharp from 'sharp'
const uploadRouter = Router()

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

// Middleware kiểm tra loại file và kích thước
const fileFilter = (req, file, cb) => {
    // Validate file size trước khi upload
    if (parseInt(req.headers['content-length']) > MAX_FILE_SIZE) {
        return cb(new Error(`File quá lớn. Kích thước tối đa là ${MAX_FILE_SIZE / (1024 * 1024)}MB.`), false)
    }
    
    // Kiểm tra định dạng file
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf'
    ]
    
    // Kiểm tra phần mở rộng của file
    const ext = path.extname(file.originalname).toLowerCase()
    
    // Từ chối file .txt và các file không được phép
    if (ext === '.txt' || file.mimetype === 'text/plain') {
        return cb(new Error('Không chấp nhận file .txt'), false)
    }
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận JPEG, PNG, GIF, WEBP và PDF.'), false)
    }
}

// Cấu hình multer với diskStorage thay vì memoryStorage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
        fs.mkdirSync(uploadDir, { recursive: true })
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, uniqueSuffix + ext)
    }
})

// Cấu hình multer với giới hạn
const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 5,
        parts: 100
    },
    fileFilter: fileFilter
})

// Middleware xử lý lỗi multer
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.error('Upload error:', err.message, err.code)
        
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File quá lớn. Kích thước tối đa là 2MB.'
                })
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Quá nhiều file. Số lượng tối đa là 5 file.'
                })
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    success: false,
                    message: 'Field không được phép.'
                })
            }
            if (err.code === 'LIMIT_PART_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Quá nhiều phần trong form.'
                })
            }
        }
        
        // Xử lý lỗi "Unexpected end of form"
        if (err.message.includes('Unexpected end of form')) {
            return res.status(400).json({
                success: false,
                message: 'Upload bị gián đoạn. Vui lòng thử lại với kết nối ổn định hơn.'
            })
        }
        
        return res.status(400).json({
            success: false,
            message: err.message || 'Lỗi upload file.'
        })
    }
    next()
}

// Thêm middleware xác thực vào tất cả các route upload
uploadRouter.use(asyncHandler(requireAuthentication))

// Thêm hàm resize ảnh
const resizeImage = async (filePath, fileSize, mimetype) => {
    try {
        if (!mimetype.startsWith('image/') || mimetype === 'image/gif') {
            return true
        }

        const fileSizeInMB = fileSize / (1024 * 1024)
        let quality = 100
        let maxWidth = 1920
        
        // Điều chỉnh chất lượng và kích thước dựa trên dung lượng file
        if (fileSizeInMB > 1.5) {
            quality = 60 // Giảm mạnh hơn cho file lớn
            maxWidth = 1280 // Giảm kích thước xuống
        } else if (fileSizeInMB > 1) {
            quality = 70
            maxWidth = 1600
        } else if (fileSizeInMB > 0.6) {
            quality = 80
            maxWidth = 1920
        }

        let outputFormat
        switch (mimetype) {
            case 'image/png':
                outputFormat = 'jpeg' // Chuyển PNG sang JPEG để giảm dung lượng
                break
            case 'image/webp':
                outputFormat = 'webp'
                break
            default:
                outputFormat = 'jpeg'
        }

        const image = sharp(filePath)
        const metadata = await image.metadata()

        // Tính toán kích thước mới giữ nguyên tỷ lệ
        let width = metadata.width
        let height = metadata.height
        if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
        }

        // Thực hiện resize và optimize
        await sharp(filePath)
            .resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
            })[outputFormat]({
                quality,
                chromaSubsampling: '4:2:0',
                ...(outputFormat === 'webp' ? {
                    effort: 6,
                    lossless: false,
                    nearLossless: false
                } : {})
            })
            .toFile(filePath + '_resized')

        // Thay thế file gốc
        fs.unlinkSync(filePath)
        fs.renameSync(filePath + '_resized', filePath)

        // Log kết quả
        const newSize = fs.statSync(filePath).size
        const reduction = ((fileSize - newSize) / fileSize * 100).toFixed(2)
        console.log(`Đã resize ảnh ${filePath}:
            - Kích thước cũ: ${(fileSize / 1024 / 1024).toFixed(2)}MB
            - Kích thước mới: ${(newSize / 1024 / 1024).toFixed(2)}MB
            - Giảm: ${reduction}%
            - Quality: ${quality}%
            - Format: ${outputFormat}
            - Dimensions: ${width}x${height}`)

        return true
    } catch (error) {
        console.error('Error resizing image:', error)
        return false
    }
}

// Middleware để xử lý các file đã upload vào temp
const processUploadedFiles = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return next()
        }
        
        req.formData = {}
        
        // Xử lý từng file đã upload
        for (const file of req.files) {
            const fieldname = file.fieldname
            
            // Gọi resize với thêm thông tin mimetype
            await resizeImage(file.path, file.size, file.mimetype)
            
            // Tạo đối tượng FileUpload từ file đã upload
            const fileUpload = {
                originalname: file.originalname,
                mimetype: file.mimetype,
                filename: file.filename,
                path: file.path,
                size: file.size,
                
                // Thêm phương thức save
                save: function(subdir) {
                    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subdir)
                    fs.mkdirSync(uploadDir, { recursive: true })
                    
                    const finalFilename = this.filename
                    const finalPath = path.join(uploadDir, finalFilename)
                    
                    // Di chuyển file từ thư mục temp sang thư mục đích
                    fs.renameSync(this.path, finalPath)
                    
                    // Cập nhật đường dẫn
                    this.filepath = path.posix.join('uploads', subdir, finalFilename)
                    return this.filepath
                },
                
                // Thêm phương thức toJSON
                toJSON: function() {
                    const { path, ...rest } = this
                    return rest
                }
            }
            
            // Thêm vào formData
            if (req.formData[fieldname]) {
                if (Array.isArray(req.formData[fieldname])) {
                    req.formData[fieldname].push(fileUpload)
                } else {
                    req.formData[fieldname] = [req.formData[fieldname], fileUpload]
                }
            } else {
                req.formData[fieldname] = fileUpload
            }
        }
        
        next()
    } catch (error) {
        console.error('Error processing uploaded files:', error)
        return res.status(500).json({
            success: false,
            message: 'Lỗi xử lý file đã upload',
            error: error.message
        })
    }
}

// Route upload file
uploadRouter.post(
    '/',
    diskSpaceMiddleware,
    upload.any(),
    handleMulterError,
    processUploadedFiles,
    (req, res) => {
        try {
            const formData = req.formData
            
            // Kiểm tra xem có formData không
            if (!formData || Object.keys(formData).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có file nào được upload.'
                })
            }
            
            const savedFiles = []

            // Lặp qua từng field trong formData
            Object.entries(formData).forEach(([fieldname, fieldFiles]) => {
                try {
                    if (Array.isArray(fieldFiles)) {
                        // Nếu có nhiều file trong một field
                        fieldFiles.forEach(file => {
                            try {
                                file.save(fieldname)
                                const fileInfo = file.toJSON()
                                const {filepath} = fileInfo
                                savedFiles.push({
                                    fieldname: fieldname,
                                    ...fileInfo,
                                    url: LINK_STATIC_URL + filepath,
                                })
                            } catch (saveError) {
                                console.error(`Error saving file in array for field ${fieldname}:`, saveError)
                            }
                        })
                    } else {
                        // Nếu chỉ có một file
                        fieldFiles.save(fieldname)
                        const fileInfo = fieldFiles.toJSON()
                        const {filepath} = fileInfo
                        savedFiles.push({
                            fieldname: fieldname, // Tên field
                            ...fileInfo,
                            url: LINK_STATIC_URL + filepath,
                        })
                    }
                } catch (fieldError) {
                    console.error(`Error processing field ${fieldname}:`, fieldError)
                }
            })
            
            if (savedFiles.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể lưu file nào.'
                })
            }

            res.status(200).json({
                success: true,
                message: 'Files uploaded successfully',
                files: savedFiles,
            })
        } catch (err) {
            console.error('File upload error:', err)
            res.status(500).json({
                success: false,
                message: 'File upload failed',
                error: err.message,
            })
        }
    }
)

export default uploadRouter
