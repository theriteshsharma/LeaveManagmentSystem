var mongoose = require('mongoose');

const CalendarSchema = new mongoose.Schema({
    org_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Organization",
        default:null
    },
    holidays:[{
        startingdate:{
            type:Date
        },
        endingdate:{
            type:Date
        },
        reason:{
            type:String
        },
    }]
})
module.exports = mongoose.model('Calendar', CalendarSchema);