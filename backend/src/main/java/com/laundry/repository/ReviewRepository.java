package com.laundry.repository;

import com.laundry.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByShopIdOrderByCreatedAtDesc(Long shopId);
    org.springframework.data.domain.Page<Review> findByShopIdOrderByCreatedAtDesc(Long shopId, org.springframework.data.domain.Pageable pageable);
    
    boolean existsByOrderId(Long orderId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.shop.id = :shopId")
    Double getAverageRatingByShopId(@Param("shopId") Long shopId);

    long countByShopId(Long shopId);
}
