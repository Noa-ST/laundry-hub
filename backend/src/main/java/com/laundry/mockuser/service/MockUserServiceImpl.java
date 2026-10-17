package com.laundry.mockuser.service;

import com.laundry.entity.Role;
import com.laundry.mockuser.dto.MockUserResponseDTO;
import com.laundry.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MockUserServiceImpl implements MockUserService {

    private final UserRepository userRepository;

    @Override
    public List<MockUserResponseDTO> getAllMockUsers() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() != Role.ADMIN)
                .map(user -> new MockUserResponseDTO(
                        user.getId(),
                        user.getFullName(),
                        user.getPhone(),
                        user.getEmail(),
                        user.getRole().name(),
                        user.getAvatarUrl()
                ))
                .collect(Collectors.toList());
    }
}
