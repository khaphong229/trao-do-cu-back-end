import assert from 'assert'
import _ from 'lodash'
import statuses from 'statuses'
import ejs from 'ejs'
import {
    logger,
    MAIL_FROM_ADDRESS,
    MAIL_FROM_NAME,
    mailTransporter,
    STATUS_DEFAULT_MESSAGE,
    VIEW_DIR,
} from '@/configs'
import path from 'path'
import {normalizeError} from '@/utils/helpers'

export function jsonify(data, message) {
    const status = this.statusCode || 200
    assert(status >= 200 && status <= 300, new TypeError(`Invalid response status: ${status}. Please use success status code!`))

    if (_.isString(data) && _.isUndefined(message)) {
        [message, data] = [data, message]
    }
    assert(_.isNil(message) || _.isString(message), new TypeError('"message" must be a string.'))

    const success = true
    if (!_.isString(message)) {
        message = STATUS_DEFAULT_MESSAGE[status] ?? statuses(status)
    }
    return this.json({status, success, message, data})
}

export function sendMail(to, subject, template, data, mailOptions) {
    //1. Render template email
    ejs.renderFile(path.join(VIEW_DIR, template + '.ejs') // Đường dẫn đến file template email
        , {...this.locals, ...data} // Dữ liệu truyền vào template
        , function (err, html) { // Callback function
            if (err) throw err
            mailTransporter.sendMail(
                {
                    ...mailOptions, // Các tùy chọn email 
                    from: {
                        address: MAIL_FROM_ADDRESS, // Email người gửi
                        name: MAIL_FROM_NAME, // Tên người gửi
                    },
                    to, // Email người nhận
                    subject, // Tiêu đề email
                    html, // Nội dung email
                },
                function (err) {
                    if (!err) return
                    const detail = normalizeError(err)
                    logger.error({
                        message: 'Error sending email to ' + to,
                        detail,
                    })
                }
            )
        })
}
