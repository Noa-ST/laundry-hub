package com.laundry.mockuser.controller;

import com.laundry.dto.response.ApiResponse;
import com.laundry.mockuser.dto.MockUserResponseDTO;
import com.laundry.mockuser.service.MockUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mock-users")
@RequiredArgsConstructor
public class MockUserController {

    private final MockUserService mockUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MockUserResponseDTO>>> getMockUsers() {
        List<MockUserResponseDTO> users = mockUserService.getAllMockUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }
}
