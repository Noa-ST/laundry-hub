package com.laundry.mockuser.service;

import com.laundry.mockuser.dto.MockUserResponseDTO;
import java.util.List;

public interface MockUserService {
    List<MockUserResponseDTO> getAllMockUsers();
}
