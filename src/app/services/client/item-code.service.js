// Tạo hàm sinh mã vật phẩm:

import Category from '@/models/client/category'
import Post from '@/models/client/post'
import { abort } from '@/utils/helpers'

// Hàm lấy mã viết tắt từ tên danh mục
const getShortCode = (categoryName) => {
    // Chuyển tên danh mục thành mã viết tắt
    // VD: "Đồ điện tử" -> "ĐĐT", "Quần áo" -> "QA"
    const words = categoryName.split(' ')
    return words.map(word => word[0]).join('').toUpperCase()
}

// Hàm tạo mã vật phẩm với timestamp ngắn gọn hơn
const generateCompactItemCode = (shortCode) => {
    // Sử dụng 4 chữ số cuối của timestamp + 1 chữ số ngẫu nhiên
    const timestamp = Date.now().toString().slice(-4) // 4 chữ số cuối của timestamp
    const randomDigit = String(Math.floor(Math.random() * 10)) // 1 chữ số ngẫu nhiên (0-9)
    return `${shortCode}-${timestamp}${randomDigit}`
}

export const generateItemCode = async (categoryId) => {
    // Kiểm tra category có tồn tại không
    const category = await Category.findById(categoryId)
    if (!category) {
        abort(404, 'Không tìm thấy danh mục')
    }

    // Lấy mã viết tắt từ category hoặc tạo mới từ tên
    const shortCode = category.shortCode || getShortCode(category.name)
    
    // Tạo mã vật phẩm dựa trên timestamp ngắn gọn
    let newItemCode = generateCompactItemCode(shortCode)
    
    // Kiểm tra xem mã mới có trùng không
    let duplicateCheck = await Post.findOne({ itemCode: newItemCode })
    
    // Trong trường hợp có trùng lặp, thử lại với timestamp mới
    if (duplicateCheck) {
        // Đợi 1ms để đảm bảo timestamp khác
        await new Promise(resolve => setTimeout(resolve, 1))
        newItemCode = generateCompactItemCode(shortCode)
        duplicateCheck = await Post.findOne({ itemCode: newItemCode })
        
        // Nếu vẫn trùng, thử thêm lần nữa với số ngẫu nhiên khác
        if (duplicateCheck) {
            for (let i = 0; i < 5; i++) {
                // Tạo mã với 5 chữ số ngẫu nhiên hoàn toàn
                const randomCode = String(Math.floor(10000 + Math.random() * 90000))
                newItemCode = `${shortCode}-${randomCode}`
                
                duplicateCheck = await Post.findOne({ itemCode: newItemCode })
                if (!duplicateCheck) break
            }
            
            // Nếu vẫn trùng sau nhiều lần thử, báo lỗi
            if (duplicateCheck) {
                abort(400, 'Không thể tạo mã vật phẩm duy nhất, vui lòng thử lại')
            }
        }
    }
    
    return newItemCode
} 