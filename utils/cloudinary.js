const cloudinary = require("cloudinary").v2;

const isConfigured = Boolean(
  (process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET) ||
    process.env.CLOUDINARY_URL
);

if (isConfigured) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

/**
 * Checks if Cloudinary credentials are provided in the environment.
 */
const isCloudinaryConfigured = () => isConfigured;

/**
 * Upload an image (file path or base64 / data URI / remote URL) to Cloudinary.
 * @param {string} fileSource - Path, URL, or data URI
 * @param {object} options - Custom Cloudinary upload options
 * @returns {Promise<{ url: string, public_id: string, secure_url: string }>}
 */
const uploadImage = async (fileSource, options = {}) => {
  if (!isConfigured) {
    throw new Error(
      "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file."
    );
  }

  const defaultOptions = {
    folder: "shopkart/products",
    resource_type: "image",
    transformation: [
      { quality: "auto", fetch_format: "auto" },
    ],
  };

  const uploadResult = await cloudinary.uploader.upload(fileSource, {
    ...defaultOptions,
    ...options,
  });

  return {
    url: uploadResult.secure_url || uploadResult.url,
    secure_url: uploadResult.secure_url,
    public_id: uploadResult.public_id,
    format: uploadResult.format,
    width: uploadResult.width,
    height: uploadResult.height,
  };
};

/**
 * Generate an optimized Cloudinary delivery URL with transformations.
 * @param {string} publicIdOrUrl - Cloudinary publicId or full Cloudinary URL
 * @param {object} transforms - { width, height, crop, quality }
 */
const getOptimizedUrl = (publicIdOrUrl, transforms = {}) => {
  if (!publicIdOrUrl) return "";

  // If it's not configured or is a non-cloudinary URL (e.g. Unsplash), return as-is
  if (!isConfigured || (!publicIdOrUrl.includes("cloudinary.com") && publicIdOrUrl.startsWith("http"))) {
    return publicIdOrUrl;
  }

  try {
    return cloudinary.url(publicIdOrUrl, {
      secure: true,
      fetch_format: "auto",
      quality: "auto",
      ...transforms,
    });
  } catch {
    return publicIdOrUrl;
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadImage,
  getOptimizedUrl,
};
