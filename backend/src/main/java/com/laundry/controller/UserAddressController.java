package com.laundry.controller;

import com.laundry.dto.request.UserAddressRequestDTO;
import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.UserAddressResponseDTO;
import com.laundry.security.CustomUserDetails;
import com.laundry.service.UserAddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/addresses")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserAddressController {

    private final UserAddressService addressService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserAddressResponseDTO>>> getMyAddresses(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.<List<UserAddressResponseDTO>>builder()
                .success(true)
                .data(addressService.getMyAddresses(userDetails.getId()))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserAddressResponseDTO>> addAddress(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody UserAddressRequestDTO request) {
        return ResponseEntity.ok(ApiResponse.<UserAddressResponseDTO>builder()
                .success(true)
                .message("Thêm địa chỉ thành công")
                .data(addressService.addAddress(userDetails.getId(), request))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserAddressResponseDTO>> updateAddress(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UserAddressRequestDTO request) {
        return ResponseEntity.ok(ApiResponse.<UserAddressResponseDTO>builder()
                .success(true)
                .message("Cập nhật địa chỉ thành công")
                .data(addressService.updateAddress(userDetails.getId(), id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteAddress(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        addressService.deleteAddress(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.<String>builder()
                .success(true)
                .message("Xóa địa chỉ thành công")
                .data("Deleted")
                .build());
    }

    @PatchMapping("/{id}/default")
    public ResponseEntity<ApiResponse<UserAddressResponseDTO>> setDefaultAddress(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<UserAddressResponseDTO>builder()
                .success(true)
                .message("Đã đặt làm địa chỉ mặc định")
                .data(addressService.setDefaultAddress(userDetails.getId(), id))
                .build());
    }
}
