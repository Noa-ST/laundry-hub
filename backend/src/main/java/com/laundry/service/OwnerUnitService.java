package com.laundry.service;

import com.laundry.dto.request.UnitRequestDTO;
import com.laundry.dto.response.UnitResponseDTO;

import java.util.List;

public interface OwnerUnitService {
    List<UnitResponseDTO> getUnits(Long ownerId);
    UnitResponseDTO createUnit(Long ownerId, UnitRequestDTO request);
    void deleteUnit(Long ownerId, Long id);
}
