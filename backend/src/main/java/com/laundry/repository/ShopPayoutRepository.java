package com.laundry.repository;

import com.laundry.entity.ShopPayout;
import com.laundry.enums.PayoutStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShopPayoutRepository extends JpaRepository<ShopPayout, Long> {

    List<ShopPayout> findByShopIdOrderByCreatedAtDesc(Long shopId);

    @Query("SELECT p FROM ShopPayout p WHERE p.shop.owner.id = :ownerId ORDER BY p.createdAt DESC")
    List<ShopPayout> findByShopOwnerIdOrderByCreatedAtDesc(@Param("ownerId") Long ownerId);

    Page<ShopPayout> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<ShopPayout> findByStatusOrderByCreatedAtDesc(PayoutStatus status, Pageable pageable);

    @Query("SELECT p FROM ShopPayout p WHERE (:status IS NULL OR p.status = :status) AND (:shopId IS NULL OR p.shop.id = :shopId) ORDER BY p.createdAt DESC")
    List<ShopPayout> searchPayouts(@Param("status") PayoutStatus status, @Param("shopId") Long shopId);

    List<ShopPayout> findByStatus(PayoutStatus status);
}
