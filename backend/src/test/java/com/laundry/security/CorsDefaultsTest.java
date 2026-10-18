package com.laundry.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CorsDefaultsTest {

    @Test
    @DisplayName("Loại bỏ hoàn toàn các origin chứa ký tự wildcard *")
    void shouldStripWildcardOrigins() {
        List<String> origins = List.of(
                "https://laundry-hub-six.vercel.app",
                "https://*.vercel.app",
                "*",
                "http://localhost:5173",
                "https://evil-*.com"
        );

        List<String> sanitized = CorsDefaults.sanitize(origins);

        assertEquals(2, sanitized.size());
        assertTrue(sanitized.contains("https://laundry-hub-six.vercel.app"));
        assertTrue(sanitized.contains("http://localhost:5173"));
        assertFalse(sanitized.contains("https://*.vercel.app"));
        assertFalse(sanitized.contains("*"));
        assertFalse(sanitized.contains("https://evil-*.com"));
    }

    @Test
    @DisplayName("Xử lý an toàn khi danh sách rỗng hoặc null")
    void shouldHandleNullOrEmpty() {
        assertTrue(CorsDefaults.sanitize(null).isEmpty());
        assertTrue(CorsDefaults.sanitize(List.of()).isEmpty());
        assertTrue(CorsDefaults.sanitize(List.of("", "   ")).isEmpty());
    }
}
