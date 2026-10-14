import mongoose from "mongoose";

// Request counters for express-rate-limit. Kept in MongoDB so they survive restarts and
// are shared between instances (in-memory counters would reset and diverge).
const rateLimitSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  hits: {
    type: Number,
    required: true,
    default: 0,
  },
  resetAt: {
    type: Date,
    required: true,
    // TTL index: MongoDB deletes the counter once its window has ended
    expires: 0,
  },
});

const RateLimit = mongoose.model("Rate_Limit", rateLimitSchema);

export default RateLimit;
