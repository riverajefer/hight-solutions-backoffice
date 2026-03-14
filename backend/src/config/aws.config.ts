import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_DEFAULT_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT_URL,
  s3: {
    bucketName: process.env.AWS_S3_BUCKET_NAME,
    signedUrlExpiration: parseInt(
      process.env.AWS_S3_SIGNED_URL_EXPIRATION || '3600',
      10,
    ),
  },
}));
