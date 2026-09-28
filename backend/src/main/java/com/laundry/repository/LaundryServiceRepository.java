package com.laundry.repository;

import com.laundry.entity.LaundryService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LaundryServiceRepository extends JpaRepository<LaundryService, Long> {
    List<LaundryService> findByShopIdIn(List<Long> shopIds);
}
