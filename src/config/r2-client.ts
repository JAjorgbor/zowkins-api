import config from "@/config/config.js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: config.r2.endpoint!,
  credentials: {
    accessKeyId: config.r2.accessKey!,
    secretAccessKey: config.r2.secretKey!,
  },
});

export default r2;
