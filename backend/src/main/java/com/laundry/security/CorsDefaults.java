package com.laundry.security;

import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Objects;

/**
 * Cấu hình CORS dùng chung cho HTTP (SecurityConfig) và WebSocket (WebSocketConfig).
 * Chỉ chấp nhận origin khớp chính xác; mọi entry chứa wildcard đều bị loại bỏ.
 */
@Slf4j
public final class CorsDefaults {

    /** Giá trị mặc định khi không cấu hình APP_CORS_ALLOWED_ORIGINS. */
    public static final String ALLOWED_ORIGINS =
            "http://localhost:5173,http://127.0.0.1:5173,https://laundry-hub-six.vercel.app";

    private CorsDefaults() {
    }

    public static List<String> sanitize(List<String> origins) {
        if (origins == null) {
            return List.of();
        }
        return origins.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .filter(origin -> {
                    if (origin.contains("*")) {
                        log.warn("Bỏ qua CORS origin dạng wildcard (không an toàn): {}", origin);
                        return false;
                    }
                    return true;
                })
                .distinct()
                .toList();
    }
}
