import RequestsExchange from '@/models/client/requests_exchange'
import mongoose from 'mongoose'
import {abort} from '@/utils/helpers'

export const checkId = async (req, res, next) => {
    try {
        const {id} = req.params
        if (!id) {
            return abort(400, 'ID không được để trống')
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return abort(400, 'ID không hợp lệ')
        }

        const requestExchange = await RequestsExchange.findById(id)
        if (!requestExchange) {
            return abort(404, 'Không tìm thấy yêu cầu trao đổi')
        }

        next()
    } catch (error) {
        next(error)
    }
} 