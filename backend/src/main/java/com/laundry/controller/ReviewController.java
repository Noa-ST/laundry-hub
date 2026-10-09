package com.laundry.controller;

import com.laundry.dto.request.ReviewRequestDTO;
import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.ReviewResponseDTO;
import com.laundry.service.ReviewService;
import com.laundry.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/v1/shops/{shopId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponseDTO>> createReview(
            @PathVariable Long shopId,
            @Valid @RequestBody ReviewRequestDTO request) {
        Long customerId = SecurityUtils.getCurrentUserId();
        ReviewResponseDTO review = reviewService.createReview(customerId, shopId, request);
        return ResponseEntity.ok(ApiResponse.success("Đánh giá thành công", review));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ReviewResponseDTO>>> getShopReviews(
            @PathVariable Long shopId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ReviewResponseDTO> reviews = reviewService.getShopReviews(shopId, pageable);
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }
}
