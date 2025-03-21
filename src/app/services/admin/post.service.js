import aqp from 'api-query-params'
import { abort } from '@/utils/helpers'
import Post from '@/models/client/post'
import { generateItemCode } from '../client/item-code.service'
import slugify from 'slugify'

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


export const updateAllSlugs = async () => {
    const posts = await Post.find({ slug: { $exists: false } })
    
    let updatedCount = 0
    for (const post of posts) {
        // Khi lưu lại, thư viện sẽ tự động tạo slug
        await post.save()
        updatedCount++
    }
    
    return { 
        message: `Đã cập nhật slug cho ${updatedCount} bài viết`,
        updatedCount
    }
}

export const generateSlugsForExistingPosts = async () => {
    try {
        // Tìm tất cả bài viết chưa có slug hoặc slug rỗng
        const posts = await Post.find({
            $or: [
                { slug: { $exists: false } },
                { slug: null },
                { slug: '' }
            ]
        })
        
        if (!posts.length) {
            return { message: 'Không có bài viết nào cần cập nhật slug', count: 0 }
        }
        
        let updatedCount = 0
        
        // Cập nhật slug cho từng bài viết
        for (const post of posts) {
            // Tạo slug từ title
            const baseSlug = slugify(post.title, {
                lower: true,
                strict: true,
                locale: 'vi'
            })
            
            let finalSlug = baseSlug
            let counter = 1
            
            // Kiểm tra slug tồn tại
            while (await Post.findOne({ 
                slug: finalSlug,
                _id: { $ne: post._id }
            })) {
                finalSlug = `${baseSlug}-${counter}`
                counter++
            }
            
            // Cập nhật slug
            await Post.findByIdAndUpdate(post._id, { slug: finalSlug })
            updatedCount++
        }
        
        return {
            message: 'Đã cập nhật slug cho các bài viết thành công',
            count: updatedCount
        }
    } catch (error) {
        abort(500, 'Có lỗi khi cập nhật slug: ' + error.message)
    }
}

