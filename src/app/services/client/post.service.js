import Post from '@/models/client/post'
import RequestsExchange from '@/models/client/requests_exchange'
import RequestsReceive from '@/models/client/requests_receive'
import {abort, getToken, verifyToken} from '@/utils/helpers'
import aqp from 'api-query-params'
import _ from 'lodash'
import {tokenBlocklist} from './auth.service'
import {TOKEN_TYPE} from '@/configs'
import * as userInteractionService from './user_interaction.service'
import UserInterest from '@/models/client/user_interest'
import { User } from '@/models'

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

export const filter = async (qs, limit, current, req) => {
    let {filter} = aqp(qs)
    delete filter.current
    delete filter.pageSize
    filter.isDeleted = false
    let {q} = filter
    delete filter.q

    // Xử lý query search nếu có
    if (q) {
        q = q ? {$regex: q, $options: 'i'} : null
        filter = {
            ...(q && {$or: [{title: q}, {description: q}]}),
        }
        filter.isDeleted = false
    }

    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}

    let data = []
    const userId = req.currentUser?._id

    // Base query cho tất cả bài viết
    const baseQuery = {
        ...filter,
        status: 'active',
        isDeleted: false
    }

    if (userId) {
        // 1. Lấy thông tin user và tính tuổi tài khoản
        const user = await User.findById(userId)
        const accountAge = Math.floor((new Date() - user.created_at) / (1000 * 60 * 60 * 24)) // Số ngày

        // 2. Lấy danh mục quan tâm từ lúc đăng ký
        const userInterests = await UserInterest.findOne({ user_id: userId })
        let registeredCategories = []
        if (userInterests) {
            registeredCategories = userInterests.interests.map(interest => interest.category_id)
        }

        // 3. Xác định nguồn dữ liệu category dựa vào tuổi tài khoản
        let categoryIds = []
        if (accountAge < 3) {
            // User mới: chỉ dùng danh mục đăng ký
            categoryIds = registeredCategories
        } else {
            // User cũ: kết hợp cả hai nguồn
            const interactionCategories = await userInteractionService.getTopCategoriesForUser(userId, 2)
            const interactionCategoryIds = interactionCategories.map(cat => cat._id)
            
            // Kết hợp và loại bỏ trùng lặp
            categoryIds = [...new Set([...registeredCategories, ...interactionCategoryIds])]
        }

        if (categoryIds.length > 0) {
            // 4. Query với priority
            const allPosts = await Post.aggregate([
                { $match: baseQuery },
                {
                    $addFields: {
                        isPriority: {
                            $cond: {
                                if: { $in: ['$category_id', categoryIds] },
                                then: 1,
                                else: 0
                            }
                        }
                    }
                },
                { $sort: { 
                    isPriority: -1,
                    ...sort
                }},
                { $skip: (current - 1) * limit },
                { $limit: limit }
            ])

            // 5. Populate các thông tin cần thiết
            data = await Post.populate(allPosts, [
                { path: 'user_id' },
                { path: 'category_id' }
            ])
        }
    }

    // Nếu không có user đăng nhập hoặc không có category quan tâm
    if (data.length === 0) {
        data = await Post.find(baseQuery)
            .populate('user_id')
            .populate('category_id')
            .skip((current - 1) * limit)
            .limit(limit)
            .sort(sort)
    }

    // Xử lý thêm thông tin isRequested
    const processedData = req.headers.authorization
        ? await Promise.all(
            data.map(async (post) => {
                const token = getToken(req.headers)
                if (token) {
                    const allowedToken = _.isUndefined(await tokenBlocklist.get(token))
                    if (allowedToken) {
                        const {user_id} = verifyToken(token, TOKEN_TYPE.AUTHORIZATION)
                        const requestModel = post.type === 'gift' ? RequestsReceive : RequestsExchange
                        const request = await requestModel.findOne({
                            post_id: post._id,
                            user_req_id: user_id,
                        })

                        return {
                            ...post,  // Bỏ .toObject() vì post đã là plain object
                            isRequested: !!request,
                        }
                    }
                }
                return post
            })
        )
        : data

    const total = await Post.countDocuments(baseQuery)
    return {total, current, limit, data: processedData}
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

export const details = async (id, req) => {
    const post = await Post.findOne({_id: id}).populate('user_id')
    if (!post) return null

    if (!req.headers.authorization) return post

    const token = getToken(req.headers)
    if (!token) return post

    const allowedToken = _.isUndefined(await tokenBlocklist.get(token))
    if (!allowedToken) return post

    const {user_id} = verifyToken(token, TOKEN_TYPE.AUTHORIZATION)
    const requestModel = post.type === 'gift' ? RequestsReceive : RequestsExchange
    const request = await requestModel.findOne({
        post_id: post._id,
        user_req_id: user_id,
    })

    return {
        ...post.toObject(),
        isRequested: !!request,
    }
}
