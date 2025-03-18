import aqp from 'api-query-params'
import { abort } from '@/utils/helpers'
import Post from '@/models/client/post'
import { generateItemCode } from '../client/item-code.service'

export const filter = async (qs, limit, current) => {
    const {filter} = aqp(qs)
    delete filter.current
    delete filter.pageSize

    // Xử lý query search
    const {q} = filter
    delete filter.q
    console.log('filter :' , filter)

    // Thêm điều kiện isDeleted và search vào filter
    filter.isDeleted = false
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } }
        ]
    }


    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 20
    if (!sort) sort = {created_at: -1}

    const data = await Post.find(filter)
        .populate('user_id', 'name email')
        .populate('category_id', 'name')
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .lean()

    const total = await Post.countDocuments(filter)

    return {
        current,
        limit,
        total,
        data,
    }
}

export const updatePostApproval = async (postId, { isApproved, reason }) => {
    const post = await Post.findById(postId).populate('category_id')
    if (!post) {
        abort(404, 'Bài viết không tồn tại')
    }

    post.isApproved = isApproved
    post.approvalReason = reason
    post.approvedAt = isApproved ? new Date() : null
    
    // Nếu bài đăng được duyệt, tạo mã vật phẩm
    if (isApproved && !post.itemCode) {
        // Kiểm tra category_id có tồn tại không
        if (!post.category_id) {
            abort(400, 'Bài viết không có danh mục')
        }
        
        // Tạo mã vật phẩm dựa trên category
        const itemCode = await generateItemCode(post.category_id._id)
        post.itemCode = itemCode
    }
    
    await post.save()

    return post
} 