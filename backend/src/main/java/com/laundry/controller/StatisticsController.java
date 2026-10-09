package com.laundry.controller;

import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.statistics.StatisticsResponseDTO;
import com.laundry.security.SecurityUtils;
import com.laundry.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner/statistics")
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;

    @GetMapping
    public ResponseEntity<ApiResponse<StatisticsResponseDTO>> getDashboardStatistics(
            @RequestParam(defaultValue = "7days") String period) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        StatisticsResponseDTO stats = statisticsService.getDashboardStatistics(ownerId, period);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
