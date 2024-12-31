import Post from '@/models/client/post'
import aqp from 'api-query-params'

export async function create(requestBody, req) {
    const user_id = req.currentUser._id
    requestBody.user_id = user_id
    const data = new Post(requestBody)
    await data.save()
    return data
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
