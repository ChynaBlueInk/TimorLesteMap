// next.config.js
const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const BUCKET = process.env.S3_BUCKET || 'timorleste-map-uploads';
const bucketHost = `${BUCKET}.s3.${REGION}.amazonaws.com`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: bucketHost },
    ],
  },
};

module.exports = nextConfig;
