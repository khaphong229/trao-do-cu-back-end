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
import {User} from '@/models'
import mongoose from 'mongoose'
import slugify from 'slugify'
import {PCOIN} from '@/configs/pcoin-system'

export async function create(requestBody, req) {
    const user_id = req.currentUser._id
    requestBody.user_id = user_id

    // Xử lý cấu hình P-Coin từ các trường riêng lẻ
    const rewardAmount = requestBody.rewardAmount || PCOIN.AMOUNTS.DEFAULT_POST_REWARD
    const requiredAmount = requestBody.requiredAmount || PCOIN.AMOUNTS.DEFAULT_REQUEST_COST

    // Tạo đối tượng pcoin_config
    requestBody.pcoin_config = {
        reward_amount: Math.min(
            Math.max(rewardAmount, PCOIN.AMOUNTS.MIN_POST_REWARD),
            PCOIN.AMOUNTS.MAX_POST_REWARD
        ),
        required_amount: Math.min(
            Math.max(requiredAmount, PCOIN.AMOUNTS.MIN_REQUIRED),
            PCOIN.AMOUNTS.MAX_REQUEST_COST
        ),
    }

    // Xóa các trường riêng lẻ để tránh lưu trùng
    delete requestBody.rewardAmount
    delete requestBody.requiredAmount

    const data = new Post(requestBody)
    await data.save()
    return data
}

export async function createRePostSer(requestBody, req) {
    const {postId} = requestBody
    const userId = req.currentUser._id
    // console.log({postId, userId})
    // Kiểm tra bài gốc
    const originalPost = await Post.findOne({_id: postId, user_id: userId})
    // console.log('originalPost', originalPost)
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

export const filterCategory = async (qs, limit, current, req) => {
    let {filter} = aqp(qs)
    delete filter.current
    delete filter.pageSize
    filter.isDeleted = false
    filter.isPtiterOnly = false
    filter.isApproved = true // Chỉ hiển thị bài đã được duyệt

    let {q} = filter
    delete filter.q
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
    // console.log('filterCategory query:', {filter, current, limit, sort})

    const data = await Post.find(filter)
        .select(
            '-contact_phone -specificLocation -contact_social_media -approvalReason -createdAt -updatedAt -deletedAt'
        )
        .populate({
            path: 'category_id',
            select: '_id name',
        })
        .populate({
            path: 'user_id',
            select: '_id name avatar status isGoogle',
        })
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .lean()

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
                            ...post,
                            isRequested: !!request,
                        }
                    }
                }
            })
        )
        : data

    const total = await Post.countDocuments(filter)
    console.log('filterCategory result:', {total, dataLength: data.length})
    return {total, current, limit, data: processedData}
}

export const filter = async (qs, limit, current, req) => {
    let {filter} = aqp(qs)
    delete filter.current
    delete filter.pageSize

    let {q} = filter
    delete filter.q

    // Thêm điều kiện cơ bản
    filter.isDeleted = false
    filter.isApproved = true
    filter.isPtiterOnly = false
    filter.status = 'active'

    if (q) {
        q = q ? {$regex: q, $options: 'i'} : null
        filter = {
            ...filter,
            ...(q && {$or: [{title: q}, {description: q}]}),
        }
    }

    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 16
    if (!sort) sort = {created_at: -1}
    console.log('filter query:', {filter, current, limit, sort})

    let data = []
    const userId = req.currentUser?._id

    // Kiểm tra user đã đăng nhập và đã khảo sát chưa
    if (userId) {
        const user = await User.findById(userId)
        if (user.isSurveyed) {
            // Lấy danh mục quan tâm
            const accountAge = Math.floor((new Date() - user.created_at) / (1000 * 60 * 60 * 24))
            const userInterests = await UserInterest.findOne({user_id: userId})
            let categoryIds = []

            if (accountAge < 3) {
                // User mới: chỉ dùng danh mục từ khảo sát
                if (userInterests) {
                    categoryIds = userInterests.interests.map(
                        (interest) => new mongoose.Types.ObjectId(interest.category_id)
                    )
                }
            } else {
                // User cũ: kết hợp cả tương tác
                let registeredCategories = []
                if (userInterests) {
                    registeredCategories = userInterests.interests.map(
                        (interest) => new mongoose.Types.ObjectId(interest.category_id)
                    )
                }
                const interactionCategories = await userInteractionService.getTopCategoriesForUser(userId, 2)
                const interactionCategoryIds = interactionCategories.map(
                    (cat) => new mongoose.Types.ObjectId(cat._id)
                )
                categoryIds = [...new Set([...registeredCategories, ...interactionCategoryIds])]
            }

            // Query với ưu tiên nhưng không lọc bỏ bài viết nào
            data = await Post.find(filter)
                .select(
                    '-contact_phone -specificLocation -contact_social_media -approvalReason -createdAt -updatedAt -deletedAt'
                )
                .lean()
                .then((posts) => {
                    // Đánh dấu bài viết thuộc category ưu tiên
                    return posts.map((post) => ({
                        ...post,
                        isPriority: categoryIds.some(
                            (catId) => catId.toString() === post.category_id.toString()
                        )
                            ? 1
                            : 0,
                    }))
                })
                .then((posts) => {
                    // Sắp xếp: ưu tiên trước, sau đó theo sort condition
                    return posts.sort((a, b) => {
                        if (a.isPriority !== b.isPriority) {
                            return b.isPriority - a.isPriority
                        }
                        // Áp dụng sort condition
                        const sortField = Object.keys(sort)[0]
                        const sortOrder = sort[sortField]
                        if (a[sortField] < b[sortField]) return sortOrder === 1 ? -1 : 1
                        if (a[sortField] > b[sortField]) return sortOrder === 1 ? 1 : -1
                        return 0
                    })
                })
                .then((posts) => {
                    // Áp dụng phân trang
                    return posts.slice((current - 1) * limit, current * limit)
                })

            // Populate user và category data
            data = await Post.populate(data, [
                {path: 'user_id', select: '_id name avatar status isGoogle'},
                {path: 'category_id', select: '_id name'},
            ])
        } else {
            // User chưa khảo sát - query đơn giản
            data = await Post.find(filter)
                .select(
                    '-contact_phone -specificLocation -contact_social_media -approvalReason -createdAt -updatedAt -deletedAt'
                )
                .populate('user_id', '_id name avatar status isGoogle')
                .populate('category_id', '_id name')
                .skip((current - 1) * limit)
                .limit(limit)
                .sort(sort)
                .lean()
        }
    } else {
        // User chưa đăng nhập - query đơn giản
        data = await Post.find(filter)
            .select(
                '-contact_phone -specificLocation -contact_social_media -approvalReason -createdAt -updatedAt -deletedAt'
            )
            .populate('user_id', '_id name avatar status isGoogle')
            .populate('category_id', '_id name')
            .skip((current - 1) * limit)
            .limit(limit)
            .sort(sort)
            .lean()
    }

    // Xử lý thêm thông tin isRequested
    const processedData = req.headers.authorization
        ? await Promise.all(
            data.map(async (post) => {
                const token = getToken(req.headers)
                if (token) {
                    try {
                        const allowedToken = _.isUndefined(await tokenBlocklist.get(token))
                        if (allowedToken) {
                            const {user_id} = verifyToken(token, TOKEN_TYPE.AUTHORIZATION)
                            const requestModel = post.type === 'gift' ? RequestsReceive : RequestsExchange
                            const request = await requestModel
                                .findOne({
                                    post_id: post._id,
                                    user_req_id: user_id,
                                })
                                .lean()

                            return {
                                ...post,
                                isRequested: !!request,
                            }
                        }
                    } catch (error) {
                        // Nếu token hết hạn hoặc không hợp lệ, trả về post không có isRequested
                        console.log('Token error:', error.message)
                    }
                }
                return post
            })
        )
        : data

    const total = await Post.countDocuments(filter)
    console.log('filter result:', {total, dataLength: data.length})
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
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 16
    if (!sort) sort = {created_at: -1}
    console.log({sort, current, limit, q, filter})

    const data = await Post.find(filter)
        .populate('user_id', '_id name avatar status isGoogle')
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)

    const total = await Post.countDocuments(filter)
    return {total, current, limit, data}
}

export const details = async (id, req) => {
    const post = await Post.findOne({_id: id}).populate('user_id', '_id name avatar status isGoogle')
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
        ...post,
        isRequested: !!request,
    }
}

export const filterPtit = async (qs, limit, current, req) => {
    let {filter} = aqp(qs)
    const {statusPotsId} = filter
    delete filter.statusPotsId
    delete filter.current
    delete filter.pageSize
    filter.isDeleted = false
    filter.isApproved = true
    filter.isPtiterOnly = true // Chỉ lấy bài viết PTIT

    let {q} = filter
    delete filter.q
    if (q) {
        q = q ? {$regex: q, $options: 'i'} : null
        filter = {
            ...(q && {$or: [{title: q}, {description: q}]}),
        }
        filter.isDeleted = false
        filter.isPtiterOnly = true
    }

    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}

    const posts = await Post.find({
        ...filter,
    })
        .select(
            '-contact_phone -specificLocation -contact_social_media -approvalReason -createdAt -updatedAt -deletedAt'
        )
        .populate({
            path: 'category_id',
            select: '_id name',
        })
        .populate({
            path: 'user_id',
            select: '_id name avatar status isGoogle',
        })
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .lean()

    // Xử lý thêm thông tin isRequested
    const processedPosts = req.headers.authorization
        ? await Promise.all(
            posts.map(async (post) => {
                const token = getToken(req.headers)
                if (token) {
                    try {
                        const allowedToken = _.isUndefined(await tokenBlocklist.get(token))
                        if (allowedToken) {
                            const {user_id} = verifyToken(token, TOKEN_TYPE.AUTHORIZATION)

                            // Log để debug
                            console.log('Token user_id:', user_id)

                            const requestModel = post.type === 'gift' ? RequestsReceive : RequestsExchange
                            const request = await requestModel
                                .findOne({
                                    post_id: post._id,
                                    user_req_id: user_id,
                                })
                                .lean()

                            // Log để debug
                            console.log(`Post ${post._id}, request found:`, !!request)

                            return {
                                ...post,
                                isRequested: !!request,
                            }
                        }
                    } catch (error) {
                        console.log('Token error:', error.message)
                    }
                }
                return {
                    ...post,
                    isRequested: false,
                }
            })
        )
        : posts.map((post) => ({
            ...post,
            isRequested: false,
        }))

    const total = await Post.countDocuments({
        ...filter,
    })

    // // Log kết quả để debug
    // console.log('filterPtit result:', {
    //     total,
    //     dataLength: posts.length,
    //     processedPostsLength: processedPosts.length,
    //     hasRequestedPosts: processedPosts.some(p => p.isRequested)
    // })

    return {
        total,
        current,
        limit,
        data: processedPosts,
    }
}

export const getPostDetail = async (postId, userId) => {
    const post = await Post.findById(postId)
        .select(
            '-contact_phone -specificLocation -contact_social_media -approvalReason -createdAt -updatedAt -deletedAt'
        )
        .populate({
            path: 'category_id',
            select: '_id name',
        })
        .populate({
            path: 'user_id',
            select: '_id name avatar status isGoogle',
        })
        .lean()

    if (!post) {
        abort(404, 'Không tìm thấy bài viết')
    }

    // Kiểm tra quyền truy cập nếu là bài viết PTIT
    if (post.isPtiterOnly) {
        const user = await User.findById(userId)
        if (!user.isPtiter) {
            abort(
                403,
                'Sản phẩm này chỉ dành cho sinh viên PTIT. Vui lòng xác thực tài khoản trong phần tài khoản.'
            )
        }
    }

    return post
}

// Update thêm chưa xong nma đang suy nghĩ
// const getAllRequestedPostsByUser = async (userId) => {
// Đã validate đầu vào cho userId
//     // 1. Lấy tất cả bài đăng của user
//     const userPosts = await Post.find({user_id: userId})
//     // 2. Lấy tất cả yêu cầu trao đổi/ trao tặng cho các bài đăng này
//     // const requests = await RequestsReceive.find({post_id: {$in: userPosts.map(post => post._id)}})
//     const requests = await RequestsExchange.find({post_id: {$in: userPosts.map(post => post._id)}})
//     // 3. Trả về danh sách bài đăng và yêu cầu
//     return {
//         posts: userPosts,
//         requests: requests
//     }
// }

export const getPostBySlug = async (slug, userId) => {
    const post = await Post.findOne({slug, isDeleted: false})
        .select(
            '-contact_phone -specificLocation -contact_social_media -approvalReason -createdAt -updatedAt -deletedAt'
        )
        .populate({
            path: 'category_id',
            select: '_id name',
        })
        .populate({
            path: 'user_id',
            select: '_id name avatar status isGoogle',
        })
        .lean()

    if (!post) {
        abort(404, 'Không tìm thấy bài viết')
    }

    // Bỏ kiểm tra quyền truy cập cho bài viết PTIT
    // Cho phép tất cả người dùng xem được bài viết PTIT

    // Thêm trường isRequested nếu người dùng đã đăng nhập
    if (userId) {
        // Chọn model phù hợp dựa trên loại bài đăng
        const requestModel = post.type === 'gift' ? RequestsReceive : RequestsExchange

        // Tìm yêu cầu của người dùng hiện tại
        const request = await requestModel.findOne({
            post_id: post._id,
            user_req_id: userId,
        })

        // Thêm trường isRequested vào kết quả
        return {
            ...post,
            isRequested: !!request,
        }
    }

    // Nếu không có userId, mặc định isRequested = false
    return {
        ...post,
        isRequested: false,
    }
}

// api dùng 1 lần để thêm slug cho các bài viết cũ.
export const generateSlugsForExistingPosts = async () => {
    try {
        // Tìm tất cả bài viết chưa có slug hoặc slug rỗng
        const posts = await Post.find({
            $or: [{slug: {$exists: false}}, {slug: null}, {slug: ''}],
        })

        if (!posts.length) {
            return {message: 'Không có bài viết nào cần cập nhật slug', count: 0}
        }

        let updatedCount = 0

        // Cập nhật slug cho từng bài viết
        for (const post of posts) {
            // Tạo slug từ title
            const baseSlug = slugify(post.title, {
                lower: true,
                strict: true,
                locale: 'vi',
            })

            let finalSlug = baseSlug
            let counter = 1

            // Kiểm tra slug tồn tại
            while (
                await Post.findOne({
                    slug: finalSlug,
                    _id: {$ne: post._id},
                })
            ) {
                finalSlug = `${baseSlug}-${counter}`
                counter++
            }

            // Cập nhật slug
            await Post.findByIdAndUpdate(post._id, {slug: finalSlug})
            updatedCount++
        }

        return {
            message: 'Đã cập nhật slug cho các bài viết thành công',
            count: updatedCount,
        }
    } catch (error) {
        abort(500, 'Có lỗi khi cập nhật slug: ' + error.message)
    }
}
