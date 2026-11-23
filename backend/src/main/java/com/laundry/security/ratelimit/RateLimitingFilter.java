package com.laundry.security.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.laundry.dto.response.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final ObjectMapper objectMapper;

    // Giới hạn: 10 yêu cầu / 60 giây đối với login và register
    private static final int MAX_AUTH_REQUESTS = 10;
    private static final long AUTH_WINDOW_MS = 60 * 1000L;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method) && 
            (path.endsWith("/api/v1/auth/login") || 
             path.endsWith("/api/v1/auth/register") ||
             path.endsWith("/api/v1/auth/google") ||
             path.endsWith("/api/v1/auth/refresh-token") ||
             path.endsWith("/api/v1/auth/forgot-password") ||
             path.endsWith("/api/v1/auth/reset-password"))) {

            String clientIp = getClientIp(request);
            String rateLimitKey = clientIp + ":" + path;

            boolean allowed = rateLimiterService.isAllowed(rateLimitKey, MAX_AUTH_REQUESTS, AUTH_WINDOW_MS);

            if (!allowed) {
                log.warn("Rate limit exceeded for IP: {} on path: {}", clientIp, path);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                response.setHeader("Retry-After", "60");

                ApiResponse<Void> apiResponse = ApiResponse.error("Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.");
                response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        // Không tự đọc X-Forwarded-For để tránh IP spoofing;
        // Spring Boot với server.forward-headers-strategy=framework sẽ xử lý remoteAddr từ reverse proxy đáng tin cậy.
        return request.getRemoteAddr();
    }
}
