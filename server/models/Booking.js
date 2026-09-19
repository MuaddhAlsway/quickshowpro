import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    user: {type:String, required:true, ref: "User"},
    show: {type:String, required:true, ref: "Show"},
    amount: {type:Number, required:true},
    currency: {type:String, default:"usd", required:false},
    bookedSeats: {type:Array, required:false},
    isPaid: {type:Boolean, default:false},
    paymentLink: {type:String},
    paymentStatus: {type:String, enum:["PENDING", "PAID", "EXPIRED", "CANCELLED"], default:"PENDING"},
    stripeSessionId: {type:String},
    stripeSessionExpiresAt: {type:Number},
    paidAt: {type:Date},

}, {timestamps: true});


const Booking = mongoose.model("Booking", bookingSchema)

export default Booking;