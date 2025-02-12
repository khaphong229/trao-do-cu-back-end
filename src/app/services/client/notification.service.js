import Notification from '@/models/client/notification'
import aqp from 'api-query-params'

export const filter = async (qs, limit, current, req) => {
    // Sử dụng aqp để phân tích query string thành object filter
    let {filter} = aqp(qs)

    // Loại bỏ các trường phân trang khỏi filter
    delete filter.current
    delete filter.pageSize

    // Bắt buộc filter theo user hiện tại để chỉ trả về notifications của chính họ
    filter.user_id = req.currentUser._id

    // Xử lý tìm kiếm nếu có từ khóa (q)
    let {q} = filter
    delete filter.q
    if (q) {
        // Tạo điều kiện tìm kiếm dạng regex (không phân biệt hoa thường)
        q = {$regex: q, $options: 'i'}
        filter = {
            ...filter,
            ...(q && {$or: [{type: q}]}),
            // Ở đây bạn có thể mở rộng thêm các trường cần tìm kiếm trong Notification nếu cần
        }
    }

    // Lấy thông tin sắp xếp từ query string, nếu không có thì mặc định theo created_at giảm dần
    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}

    // Truy vấn danh sách notifications với filter, phân trang, sắp xếp và populate thông tin liên quan
    const data = await Notification.find(filter)
        // Populate thông tin bài post liên quan (lấy các trường cần thiết)
        .populate('post_id')
        // Populate thông tin người dùng (ví dụ: tên, email, avatar)
        .populate('user_id', 'name email avatar')
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .lean()

    // Không cần xử lý thêm logic như isRequested trong post, trả về data trực tiếp
    const processedData = data

    // Lấy tổng số notifications thỏa filter
    const total = await Notification.countDocuments(filter)
    // console.log('filter', filter)
    return {total, current, limit, data: processedData}
}
