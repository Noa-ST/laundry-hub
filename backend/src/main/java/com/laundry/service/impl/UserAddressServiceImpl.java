package com.laundry.service.impl;

import com.laundry.dto.request.UserAddressRequestDTO;
import com.laundry.dto.response.UserAddressResponseDTO;
import com.laundry.entity.User;
import com.laundry.entity.UserAddress;
import com.laundry.repository.UserAddressRepository;
import com.laundry.repository.UserRepository;
import com.laundry.service.UserAddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserAddressServiceImpl implements UserAddressService {

    private final UserAddressRepository addressRepository;
    private final UserRepository userRepository;

    @Override
    public List<UserAddressResponseDTO> getMyAddresses(Long userId) {
        List<UserAddress> addresses = addressRepository.findByUserIdOrderByIdDesc(userId);
        return addresses.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserAddressResponseDTO addAddress(Long userId, UserAddressRequestDTO request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getIsDefault() != null && request.getIsDefault()) {
            clearDefaultAddresses(userId);
        }

        List<UserAddress> existing = addressRepository.findByUserIdOrderByIdDesc(userId);
        boolean isFirst = existing.isEmpty();

        UserAddress address = UserAddress.builder()
                .user(user)
                .label(request.getLabel())
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .isDefault(isFirst || (request.getIsDefault() != null && request.getIsDefault()))
                .build();

        return mapToDTO(addressRepository.save(address));
    }

    @Override
    @Transactional
    public UserAddressResponseDTO updateAddress(Long userId, Long addressId, UserAddressRequestDTO request) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new RuntimeException("Address not found or doesn't belong to you"));

        if (request.getIsDefault() != null && request.getIsDefault()) {
            clearDefaultAddresses(userId);
        }

        address.setLabel(request.getLabel());
        address.setAddress(request.getAddress());
        address.setLatitude(request.getLatitude());
        address.setLongitude(request.getLongitude());
        if (request.getIsDefault() != null) {
            address.setIsDefault(request.getIsDefault());
        }

        return mapToDTO(addressRepository.save(address));
    }

    @Override
    @Transactional
    public void deleteAddress(Long userId, Long addressId) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new RuntimeException("Address not found or doesn't belong to you"));
        addressRepository.delete(address);
    }

    @Override
    @Transactional
    public UserAddressResponseDTO setDefaultAddress(Long userId, Long addressId) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new RuntimeException("Address not found or doesn't belong to you"));
        
        clearDefaultAddresses(userId);
        address.setIsDefault(true);
        return mapToDTO(addressRepository.save(address));
    }

    private void clearDefaultAddresses(Long userId) {
        List<UserAddress> addresses = addressRepository.findByUserIdOrderByIdDesc(userId);
        for (UserAddress addr : addresses) {
            if (addr.getIsDefault()) {
                addr.setIsDefault(false);
                addressRepository.save(addr);
            }
        }
    }

    private UserAddressResponseDTO mapToDTO(UserAddress entity) {
        return UserAddressResponseDTO.builder()
                .id(entity.getId())
                .label(entity.getLabel())
                .address(entity.getAddress())
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .isDefault(entity.getIsDefault())
                .build();
    }
}
