import {isValidObjectId} from 'mongoose'
import {abort} from '@/utils/helpers'
import RequestsExchange from '@/models/client/requests_exchange'

export async function checkId(req, res, next) {
    if (isValidObjectId(req.params.id)) {
        const user = await RequestsExchange.findOne({_id: req.params.id})
        if (user) {
            req.user = user
            next()
            return
        }
    }
    abort(404, 'Không tồn tại vật phẩm này.')
}
