package com.laundry.security.ratelimit;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    private final Map<String, List<Long>> requestCounts = new ConcurrentHashMap<>();

    /**
     * Kiểm tra xem yêu cầu từ key có vượt quá giới hạn hay không.
     * @param key Khóa định danh (ví dụ: clientIp + ":" + endpoint)
     * @param maxRequests Số yêu cầu tối đa cho phép trong cửa sổ thời gian
     * @param windowMs Cửa sổ thời gian tính bằng milliseconds
     * @return true nếu yêu cầu được phép, false nếu vượt quá giới hạn
     */
    public boolean isAllowed(String key, int maxRequests, long windowMs) {
        long now = System.currentTimeMillis();
        List<Long> timestamps = requestCounts.computeIfAbsent(key, k -> new ArrayList<>());

        synchronized (timestamps) {
            long windowStart = now - windowMs;
            timestamps.removeIf(timestamp -> timestamp < windowStart);

            if (timestamps.size() < maxRequests) {
                timestamps.add(now);
                return true;
            }
            return false;
        }
    }

    /**
     * Dọn dẹp các mục đã hết hạn định kỳ để giải phóng bộ nhớ.
     */
    @Scheduled(fixedRate = 300000)
    public void cleanup() {
        long now = System.currentTimeMillis();
        Iterator<Map.Entry<String, List<Long>>> it = requestCounts.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, List<Long>> entry = it.next();
            List<Long> timestamps = entry.getValue();
            synchronized (timestamps) {
                timestamps.removeIf(timestamp -> (now - timestamp) > 3600000); // 1 hour
                if (timestamps.isEmpty()) {
                    it.remove();
                }
            }
        }
    }
}
