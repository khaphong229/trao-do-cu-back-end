import {LINK_STATIC_URL} from '@/configs'
import formDataHandler from '@/handlers/form-data.handler'
import {Router} from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import checkDiskSpace from '@/app/middleware/common/disk-space.middleware'
import {asyncHandler} from '@/utils/helpers'
import requireAuthentication from '@/app/middleware/common/client/require-authentication'
const uploadRouter = Router()

// Middleware kiểm tra loại file và kích thước
const fileFilter = (req, file, cb) => {
    // Kiểm tra định dạng file
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

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
        fs.mkdirSync(uploadDir, {recursive: true})
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, uniqueSuffix + ext)
    },
})

// Cấu hình multer với giới hạn
const upload = multer({
    storage: storage, // Sử dụng diskStorage thay vì memoryStorage
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
        files: 10, // Giới hạn số lượng file
        parts: 100, // Thêm giới hạn số lượng parts trong form
    },
    fileFilter: fileFilter,
})

// Middleware xử lý lỗi multer
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.error('Upload error:', err.message, err.code)

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File quá lớn. Kích thước tối đa là 5MB.',
                })
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Quá nhiều file. Số lượng tối đa là 10 file.',
                })
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    success: false,
                    message: 'Field không được phép.',
                })
            }
            if (err.code === 'LIMIT_PART_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Quá nhiều phần trong form.',
                })
            }
        }

        // Xử lý lỗi "Unexpected end of form"
        if (err.message.includes('Unexpected end of form')) {
            return res.status(400).json({
                success: false,
                message: 'Upload bị gián đoạn. Vui lòng thử lại với kết nối ổn định hơn.',
            })
        }

        return res.status(400).json({
            success: false,
            message: err.message || 'Lỗi upload file.',
        })
    }
    next()
}

// Middleware giới hạn tần suất upload
const uploadRateLimit = (req, res, next) => {
    // Lấy IP của người dùng
    const ip = req.ip || req.connection.remoteAddress

    // Kiểm tra trong bộ nhớ cache hoặc database
    // Đây chỉ là ví dụ đơn giản, bạn có thể sử dụng Redis hoặc database để lưu trữ
    if (!global.uploadRateLimits) {
        global.uploadRateLimits = {}
    }

    if (!global.uploadRateLimits[ip]) {
        global.uploadRateLimits[ip] = {
            count: 1,
            timestamp: Date.now(),
        }
    } else {
        // Nếu đã quá 1 giờ, reset bộ đếm
        if (Date.now() - global.uploadRateLimits[ip].timestamp > 60 * 60 * 1000) {
            global.uploadRateLimits[ip] = {
                count: 1,
                timestamp: Date.now(),
            }
        } else {
            // Nếu chưa quá 1 giờ, tăng bộ đếm
            global.uploadRateLimits[ip].count++

            // Nếu đã vượt quá giới hạn, từ chối request
            if (global.uploadRateLimits[ip].count > 10) {
                return res.status(429).json({
                    success: false,
                    message: 'Quá nhiều request upload. Vui lòng thử lại sau.',
                })
            }
        }
    }

    next()
}

// Thêm middleware xác thực vào tất cả các route upload
uploadRouter.use(asyncHandler(requireAuthentication))

// Middleware để xử lý các file đã upload vào temp
const processUploadedFiles = (req, res, next) => {
    try {
        // Nếu không có files, tiếp tục
        if (!req.files || req.files.length === 0) {
            return next()
        }

        // Tạo formData nếu chưa có
        req.formData = {}

        // Xử lý từng file đã upload
        req.files.forEach((file) => {
            const fieldname = file.fieldname

            // Tạo đối tượng FileUpload từ file đã upload
            const fileUpload = {
                originalname: file.originalname,
                mimetype: file.mimetype,
                filename: file.filename,
                path: file.path,
                size: file.size,

                // Thêm phương thức save
                save: function (subdir) {
                    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subdir)
                    fs.mkdirSync(uploadDir, {recursive: true})

                    const finalFilename = this.filename
                    const finalPath = path.join(uploadDir, finalFilename)

                    // Di chuyển file từ thư mục temp sang thư mục đích
                    fs.renameSync(this.path, finalPath)

                    // Cập nhật đường dẫn
                    this.filepath = path.posix.join('uploads', subdir, finalFilename)
                    return this.filepath
                },

                // Thêm phương thức toJSON
                toJSON: function () {
                    const {path, ...rest} = this
                    return rest
                },
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
        })

        next()
    } catch (error) {
        console.error('Error processing uploaded files:', error)
        return res.status(500).json({
            success: false,
            message: 'Lỗi xử lý file đã upload',
            error: error.message,
        })
    }
}

// Route upload file
uploadRouter.post(
    '/',
    checkDiskSpace,
    uploadRateLimit,
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
                    message: 'Không có file nào được upload.',
                })
            }

            const savedFiles = []

            // Lặp qua từng field trong formData
            Object.entries(formData).forEach(([fieldname, fieldFiles]) => {
                try {
                    if (Array.isArray(fieldFiles)) {
                        // Nếu có nhiều file trong một field
                        fieldFiles.forEach((file) => {
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
                    message: 'Không thể lưu file nào.',
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
