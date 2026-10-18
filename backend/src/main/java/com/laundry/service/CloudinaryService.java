package com.laundry.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CloudinaryService {

    private static final Logger logger = LoggerFactory.getLogger(CloudinaryService.class);

    private final Cloudinary cloudinary;

    public CloudinaryService(
            @Value("${cloudinary.cloud-name:}") String cloudName,
            @Value("${cloudinary.api-key:}") String apiKey,
            @Value("${cloudinary.api-secret:}") String apiSecret) {
        cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true));
    }

    /**
     * Extracts the public ID from a Cloudinary URL.
     * Works for URLs like: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
     */
    public String extractPublicId(String url) {
        if (url == null || !url.contains("cloudinary.com")) {
            return null;
        }
        try {
            // Pattern to match /upload/(v\d+/)?(folder/image).extension
            Pattern pattern = Pattern.compile("/upload/(?:v\\d+/)?([^.]+)\\.");
            Matcher matcher = pattern.matcher(url);
            if (matcher.find()) {
                return matcher.group(1);
            }
        } catch (Exception e) {
            logger.warn("Could not extract public ID from URL: {}", url);
        }
        return null;
    }

    /**
     * Deletes an image from Cloudinary asynchronously.
     */
    @Async
    public void deleteImageAsync(String url) {
        String publicId = extractPublicId(url);
        logger.info("URL to delete: {} -> Extracted publicId: {}", url, publicId);
        if (publicId != null) {
            try {
                logger.info("Attempting to delete Cloudinary image: {}", publicId);
                Map result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                logger.info("Cloudinary delete result for {}: {}", publicId, result.get("result"));
            } catch (Exception e) {
                logger.error("Failed to delete Cloudinary image: {} - Error: {}", publicId, e.getMessage(), e);
            }
        } else {
            logger.warn("Could not extract publicId for url: {}", url);
        }
    }
}
