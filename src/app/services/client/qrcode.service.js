import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'

export const generateTransactionQR = async (data) => {
    // Xác định loại giao dịch (trao đổi hoặc trao tặng)
    const transactionType = data.transactionType || 'exchange' // Mặc định là trao đổi nếu không chỉ định
    
    // Tạo thư mục lưu QR code nếu chưa tồn tại
    const qrDir = path.join(process.cwd(), 'public/uploads/qrcode')
    if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true })
    }
    
    // Format thời gian hoàn thành
    const date = new Date(data.completedAt)
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
    
    // Chuẩn bị dữ liệu cho QR code
    const qrData = JSON.stringify({
        transactionId: data.requestId,
        itemCode: data.itemCode,
        itemName: data.itemName,
        category: data.category.name,
        owner: data.owner,
        receiver: data.receiver,
        transactionType: transactionType, // Thêm loại giao dịch vào QR code
        completedAt: formattedDate
    })
    
    // Tạo file QR code với prefix theo loại giao dịch
    const prefix = transactionType === 'gift' ? 'gift' : 'exchange'
    const filename = `${prefix}-${data.requestId}.png`
    const filePath = path.join(qrDir, filename)
    await QRCode.toFile(filePath, qrData, { width: 300 })
    
    // Trả về đường dẫn tương đối của QR code
    return `/uploads/qrcode/${filename}`
} 