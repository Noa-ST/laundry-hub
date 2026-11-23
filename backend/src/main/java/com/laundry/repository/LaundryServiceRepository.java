package com.laundry.repository;

import com.laundry.entity.LaundryService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LaundryServiceRepository extends JpaRepository<LaundryService, Long> {
    List<LaundryService> findByShopIdIn(List<Long> shopIds);
    List<LaundryService> findByShopIdInAndIsActiveTrue(List<Long> shopIds);
    List<LaundryService> findByShopId(Long shopId);
    List<LaundryService> findByShopIdAndIsActiveTrue(Long shopId);
}