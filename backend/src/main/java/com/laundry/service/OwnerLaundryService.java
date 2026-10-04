package com.laundry.service;

import com.laundry.dto.request.CreateLaundryServiceRequestDTO;
import com.laundry.dto.request.UpdateLaundryServiceRequestDTO;
import com.laundry.dto.response.LaundryServiceResponseDTO;

import java.util.List;

public interface OwnerLaundryService {
    List<LaundryServiceResponseDTO> getMyServices(Long ownerId, Long categoryId);
    LaundryServiceResponseDTO createService(Long ownerId, CreateLaundryServiceRequestDTO request);
    LaundryServiceResponseDTO updateService(Long ownerId, Long serviceId, UpdateLaundryServiceRequestDTO request);
    void deleteService(Long ownerId, Long serviceId);
}