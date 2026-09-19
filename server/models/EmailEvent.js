import mongoose from "mongoose";

const emailEventSchema = new mongoose.Schema({
    bookingId: {type: String, required: true},
    kind: {type: String, enum: ["confirmation", "reminder-24h", "reminder-2h"], default: "confirmation"},
    status: {type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending"},
    attempts: {type: Number, default: 0},
    lastError: {type: String},

}, {timestamps: true});

emailEventSchema.index({ bookingId: 1, kind: 1 }, { unique: true });

const EmailEvent = mongoose.model("EmailEvent", emailEventSchema);

export default EmailEvent;