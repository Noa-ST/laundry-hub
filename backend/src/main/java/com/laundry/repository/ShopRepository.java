package com.laundry.repository;

import com.laundry.entity.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {
    List<Shop> findByIsActiveTrue();
    List<Shop> findByIsActiveTrueAndApprovalStatus(com.laundry.enums.ShopApprovalStatus approvalStatus);
    org.springframework.data.domain.Page<Shop> findByApprovalStatus(com.laundry.enums.ShopApprovalStatus approvalStatus, org.springframework.data.domain.Pageable pageable);
    long countByApprovalStatus(com.laundry.enums.ShopApprovalStatus approvalStatus);
    Optional<Shop> findFirstByOwnerId(Long ownerId);
    Optional<Shop> findByOwnerId(Long ownerId);
    boolean existsByOwnerId(Long ownerId);
}