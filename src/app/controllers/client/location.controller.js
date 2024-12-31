// eslint-disable-next-line import/no-unresolved
import * as locationService from '../../services/client/location.service'

export async function readRoot(req, res) {
    const data = await locationService.read(req.body, req)
    res.jsonify(data)
}
