import express from 'express'
import path from 'path'
import serveFavicon from 'serve-favicon'
import helmet from 'helmet'
import multer from 'multer'
import {APP_DEBUG, NODE_ENV, PUBLIC_DIR, VIEW_DIR} from './configs'
import fs from 'fs'

import {jsonify, sendMail} from './handlers/response.handler'
import corsHandler from './handlers/cors.handler'
import httpRequestHandler from './handlers/http-request.handler'
import limiter from './handlers/rate-limit.handler'
import formDataHandler from './handlers/form-data.handler'
import initLocalsHandler from './handlers/init-locals.handler'
import notFoundHandler from './handlers/not-found.handler'
import errorHandler from './handlers/error.handler'

import routeAdmin from './routes/admin'
import routeClient from './routes/client'
require('./passport')

// Khởi tạo cron jobs
import initCronJobs from './cron'
initCronJobs()

function createApp() {
    // Init app
    const app = express()

    app.response.jsonify = jsonify
    app.response.sendMail = sendMail

    app.set('env', NODE_ENV)
    app.set('trust proxy', 1)
    app.set('views', VIEW_DIR)
    app.set('view engine', 'ejs')

    app.use(corsHandler)
    if (APP_DEBUG) {
        app.use(httpRequestHandler)
    }
    app.use(limiter)
    app.use(serveFavicon(path.join(PUBLIC_DIR, 'favicon.ico')))
    app.use('/static', express.static(PUBLIC_DIR))
    app.use(helmet())
    app.use(express.json())
    app.use(express.urlencoded({extended: true}))
    
    // Thay đổi cấu hình multer
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(PUBLIC_DIR, 'uploads', 'temp')
            fs.mkdirSync(uploadDir, { recursive: true })
            cb(null, uploadDir)
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
            const ext = path.extname(file.originalname).toLowerCase()
            cb(null, uniqueSuffix + ext)
        }
    })
    
    const upload = multer({
        storage: storage,
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB
            files: 10,
            parts: 100 // Thêm giới hạn số lượng parts trong form
        },
        fileFilter: function(req, file, cb) {
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
    }).any()
    
    // Middleware xử lý lỗi multer
    const handleMulterError = (err, req, res, next) => {
        if (err) {
            console.error('Upload error:', err.message, err.code)
            
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File quá lớn. Kích thước tối đa là 5MB.'
                    })
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        message: 'Quá nhiều file. Số lượng tối đa là 10 file.'
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
    
    // Sử dụng middleware upload và xử lý lỗi
    app.use((req, res, next) => {
        if (req.path.includes('/upload') && req.method === 'POST') {
            upload(req, res, function(err) {
                if (err) {
                    return handleMulterError(err, req, res, next)
                }
                next()
            })
        } else {
            next()
        }
    })
    
    app.use(formDataHandler)
    app.use(initLocalsHandler)

    //route admin
    routeAdmin(app)
    //route client
    routeClient(app)

    // Not found handler
    app.use(notFoundHandler)

    // Error handler
    app.use(errorHandler)

    return app
}

export default createApp
