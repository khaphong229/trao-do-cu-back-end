// import QRCode from 'qrcode'
// import path from 'path'
// import fs from 'fs'

// export const generateTransactionQR = async (data) => {
//     // Xác định loại giao dịch (trao đổi hoặc trao tặng)
//     const transactionType = data.transactionType || 'exchange' // Mặc định là trao đổi nếu không chỉ định
    
//     // Tạo thư mục lưu QR code nếu chưa tồn tại
//     const qrDir = path.join(process.cwd(), 'public/uploads/qrcode')
//     if (!fs.existsSync(qrDir)) {
//         fs.mkdirSync(qrDir, { recursive: true })
//     }
    
//     // Format thời gian hoàn thành
//     const date = new Date(data.completedAt)
//     const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
    
//     // Chuẩn bị dữ liệu cho QR code
//     const qrData = 
//     `==============================
//             GIAO DỊCH TRAO ĐỒ CŨ
//     ===============================
//     Loại giao dịch   : ${transactionType === 'gift' ? 'Trao tặng' : 'Trao đổi'}
//     Mã sản phẩm      : ${data.requestId}
//     -----------------------------------
//     Tiêu đề bài đăng : ${data.itemName}
//     Mã hàng          : ${data.itemCode}
//     Loại hàng        : ${data.category.name}
//     -----------------------------------
//     Người nhận       : ${data.receiver}
//     SĐT người nhận   : '${data.phone_user_req}'
//     -----------------------------------
//     Thời gian HT     : ${formattedDate}
//     ==============================`
    
//     // Tạo file QR code với prefix theo loại giao dịch
//     const prefix = transactionType === 'gift' ? 'gift' : 'exchange'
//     const filename = `${prefix}-${data.requestId}.png`
//     const filePath = path.join(qrDir, filename)
//     await QRCode.toFile(filePath, qrData, { width: 300 })
    
//     // Trả về đường dẫn tương đối của QR code
//     return `/uploads/qrcode/${filename}`

    
// } 

import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'

export const generateTransactionQR = async (data) => {
    // Xác định loại giao dịch: mặc định là 'exchange' nếu không chỉ định
    const transactionType = data.transactionType || 'exchange'

    // Tạo thư mục lưu QR code nếu chưa tồn tại
    const qrDir = path.join(process.cwd(), 'public/uploads/qrcode')
    if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true })
    }

    // Format thời gian hoàn thành
    const date = new Date(data.completedAt)
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`

    // Hàm chèn zero-width space vào số điện thoại để làm rối (không hiển thị nhưng phá vỡ chuỗi số liên tục)
    const obfuscatePhone = (phone) => phone.split('').join('\u200B')

    // Chuẩn bị dữ liệu cho QR code dạng văn bản
    const qrData = 
`==============================
        GIAO DỊCH TRAO ĐỒ CŨ
==============================
Loại giao dịch   : ${transactionType === 'gift' ? 'Trao tặng' : 'Trao đổi'}
Mã sản phẩm      : ${data.requestId}
-----------------------------------
Tiêu đề bài đăng : ${data.itemName}
Mã hàng          : ${data.itemCode}
Loại hàng        : ${data.category.name}
-----------------------------------
Người nhận       : ${data.receiver}
SĐT người nhận   : ${obfuscatePhone(data.phone_user_req)}
-----------------------------------
Thời gian HT     : ${formattedDate}
==============================`

    // Tạo file QR code với prefix theo loại giao dịch
    const prefix = transactionType === 'gift' ? 'gift' : 'exchange'
    const filename = `${prefix}-${data.requestId}.png`
    const filePath = path.join(qrDir, filename)
    await QRCode.toFile(filePath, qrData, { width: 300 })

    // Trả về đường dẫn tương đối của QR code
    return `/uploads/qrcode/${filename}`
}
