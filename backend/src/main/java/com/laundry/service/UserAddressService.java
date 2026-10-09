package com.laundry.service;

import com.laundry.dto.request.UserAddressRequestDTO;
import com.laundry.dto.response.UserAddressResponseDTO;

import java.util.List;

public interface UserAddressService {
    List<UserAddressResponseDTO> getMyAddresses(Long userId);
    UserAddressResponseDTO addAddress(Long userId, UserAddressRequestDTO request);
    UserAddressResponseDTO updateAddress(Long userId, Long addressId, UserAddressRequestDTO request);
    void deleteAddress(Long userId, Long addressId);
    UserAddressResponseDTO setDefaultAddress(Long userId, Long addressId);
}
