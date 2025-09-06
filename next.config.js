// next.config.js
const REGION = process.env.AWS_REGION || \"ap-southeast-2\";
const BUCKET = process.env.S3_BUCKET || \"timorleste-map-uploads\";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // exact bucket (recommended)
      { protocol: \"https\", hostname: ${BUCKET}.s3..amazonaws.com },
      // optional: any bucket in this region (useful for previews)
      { protocol: \"https\", hostname: *.s3..amazonaws.com },
    ],
  },
};

module.exports = nextConfig;
