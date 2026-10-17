package com.laundry.service;

import com.laundry.dto.request.ReviewRequestDTO;
import com.laundry.dto.response.ReviewResponseDTO;
import com.laundry.entity.Order;
import com.laundry.entity.Review;
import com.laundry.entity.Shop;
import com.laundry.entity.User;
import com.laundry.enums.OrderStatus;
import com.laundry.exception.ResourceNotFoundException;
import com.laundry.repository.OrderRepository;
import com.laundry.repository.ReviewRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
@RequiredArgsConstructor
public class ReviewService {
    
    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReviewResponseDTO createReview(Long customerId, Long shopId, ReviewRequestDTO request) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found"));
                
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
                
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customerId)) {
            throw new IllegalArgumentException("Không thể đánh giá đơn hàng của người khác");
        }
        if (!order.getShop().getId().equals(shopId)) {
            throw new IllegalArgumentException("Đơn hàng không thuộc về tiệm này");
        }
        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new IllegalArgumentException("Chỉ được đánh giá đơn hàng đã hoàn thành");
        }
        if (reviewRepository.existsByOrderId(order.getId())) {
            throw new IllegalArgumentException("Đơn hàng này đã được đánh giá rồi");
        }

        Review review = Review.builder()
                .customer(customer)
                .shop(shop)
                .order(order)
                .rating(request.getRating())
                .comment(request.getComment())
                .imageUrls(request.getImageUrls() != null ? request.getImageUrls() : new java.util.ArrayList<>())
                .build();
                
        review = reviewRepository.save(review);
        
        // Update Shop's rating and review count
        long reviewCount = reviewRepository.countByShopId(shopId);
        Double avgRating = reviewRepository.getAverageRatingByShopId(shopId);
        if (avgRating != null) {
            // Round to 1 decimal place
            avgRating = Math.round(avgRating * 10.0) / 10.0;
        } else {
            avgRating = 0.0;
        }
        shop.setReviewCount((int) reviewCount);
        shop.setRating(avgRating);
        shopRepository.save(shop);
        
        return mapToDTO(review);
    }
    
    @Transactional(readOnly = true)
    public Page<ReviewResponseDTO> getShopReviews(Long shopId, Pageable pageable) {
        return reviewRepository.findByShopIdOrderByCreatedAtDesc(shopId, pageable)
                .map(this::mapToDTO);
    }
    
    private ReviewResponseDTO mapToDTO(Review review) {
        return ReviewResponseDTO.builder()
                .id(review.getId())
                .customerName(review.getCustomer().getFullName())
                .rating(review.getRating())
                .comment(review.getComment())
                .imageUrls(review.getImageUrls())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
