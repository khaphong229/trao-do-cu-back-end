import {CronJob} from 'cron'
import {db, logger} from '@/configs'
import {normalizeError} from '@/utils/helpers'
import { cleanupUploads } from './cleanup-uploads.task'

// Thêm vào danh sách các task chạy hàng ngày
async function runEveryDayTasks() {
    try {
        console.log('Running daily tasks...')
        
        // Các task khác...
        
        // Cleanup uploads
        await cleanupUploads()
        
        console.log('Daily tasks completed.')
    } catch (error) {
        console.error('Error running daily tasks:', error)
    }
}

const runEveryDay = CronJob.from({
    // run crone job every day 12 AM
    cronTime: '0 0 0 * * *',
    onTick: async function (onComplete) {
        try {
            // Code here
            // console.log('You will see this message every day 12 AM.')
            
            // Chạy tất cả các task hàng ngày
            await runEveryDayTasks()

            // execute the onComplete when finished
            if (onComplete) await onComplete()
        } catch (error) {
            logger.error({
                message: 'Error running run-every-day task',
                detail: normalizeError(error),
            })
        }
    },
})

export default runEveryDay
export { runEveryDayTasks }

// Run this code if the file is called directly
if (require.main === module) {
    db.connect().then(function () {
        runEveryDay.onComplete = db.close
        runEveryDay.fireOnTick()
    })
}
