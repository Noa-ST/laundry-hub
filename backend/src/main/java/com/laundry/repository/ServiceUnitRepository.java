package com.laundry.repository;

import com.laundry.entity.ServiceUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceUnitRepository extends JpaRepository<ServiceUnit, Long> {
    List<ServiceUnit> findByShopId(Long shopId);
    Optional<ServiceUnit> findByShopIdAndNameIgnoreCase(Long shopId, String name);
}
