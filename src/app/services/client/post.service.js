import Post from '@/models/client/post'
import {abort} from '@/utils/helpers'
import aqp from 'api-query-params'

export async function create(requestBody, req) {
    const user_id = req.currentUser._id
    requestBody.user_id = user_id
    const data = new Post(requestBody)
    await data.save()
    return data
}

export async function createRePostSer(requestBody, req) {
    const {postId} = requestBody
    const userId = req.currentUser._id
    console.log({postId, userId})
    // Kiểm tra bài gốc
    const originalPost = await Post.findOne({_id: postId, user_id: userId})
    console.log('originalPost', originalPost)
    if (!originalPost) {
        abort(404, 'Bài đăng không tồn tại hoặc không thuộc về bạn.')
    }

    // Đánh dấu bài gốc là `isDeleted: true`
    originalPost.status = 'inactive'
    originalPost.isDeleted = true
    await originalPost.save()

    const repostedPost = new Post({
        user_id: userId,
        type: originalPost.type, // Loại bài giữ nguyên
        title: originalPost.title,
        description: originalPost.description,
        contact_social_media: originalPost.contact_social_media,
        image_url: originalPost.image_url,
        contact_phone: originalPost.contact_phone,
        contact_address: originalPost.contact_address,
        status: 'active', // Trạng thái mặc định cho bài viết mới
        createdAt: new Date(),
        updatedAt: new Date(),
        specificLocation: originalPost.specificLocation,
        city: originalPost.city,
        category_id: originalPost.category_id,
    })

    // Lưu bài đăng mới
    await repostedPost.save()

    return repostedPost
}

export const filter = async (qs, limit, current) => {
    let {filter} = aqp(qs)
    delete filter.current
    delete filter.pageSize
    // filter.isDeleted = false
    let {q} = filter
    delete filter.q
    if (q) {
        q = q ? {$regex: q, $options: 'i'} : null
        filter = {
            ...(q && {$or: [{title: q}, {description: q}]}),
        }
        // filter.isDeleted = false
    }
    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}
    // console.log({sort, current, limit, q, filter})

    const data = await Post.find(filter)
        .populate('user_id')
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)

    const total = await Post.countDocuments(filter)
    return {total, current, limit, data}
}

export const filterMe = async (qs, limit, current, req) => {
    const user_id = req.currentUser._id
    let {filter} = aqp(qs)
    delete filter.current
    delete filter.pageSize
    filter.user_id = user_id
    let {q} = filter
    delete filter.q
    if (q) {
        q = q ? {$regex: q, $options: 'i'} : null
        filter = {
            ...(q && {$or: [{title: q}, {description: q}]}),
        }
        filter.user_id = user_id
    }
    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}
    console.log({sort, current, limit, q, filter})

    const data = await Post.find(filter)
        .populate('user_id')
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)

    const total = await Post.countDocuments(filter)
    return {total, current, limit, data}
}

export const details = async (id) => {
    // const user_id = req.currentUser._id
    const data = await Post.findOne({_id: id}).populate('user_id')
    return data
}
