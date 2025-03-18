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

export const generateItemCode = async (categoryId) => {
    // Kiểm tra category có tồn tại không
    const category = await Category.findById(categoryId)
    if (!category) {
        abort(404, 'Không tìm thấy danh mục')
    }

    // Lấy mã viết tắt từ category hoặc tạo mới từ tên
    const shortCode = category.shortCode || getShortCode(category.name)
    
    // Đếm số lượng vật phẩm đã hoàn thành trong danh mục
    const count = await Post.countDocuments({ 
        category_id: categoryId,
        status: 'completed'
    })
    
    // Tạo mã vật phẩm: ĐĐT-001, QA-002,...
    const serialNumber = String(count + 1).padStart(3, '0')
    return `${shortCode}-${serialNumber}`
} 