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
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;

@Service
public class CloudinaryService {

    private static final Logger logger = LoggerFactory.getLogger(CloudinaryService.class);

    private final Cloudinary cloudinary;

    public CloudinaryService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}") String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {
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
    private void appendLog(String message) {
        try {
            String logMsg = LocalDateTime.now() + " - " + message + "\n";
            Files.write(Paths.get("cloudinary-log.txt"), logMsg.getBytes(), StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            logger.info(message);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Async
    public void deleteImageAsync(String url) {
        String publicId = extractPublicId(url);
        appendLog("URL to delete: " + url + " -> Extracted publicId: " + publicId);
        if (publicId != null) {
            try {
                appendLog("Attempting to delete Cloudinary image: " + publicId);
                Map result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                appendLog("Cloudinary delete result for " + publicId + ": " + result.get("result"));
            } catch (Exception e) {
                appendLog("Failed to delete Cloudinary image: " + publicId + " - Error: " + e.getMessage());
                logger.error("Failed to delete Cloudinary image: {}", publicId, e);
            }
        } else {
            appendLog("Could not extract publicId for url: " + url);
        }
    }
}
