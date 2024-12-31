import Post from '@/models/client/post'
import RequestsExchange from '@/models/client/requests_exchange'
import {abort} from '@/utils/helpers'
import aqp from 'api-query-params'

export async function create(requestBody) {
    const {
        post_id,
        user_req_id,
        title,
        description,
        contact_social_media,
        image_url,
        contact_phone,
        contact_address,
    } = requestBody
    // Kiểm tra bài post tồn tại và đúng trạng thái
    const postIsValid = await Post.findOne({_id: requestBody.post_id, type: 'exchange'})
    if (!postIsValid) {
        return abort(404, 'Bài post không tồn tại hoặc đây là bài cho nhận.')
    }
    // Kiểm tra xem người dùng đã gửi yêu cầu cho bài post này chưa
    const existingRequest = await RequestsExchange.findOne({
        post_id,
        user_req_id,
    })
    // Kiểm tra xem người yêu cầu có trùng với người đăng bài hay không
    if (postIsValid.user_id.toString() === user_req_id.toString()) {
        return abort(400, 'Bạn không thể gửi yêu cầu cho chính bài post của mình.')
    }

    if (existingRequest) {
        return abort(400, 'Bạn đã gửi yêu cầu cho bài post này')
    }

    // Tạo yêu cầu trao đổi mới
    const newExchangeRequest = new RequestsExchange({
        post_id,
        user_req_id,
        title,
        description,
        image_url,
        contact_phone,
        contact_social_media,
        contact_address,
        status: 'pending',
        requestAt: new Date(),
    })

    // Lưu yêu cầu
    await newExchangeRequest.save()

    return newExchangeRequest
}

export const filter = async (qs, limit, current, req) => {
    // check nếu là mình thì bỏ <thiếu>
    const userId = req.currentUser._id
    // Tìm các bài post của user của người dăng
    const userPosts = await Post.find({
        user_id: userId,
        type: 'exchange',
    })
    // console.log('userPosts : ', userPosts)

    let {filter} = aqp(qs)
    delete filter.current
    delete filter.pageSize
    let {q} = filter
    delete filter.q
    if (q) {
        q = q ? {$regex: q, $options: 'i'} : null
        filter = {
            ...(q && {$or: [{title: q}, {description: q}]}),
        }
    }
    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}
    // console.log({sort, current, limit, q, filter})
    // console.log(userPosts.map((post) => post._id))
    // => tạo ra mảng mới chỉ lưu id thôi.
    // Lấy các yêu cầu nhận liên quan đến các bài post đó
    const receiveRequests = await RequestsExchange.find({
        post_id: {$in: userPosts.map((post) => post._id)},
        ...filter,
    })
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .populate('post_id')
        .populate('user_req_id')
    // console.log('receiveRequests : ', receiveRequests)

    const total = await RequestsExchange.countDocuments(filter)
    return {total, current, limit, receiveRequests}
}

export const filterMe = async (qs, limit, current, req) => {
    const userId = req.currentUser._id

    // Basic query parameter handling
    let {filter} = aqp(qs)
    delete filter.current
    delete filter.pageSize
    let {q} = filter
    delete filter.q

    // Handle search query
    if (q) {
        q = q ? {$regex: q, $options: 'i'} : null
        filter = {
            ...(q && {$or: [{contact_phone: q}, {contact_address: q}, {contact_social_media: q}]}),
        }
    }

    // Handle sorting and pagination
    let {sort} = aqp(qs)
    if (isNaN(current) || current <= 0 || !Number.isInteger(current)) current = 1
    if (isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) limit = 5
    if (!sort) sort = {created_at: -1}

    // Find requests where the user is the requester
    const requests = await RequestsExchange.find({
        user_req_id: userId, // User is the requester
        ...filter,
    })
        .skip((current - 1) * limit)
        .limit(limit)
        .sort(sort)
        .populate('post_id') // Populate post details
        .populate('user_req_id') // Populate post owner details

    const total = await RequestsExchange.countDocuments({
        user_req_id: userId,
        ...filter,
    })

    return {
        total,
        current,
        limit,
        requests,
    }
}

export const updateStatus = async (req) => {
    // Trước khi phê duyệt nên đối status của bài Post
    const {_id, status} = req.body

    const postOld = await RequestsExchange.findOne({_id: _id}).lean()
    if (!postOld) {
        return abort(400, 'Không tìm thấy bài viết này')
    } else {
        await Post.updateMany({_id: postOld.post_id._id}, {status: 'inactive'})
    }

    if (!_id) {
        return abort(400, 'ID không được để trống')
    }
    if (!status) {
        return abort(400, 'Status không được để trống')
    }

    const request = await RequestsExchange.updateOne({_id: _id}, {status: status})

    if (!request) {
        return abort(400, 'Không tìm thấy document')
    }

    return request
}

// Xóa bản ghi
export const remove = async (_id) => {
    if (!_id) {
        return abort(400, 'ID không được để trống')
    }

    const request = await RequestsExchange.findByIdAndDelete(_id)

    if (!request) {
        return abort(400, 'Không tìm thấy document')
    }

    return request
}
