import fs from 'fs'
import path from 'path'
import bytes from 'bytes'
import mime from 'mime-types'
import {PUBLIC_DIR, UUID_TRANSLATOR} from '@/configs'

class FileUpload {
    static UPLOAD_FOLDER = 'uploads'

    constructor({originalname, mimetype, buffer}) {
        this.originalname = originalname
        this.mimetype = mimetype // image/jpeg hoặc application/pdf.
        this.buffer = buffer
        this.size = buffer ? buffer.length : 0

        // Sử dụng UUID_TRANSLATOR để tạo tên file duy nhất và lấy phần mở rộng từ mimetype
        this.filename = `${UUID_TRANSLATOR.generate()}.${mime.extension(this.mimetype)}`
    }

    toJSON() {
        const {buffer, ...rest} = this
        rest.filesize = bytes(Buffer.byteLength(buffer))
        // convert byte => 2.1MB ,3KB => người hiểu
        return rest
    }

    toString() {
        return this.filepath || this.originalname
        //filepath đã được thiết lập (sau khi file đã được lưu), thì sẽ trả
        // về đường dẫn đó, ngược lại trả về originalname.
    }

    save(...paths) {
        if (!this.filepath) {
            // Kiểm tra phần mở rộng của file
            const ext = path.extname(this.originalname).toLowerCase()
            
            // Từ chối file .txt
            if (ext === '.txt' || this.mimetype === 'text/plain') {
                throw new Error('Không chấp nhận file .txt')
            }
            
            // Kiểm tra kích thước file
            if (this.size > 5 * 1024 * 1024) { // 5MB
                throw new Error('File quá lớn. Kích thước tối đa là 5MB.')
            }
            
            // Khai báo đường dẫn lưu file
            const uploadDir = path.join(PUBLIC_DIR, FileUpload.UPLOAD_FOLDER, ...paths)
            fs.mkdirSync(uploadDir, {recursive: true}) // Tạo thư mục nếu nó chưa tồn tại

            let finalFilePath = null
            try {
                // Lưu file vào hệ thống
                finalFilePath = path.join(uploadDir, this.filename)
                fs.writeFileSync(finalFilePath, this.buffer)
                
                // Gán đường dẫn của file đã lưu
                this.filepath = path.posix.join(FileUpload.UPLOAD_FOLDER, ...paths, this.filename)
                return this.filepath
            } catch (error) {
                // Nếu có lỗi khi lưu file, xóa file nếu nó đã được tạo
                if (finalFilePath && fs.existsSync(finalFilePath)) {
                    try {
                        fs.unlinkSync(finalFilePath)
                        console.log(`Đã xóa file lỗi: ${finalFilePath}`)
                    } catch (unlinkError) {
                        console.error(`Không thể xóa file lỗi: ${finalFilePath}`, unlinkError)
                    }
                }
                throw error // Ném lại lỗi để xử lý ở cấp cao hơn
            }
        } else {
            throw new Error('File saved. Use the "filepath" attribute to retrieve the file path.')
        }
    }

    static remove(filepath) {
        try {
            filepath = path.join(PUBLIC_DIR, filepath)
            // chuyển thành tuyệt đối để xóa =)))
            if (!fs.existsSync(filepath)) return
            const stats = fs.statSync(filepath)
            if (stats.isFile()) {
                fs.unlinkSync(filepath)
                console.log(`Đã xóa file: ${filepath}`)
            }
        } catch (error) {
            console.error(`Lỗi khi xóa file ${filepath}:`, error)
            // Không ném lỗi để không làm gián đoạn luồng xử lý
        }
    }
}

export default FileUpload
